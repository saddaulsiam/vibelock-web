import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as searchGet } from "@/app/api/search/route";
import { resetRateLimitMemoryStore } from "@/lib/security/rate-limit";

const { mockFindManyProducts } = vi.hoisted(() => ({
  mockFindManyProducts: vi.fn(),
}));

vi.mock("@/lib/prisma/client", () => ({
  default: {
    product: {
      findMany: (...args: unknown[]) => mockFindManyProducts(...args),
    },
  },
}));

vi.mock("@/lib/config/env", () => ({
  env: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
    AUTH_SECRET: "mock-secret-for-testing-at-least-32-chars-long",
  },
}));

describe("Search Route Rate Limiting & IP Trust Boundary (SEC-12-01 / Phase 12.1 Fix B)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitMemoryStore();
    mockFindManyProducts.mockResolvedValue([]);
  });

  describe("1. Normal requests with valid trusted IP", () => {
    it("enforces 60 req/min rate limit per client IP and returns 429 when exceeded", async () => {
      const clientIp = "103.1.2.50";

      for (let i = 0; i < 60; i++) {
        const req = new NextRequest("http://localhost:3000/api/search?q=tee", {
          headers: { "x-real-ip": clientIp },
        });
        const res = await searchGet(req);
        expect(res.status).toBe(200);
      }

      const throttledReq = new NextRequest("http://localhost:3000/api/search?q=tee", {
        headers: { "x-real-ip": clientIp },
      });
      const throttledRes = await searchGet(throttledReq);
      expect(throttledRes.status).toBe(429);
      const json = await throttledRes.json();
      expect(json.error).toBe("Too many requests. Please slow down.");
    });

    it("isolates rate limiting between distinct IPs (IP A exhausted, IP B allowed)", async () => {
      const ipA = "103.1.2.51";
      const ipB = "103.1.2.52";

      for (let i = 0; i < 60; i++) {
        const req = new NextRequest("http://localhost:3000/api/search?q=tee", {
          headers: { "x-real-ip": ipA },
        });
        await searchGet(req);
      }

      // ipA is blocked
      const reqA = new NextRequest("http://localhost:3000/api/search?q=tee", {
        headers: { "x-real-ip": ipA },
      });
      const resA = await searchGet(reqA);
      expect(resA.status).toBe(429);

      // ipB is allowed
      const reqB = new NextRequest("http://localhost:3000/api/search?q=tee", {
        headers: { "x-real-ip": ipB },
      });
      const resB = await searchGet(reqB);
      expect(resB.status).toBe(200);
    });

    it("accepts valid IPv6 address in platform headers", async () => {
      const ipv6 = "2001:db8::8a2e";
      const req = new NextRequest("http://localhost:3000/api/search?q=tee", {
        headers: { "x-real-ip": ipv6 },
      });
      const res = await searchGet(req);
      expect(res.status).toBe(200);
    });
  });

  describe("2. Spoofed and ambiguous headers", () => {
    it("ignores untrusted cf-connecting-ip and true-client-ip headers", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const req = new NextRequest("http://localhost:3000/api/search?q=tee", {
        headers: {
          "cf-connecting-ip": "1.1.1.1",
          "true-client-ip": "2.2.2.2",
        },
      });
      const res = await searchGet(req);
      expect(res.status).toBe(200);

      // Missing trusted IP logged; fail-open for anonymous
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("RATE_LIMIT_MISSING_CLIENT_IP")
      );
      warnSpy.mockRestore();
    });

    it("rejects ambiguous comma-separated x-forwarded-for chains", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const req = new NextRequest("http://localhost:3000/api/search?q=tee", {
        headers: {
          "x-forwarded-for": "198.51.100.1, 203.0.113.195, 192.0.2.55",
        },
      });
      const res = await searchGet(req);
      expect(res.status).toBe(200);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("RATE_LIMIT_MISSING_CLIENT_IP")
      );
      warnSpy.mockRestore();
    });

    it("prefers single x-real-ip over single x-forwarded-for", async () => {
      const realIp = "10.0.0.1";
      const xffIp = "10.0.0.2";

      // 60 requests with realIp
      for (let i = 0; i < 60; i++) {
        const req = new NextRequest("http://localhost:3000/api/search?q=tee", {
          headers: {
            "x-real-ip": realIp,
            "x-forwarded-for": xffIp,
          },
        });
        await searchGet(req);
      }

      // 61st is blocked under realIp
      const reqThrottled = new NextRequest("http://localhost:3000/api/search?q=tee", {
        headers: {
          "x-real-ip": realIp,
          "x-forwarded-for": xffIp,
        },
      });
      const resThrottled = await searchGet(reqThrottled);
      expect(resThrottled.status).toBe(429);

      // xffIp alone is NOT blocked (proves x-real-ip was the key)
      const reqXffOnly = new NextRequest("http://localhost:3000/api/search?q=tee", {
        headers: { "x-forwarded-for": xffIp },
      });
      const resXffOnly = await searchGet(reqXffOnly);
      expect(resXffOnly.status).toBe(200);
    });
  });

  describe("3. Authenticated session fallback & User-Agent rotation defense", () => {
    it("keys rate limit by authenticated session token when IP is missing", async () => {
      const sessionTokenA = "session-token-user-a-1234567890";
      const sessionTokenB = "session-token-user-b-0987654321";

      for (let i = 0; i < 60; i++) {
        const req = new NextRequest("http://localhost:3000/api/search?q=tee", {
          headers: {
            cookie: `authjs.session-token=${sessionTokenA}`,
          },
        });
        const res = await searchGet(req);
        expect(res.status).toBe(200);
      }

      // Session A is throttled (429)
      const reqA = new NextRequest("http://localhost:3000/api/search?q=tee", {
        headers: {
          cookie: `authjs.session-token=${sessionTokenA}`,
        },
      });
      const resA = await searchGet(reqA);
      expect(resA.status).toBe(429);

      // Session B remains UNBLOCKED (isolation, no shared-bucket DoS)
      const reqB = new NextRequest("http://localhost:3000/api/search?q=tee", {
        headers: {
          cookie: `authjs.session-token=${sessionTokenB}`,
        },
      });
      const resB = await searchGet(reqB);
      expect(resB.status).toBe(200);
    });

    it("User-Agent rotation cannot bypass session-based rate limit", async () => {
      const sessionToken = "session-token-attacker-trying-ua-rotation";

      // Attacker sends 60 requests rotating the User-Agent header on every attempt
      for (let i = 0; i < 60; i++) {
        const req = new NextRequest("http://localhost:3000/api/search?q=tee", {
          headers: {
            cookie: `authjs.session-token=${sessionToken}`,
            "user-agent": `Rotating-Bot-Version-${i}`,
          },
        });
        const res = await searchGet(req);
        expect(res.status).toBe(200);
      }

      // 61st request with yet another brand-new User-Agent is still blocked (429)
      const reqBlocked = new NextRequest("http://localhost:3000/api/search?q=tee", {
        headers: {
          cookie: `authjs.session-token=${sessionToken}`,
          "user-agent": "Brand-New-User-Agent-Bypass-Attempt",
        },
      });
      const resBlocked = await searchGet(reqBlocked);
      expect(resBlocked.status).toBe(429);
    });

    it("exact-byte token hashing ensures case-sensitive session tokens remain distinct", async () => {
      // In Base64 session tokens, casing matters. Exhausting tokenUpper must not block tokenLower.
      const tokenUpper = "SessionTokenCaseUpperXYZ";
      const tokenLower = "sessiontokencaseupperxyz";

      for (let i = 0; i < 60; i++) {
        const req = new NextRequest("http://localhost:3000/api/search?q=tee", {
          headers: {
            cookie: `authjs.session-token=${tokenUpper}`,
          },
        });
        await searchGet(req);
      }

      // tokenUpper is blocked
      const reqUpper = new NextRequest("http://localhost:3000/api/search?q=tee", {
        headers: {
          cookie: `authjs.session-token=${tokenUpper}`,
        },
      });
      expect((await searchGet(reqUpper)).status).toBe(429);

      // tokenLower is unblocked (proves exact bytes, not lowercased)
      const reqLower = new NextRequest("http://localhost:3000/api/search?q=tee", {
        headers: {
          cookie: `authjs.session-token=${tokenLower}`,
        },
      });
      expect((await searchGet(reqLower)).status).toBe(200);
    });
  });

  describe("4. Guest cart-cookie fallback & User-Agent rotation defense", () => {
    it("keys rate limit by guest cart cookie when IP is missing", async () => {
      const cartIdA = "cart_uuid_user_111111";
      const cartIdB = "cart_uuid_user_222222";

      for (let i = 0; i < 60; i++) {
        const req = new NextRequest("http://localhost:3000/api/search?q=tee", {
          headers: {
            cookie: `vbl_cart_id=${cartIdA}`,
          },
        });
        await searchGet(req);
      }

      // Cart A is blocked
      const reqA = new NextRequest("http://localhost:3000/api/search?q=tee", {
        headers: {
          cookie: `vbl_cart_id=${cartIdA}`,
        },
      });
      const resA = await searchGet(reqA);
      expect(resA.status).toBe(429);

      // Cart B is unblocked (isolation)
      const reqB = new NextRequest("http://localhost:3000/api/search?q=tee", {
        headers: {
          cookie: `vbl_cart_id=${cartIdB}`,
        },
      });
      const resB = await searchGet(reqB);
      expect(resB.status).toBe(200);
    });

    it("User-Agent rotation cannot bypass guest cart rate limit", async () => {
      const cartId = "cart_uuid_testing_ua_bypass";

      for (let i = 0; i < 60; i++) {
        const req = new NextRequest("http://localhost:3000/api/search?q=tee", {
          headers: {
            cookie: `vbl_cart_id=${cartId}`,
            "user-agent": `Crawler-Agent-${i}`,
          },
        });
        await searchGet(req);
      }

      const reqBlocked = new NextRequest("http://localhost:3000/api/search?q=tee", {
        headers: {
          cookie: `vbl_cart_id=${cartId}`,
          "user-agent": "Different-Crawler-Agent-61",
        },
      });
      const resBlocked = await searchGet(reqBlocked);
      expect(resBlocked.status).toBe(429);
    });
  });

  describe("5. Anonymous requests with no IP & no cookies (Fail-Open policy)", () => {
    it("fails open safely without a shared anonymous bucket", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Anonymous requests with no IP and no cookies
      const req = new NextRequest("http://localhost:3000/api/search?q=hoodie");
      const res = await searchGet(req);
      expect(res.status).toBe(200);

      // Emits structured warning with policy: fail_open
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("RATE_LIMIT_MISSING_CLIENT_IP")
      );
      const warnPayload = warnSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(warnPayload);
      expect(parsed.policy).toBe("fail_open");
      expect(parsed.endpoint).toBe("search");

      warnSpy.mockRestore();
    });

    it("does not allow one anonymous visitor to block another (no shared-bucket DoS)", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});

      // Multiple anonymous requests with no IP and no cookies
      // In the old buggy implementation, request 61 would get 429 for everyone sharing "anonymous".
      // In the new fail-open implementation, neither visitor blocks the other.
      for (let i = 0; i < 70; i++) {
        const req = new NextRequest("http://localhost:3000/api/search?q=hoodie");
        const res = await searchGet(req);
        expect(res.status).toBe(200);
      }
    });
  });

  describe("6. Search Query Validation, Bounded Execution & Published-Only Filtering", () => {
    it("rejects search queries exceeding 100 characters with 400 Bad Request", async () => {
      const oversized = "a".repeat(101);
      const req = new NextRequest(`http://localhost:3000/api/search?q=${oversized}`);
      const res = await searchGet(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid search query. Maximum length is 100 characters.");
      expect(mockFindManyProducts).not.toHaveBeenCalled();
    });

    it("returns empty product list without database query when query string is empty or absent", async () => {
      const reqEmpty = new NextRequest("http://localhost:3000/api/search?q=");
      const resEmpty = await searchGet(reqEmpty);
      expect(resEmpty.status).toBe(200);
      expect(await resEmpty.json()).toEqual({ products: [] });
      expect(mockFindManyProducts).not.toHaveBeenCalled();

      const reqMissing = new NextRequest("http://localhost:3000/api/search");
      const resMissing = await searchGet(reqMissing);
      expect(resMissing.status).toBe(200);
      expect(await resMissing.json()).toEqual({ products: [] });
      expect(mockFindManyProducts).not.toHaveBeenCalled();
    });

    it("queries database strictly for published products and bounds results to 8 items", async () => {
      mockFindManyProducts.mockResolvedValueOnce([]);

      const req = new NextRequest("http://localhost:3000/api/search?q=jacket");
      const res = await searchGet(req);
      expect(res.status).toBe(200);

      expect(mockFindManyProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "PUBLISHED",
          }),
          take: 8,
          orderBy: { createdAt: "desc" },
        })
      );
    });
  });
});
