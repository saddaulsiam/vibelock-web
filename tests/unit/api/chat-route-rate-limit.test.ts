import { POST as chatPost } from "@/app/api/chat/route";
import { resetRateLimitMemoryStore } from "@/lib/security/rate-limit";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

// Mock streamText and AI SDK
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    streamText: vi.fn().mockReturnValue({
      toUIMessageStreamResponse: () => new Response("ok", { status: 200 }),
    }),
  };
});

// Mock Google Provider
vi.mock("@ai-sdk/google", () => ({
  google: vi.fn().mockReturnValue({}),
  createGoogleGenerativeAI: vi.fn().mockReturnValue(() => ({})),
}));

// Mock Prisma
vi.mock("@/lib/prisma/client", () => ({
  default: {
    order: {
      findFirst: vi.fn(),
    },
    product: {
      findMany: vi.fn().mockResolvedValue([]),
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

describe("Chat Route Rate Limiting (15 req/min)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitMemoryStore();
  });

  it("enforces 15 req/min rate limit per client IP and returns 429 when exceeded", async () => {
    const clientIp = "103.1.2.60";

    for (let i = 0; i < 15; i++) {
      const req = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        headers: {
          "x-real-ip": clientIp,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "hello" }] }],
        }),
      });
      const res = await chatPost(req);
      expect(res.status).toBe(200);
    }

    // 16th request should be throttled
    const throttledReq = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "x-real-ip": clientIp,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ id: "2", role: "user", parts: [{ type: "text", text: "hello again" }] }],
      }),
    });
    const throttledRes = await chatPost(throttledReq);
    expect(throttledRes.status).toBe(429);
    const json = await throttledRes.json();
    expect(json.error).toContain("অনুরোধের সীমা অতিক্রম করেছে");
  });

  it("isolates rate limiting between distinct IPs (IP A exhausted, IP B allowed)", async () => {
    const ipA = "103.1.2.61";
    const ipB = "103.1.2.62";

    // Exhaust IP A
    for (let i = 0; i < 15; i++) {
      const req = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        headers: {
          "x-real-ip": ipA,
          "content-type": "application/json",
        },
        body: JSON.stringify({ messages: [] }),
      });
      const res = await chatPost(req);
      expect(res.status).toBe(200);
    }

    // 16th for IP A fails
    const reqA = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "x-real-ip": ipA,
        "content-type": "application/json",
      },
      body: JSON.stringify({ messages: [] }),
    });
    const resA = await chatPost(reqA);
    expect(resA.status).toBe(429);

    // IP B still succeeds
    const reqB = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "x-real-ip": ipB,
        "content-type": "application/json",
      },
      body: JSON.stringify({ messages: [] }),
    });
    const resB = await chatPost(reqB);
    expect(resB.status).toBe(200);
  });
});
