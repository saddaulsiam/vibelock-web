import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as chatPost, resetOrderFailuresStore, getSafeRecentMessages } from "@/app/api/chat/route";
import { resetRateLimitMemoryStore } from "@/lib/security/rate-limit";
import type { UIMessage } from "ai";

const mockFindFirstOrder = vi.fn();
const mockFindManyProduct = vi.fn();

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

interface ToolExecutionResult {
  items?: Array<{
    name: string;
    url: string;
    price: string;
    rawPrice: number;
    sizes: string[];
    inStock?: boolean;
    stockStatus?: string;
  }>;
  error?: string;
  orderNumber?: string;
  status?: string;
  channel?: string;
  phone?: string;
  link?: string;
}

let capturedTools: Record<
  string,
  { execute: (args: Record<string, unknown>) => Promise<ToolExecutionResult> }
> = {};

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    streamText: vi.fn().mockImplementation((config) => {
      capturedTools = config.tools;
      return {
        toUIMessageStreamResponse: () => new Response("ok", { status: 200 }),
      };
    }),
  };
});

vi.mock("@ai-sdk/google", () => ({
  google: vi.fn().mockReturnValue({}),
  createGoogleGenerativeAI: vi.fn().mockReturnValue(() => ({})),
}));

vi.mock("@/lib/prisma/client", () => ({
  default: {
    order: {
      findFirst: (...args: unknown[]) => mockFindFirstOrder(...args),
    },
    product: {
      findMany: (...args: unknown[]) => mockFindManyProduct(...args),
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

describe("Chat Route Tools & Enhancements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitMemoryStore();
    resetOrderFailuresStore();
  });

  async function triggerRoute() {
    const req = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "x-real-ip": "103.1.2.99", "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "test" }] }] }),
    });
    await chatPost(req);
  }

  describe("1. searchProducts tool (Hardened)", () => {
    it("searches published products and calculates real-time stock availability", async () => {
      await triggerRoute();
      expect(capturedTools.searchProducts).toBeDefined();

      mockFindManyProduct.mockResolvedValue([
        {
          name: "Heavyweight Graphic Tee",
          slug: "heavyweight-graphic-tee",
          variants: [
            {
              size: "M",
              color: "Black",
              sellingPrice: 1200,
              discountPrice: 990,
              inventoryTransactions: [{ quantity: 10 }],
              inventoryReservations: [{ quantity: 2 }],
            },
            {
              size: "L",
              color: "Black",
              sellingPrice: 1200,
              discountPrice: 990,
              inventoryTransactions: [{ quantity: 0 }],
              inventoryReservations: [],
            },
          ],
        },
      ]);

      const result = await capturedTools.searchProducts.execute({ query: "tee" });
      expect(result.items).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(result.items?.[0]).toEqual({
        name: "Heavyweight Graphic Tee",
        url: "/product/heavyweight-graphic-tee",
        price: "৳990",
        rawPrice: 990,
        sizes: ["M"], // Only size M is in stock (10 - 2 = 8 > 0)
        inStock: true,
        stockStatus: "স্টকে রয়েছে",
      });
    });
  });

  describe("2. getOrderStatus security & lockout defense", () => {
    it("rejects guest tracking without at least 4 phone digits", async () => {
      await triggerRoute();
      const result = await capturedTools.getOrderStatus.execute({ orderNumber: "VL-1001" });
      expect(result.error).toContain("ফোন নম্বরের শেষ ৪টি ডিজিট প্রয়োজন");
    });

    it("allows guest tracking when valid last 4 digits are supplied", async () => {
      await triggerRoute();

      mockFindFirstOrder.mockResolvedValue({
        orderNumber: "VL-1001",
        status: "PROCESSING",
        paymentStatus: "PAID",
        shippingMethodName: "Inside Dhaka Standard",
        createdAt: new Date("2026-11-20"),
        items: [{ productName: "Graphic Tee", quantity: 1, size: "L", color: "Black" }],
        shipment: null,
      });

      const result = await capturedTools.getOrderStatus.execute({
        orderNumber: "VL-1001",
        phoneLast4: "3277",
      });

      expect(result.orderNumber).toBe("VL-1001");
      expect(result.status).toBe("PROCESSING");
      expect(mockFindFirstOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            orderNumber: "VL-1001",
            customerPhone: { endsWith: "3277" },
          }),
        })
      );
    });

    it("locks out an order after 5 consecutive failed phone guesses to prevent brute force", async () => {
      await triggerRoute();

      // Return null (order not found) on each attempt
      mockFindFirstOrder.mockResolvedValue(null);

      // Attempt 1 to 4: returns normal failure message
      for (let i = 1; i <= 4; i++) {
        const res = await capturedTools.getOrderStatus.execute({
          orderNumber: "VL-ATTACK-001",
          phoneLast4: `000${i}`,
        });
        expect(res.error).toContain("কোনো অর্ডার পাওয়া যায়নি");
      }

      // 5th attempt: triggers the 15-minute brute-force lockout
      const res5 = await capturedTools.getOrderStatus.execute({
        orderNumber: "VL-ATTACK-001",
        phoneLast4: "0005",
      });
      expect(res5.error).toContain("১৫ মিনিটের জন্য স্থগিত করা হয়েছে");

      // 6th attempt: immediately blocked by lockout before querying database
      mockFindFirstOrder.mockClear();
      const res6 = await capturedTools.getOrderStatus.execute({
        orderNumber: "VL-ATTACK-001",
        phoneLast4: "0006",
      });
      expect(res6.error).toContain("নিরাপত্তাজনিত কারণে এই অর্ডারের তথ্য অনুসন্ধান সাময়িকভাবে স্থগিত রয়েছে");
      expect(mockFindFirstOrder).not.toHaveBeenCalled();
    });
  });

  describe("3. Safe Sliding Window helper", () => {
    it("ensures the sliced window starts with a user turn", () => {
      const messages = [
        { id: "1", role: "user", parts: [{ type: "text", text: "hi" }] },
        { id: "2", role: "assistant", parts: [{ type: "text", text: "hello" }] },
        { id: "3", role: "user", parts: [{ type: "text", text: "show products" }] },
        { id: "4", role: "assistant", parts: [{ type: "text", text: "here are products" }] },
        { id: "5", role: "assistant", parts: [{ type: "text", text: "extra note" }] },
        { id: "6", role: "user", parts: [{ type: "text", text: "thanks" }] },
      ] as UIMessage[];

      // Request 3 messages: if sliced blindly, would start at index 3 (assistant).
      // getSafeRecentMessages should start at index 5 (user).
      const safe = getSafeRecentMessages(messages, 3);
      expect(safe[0].role).toBe("user");
      expect(safe[0].id).toBe("6");
    });
  });

  describe("4. requestHumanSupport tool (Hardened)", () => {
    it("generates a WhatsApp support URL with prefilled topic and security tag", async () => {
      await triggerRoute();
      expect(capturedTools.requestHumanSupport).toBeDefined();

      const result = await capturedTools.requestHumanSupport.execute({ topic: "ডেলিভারি সমস্যা" });
      expect(result.channel).toBe("WhatsApp");
      expect(result.phone).toBe("01311-333277");
      expect(result.link).toContain("https://wa.me/8801311333277");
      expect(decodeURIComponent(result.link || "")).toContain("[ওয়েবসাইট চ্যাটবট ইনকোয়ারি]");
    });
  });
});
