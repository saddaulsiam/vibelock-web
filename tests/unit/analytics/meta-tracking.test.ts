import { sendMetaCapiEvent } from "@/lib/analytics/meta-capi";
import {
  buildMetaUserData,
  hashSha256,
  normalizeCity,
  normalizeEmail,
  normalizeName,
  normalizePhone,
} from "@/lib/analytics/meta-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Meta Pixel & Conversions API (CAPI) Tracking", () => {
  describe("meta-utils normalization & hashing", () => {
    it("hashes non-empty string using SHA-256 hex format", () => {
      const hash = hashSha256("test@vibelock.bd");
      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash).toHaveLength(64); // SHA-256 produces 64 hex characters

      // Known SHA-256 for 'test@vibelock.bd'
      expect(hash).toBe("1cca183755817e737ca9baf27a66f53379e8fea524f8e9f70e1339195ff19d2f");

      // Returns null for empty or null
      expect(hashSha256(null)).toBeNull();
      expect(hashSha256("   ")).toBeNull();
    });

    it("normalizes emails to lowercase trimmed strings", () => {
      expect(normalizeEmail("  Customer@VibeLock.BD  ")).toBe("customer@vibelock.bd");
      expect(normalizeEmail("invalid-email-without-at")).toBeNull();
      expect(normalizeEmail(null)).toBeNull();
    });

    it("normalizes Bangladesh phone numbers to E.164 (8801XXXXXXXXX)", () => {
      // 11 digit local format (017XXXXXXXX)
      expect(normalizePhone("01711223344")).toBe("8801711223344");

      // Formatted with dashes, spaces, and plus
      expect(normalizePhone("+880 1711-223344")).toBe("8801711223344");

      // Leading double zeros (008801711223344)
      expect(normalizePhone("008801711223344")).toBe("8801711223344");

      // Invalid short phone
      expect(normalizePhone("1234")).toBeNull();
      expect(normalizePhone(null)).toBeNull();
    });

    it("normalizes names into first and last name", () => {
      expect(normalizeName("Saddaul Siam")).toEqual({
        firstName: "saddaul",
        lastName: "siam",
      });

      expect(normalizeName("SingleName")).toEqual({
        firstName: "singlename",
        lastName: null,
      });

      expect(normalizeName(null)).toEqual({
        firstName: null,
        lastName: null,
      });
    });

    it("normalizes cities according to Meta specifications", () => {
      expect(normalizeCity("  Dhaka  ")).toBe("dhaka");
      expect(normalizeCity("Chattogram-North")).toBe("chattogramnorth");
      expect(normalizeCity(null)).toBeNull();
    });

    it("builds compliant MetaUserData with hashed PII and unhashed contextual parameters", () => {
      const userData = buildMetaUserData({
        email: "customer@vibelock.bd",
        phone: "01711223344",
        name: "Saddaul Siam",
        city: "Dhaka",
        country: "BD",
        userId: "usr_123456",
        clientIp: "103.150.12.1, 192.168.1.1",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        fbp: "fb.1.1558531234.123456789",
        fbc: "fb.1.1558531234.AbCdEfGh",
      });

      // PII must be hashed arrays
      expect(userData.em).toHaveLength(1);
      expect(userData.em?.[0]).toBe(
        "f4e76c37e6cd2fa026baab3946455cbb896bd87028cd28072d8f85ad22cfaf9a"
      );
      expect(userData.ph).toHaveLength(1);
      expect(userData.fn).toHaveLength(1);
      expect(userData.ln).toHaveLength(1);
      expect(userData.ct).toHaveLength(1);
      expect(userData.country).toHaveLength(1);
      expect(userData.external_id).toHaveLength(1);

      // Contextual parameters MUST NOT be hashed per Meta guidelines
      expect(userData.client_ip_address).toBe("103.150.12.1");
      expect(userData.client_user_agent).toBe("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
      expect(userData.fbp).toBe("fb.1.1558531234.123456789");
      expect(userData.fbc).toBe("fb.1.1558531234.AbCdEfGh");
    });
  });

  describe("meta-pixel client queue stubbing", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
      // Setup mock window for node environment
      (global as unknown as { window: Record<string, unknown> }).window = {};
    });

    afterEach(() => {
      process.env = originalEnv;
      delete (global as unknown as { window?: unknown }).window;
      vi.restoreAllMocks();
    });

    it("queues events in window.fbq.queue when fbq is called before script download", async () => {
      process.env.NEXT_PUBLIC_META_PIXEL_ID = "1234567890";
      const { trackMetaPixelEvent } = await import("@/lib/analytics/meta-pixel");

      trackMetaPixelEvent(
        "ViewContent",
        {
          currency: "BDT",
          value: 1250,
          content_ids: ["prod_1"],
        },
        { eventID: "view_prod_1" }
      );

      const mockWindow = (global as unknown as { window: Window }).window;
      // Verify stub queue was created and populated
      expect(mockWindow.fbq).toBeDefined();
      expect(mockWindow.fbq?.queue).toBeDefined();
      expect(mockWindow.fbq?.queue?.length).toBe(1);

      const queued = mockWindow.fbq?.queue?.[0] as unknown[];
      expect(queued[0]).toBe("track");
      expect(queued[1]).toBe("ViewContent");
      expect(queued[2]).toEqual({
        currency: "BDT",
        value: 1250,
        content_ids: ["prod_1"],
      });
      expect(queued[3]).toEqual({ eventID: "view_prod_1" });
    });
  });

  describe("sendMetaCapiEvent", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
      vi.restoreAllMocks();
    });

    it("gracefully returns null if NEXT_PUBLIC_META_PIXEL_ID or access token is missing", async () => {
      delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
      delete process.env.META_CONVERSIONS_API_ACCESS_TOKEN;

      const result = await sendMetaCapiEvent({
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: "ORD-12345",
        event_source_url: "https://vibelock.bd/order-success/ORD-12345",
        action_source: "website",
        user_data: {},
      });

      expect(result).toBeNull();
    });

    it("sends payload to Meta Graph API when credentials are provided", async () => {
      process.env.NEXT_PUBLIC_META_PIXEL_ID = "1234567890";
      process.env.META_CONVERSIONS_API_ACCESS_TOKEN = "EAABtesttoken123";
      process.env.META_TEST_EVENT_CODE = "TEST99999";

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          events_received: 1,
          fbtrace_id: "test_trace_123",
        }),
      });
      global.fetch = mockFetch;

      const result = await sendMetaCapiEvent({
        event_name: "Purchase",
        event_time: 1718000000,
        event_id: "ORD-987654",
        event_source_url: "https://vibelock.bd/order-success/ORD-987654",
        action_source: "website",
        user_data: {
          em: ["hash123"],
        },
        custom_data: {
          currency: "BDT",
          value: 2450,
          order_id: "ORD-987654",
        },
      });

      expect(result).toEqual({
        events_received: 1,
        fbtrace_id: "test_trace_123",
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("https://graph.facebook.com/v21.0/1234567890/events");
      expect(options.method).toBe("POST");

      const body = JSON.parse(options.body as string);
      expect(body.test_event_code).toBe("TEST99999");
      expect(body.data[0].event_name).toBe("Purchase");
      expect(body.data[0].event_id).toBe("ORD-987654");
      expect(body.data[0].custom_data.value).toBe(2450);
      expect(body.data[0].action_source).toBe("website");
      expect(body.data[0].data_processing_options).toEqual([]);
    });
  });
});
