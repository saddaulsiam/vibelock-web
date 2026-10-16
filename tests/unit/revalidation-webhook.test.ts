import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { POST } from "@/app/api/webhooks/core-inventory/route";
import { revalidateTag } from "next/cache";

const TEST_SECRET = "test-revalidation-secret-key-12345";

function buildSignedRequest({
  secret = TEST_SECRET,
  timestamp = Date.now(),
  body = JSON.stringify({
    id: "evt_12345",
    event: "inventory.updated",
    timestamp: Date.now(),
    data: { reason: "POS_SALE", tags: ["custom-tag-attempt"] },
  }),
  customHeader,
}: {
  secret?: string;
  timestamp?: number;
  body?: string;
  customHeader?: string;
} = {}) {
  const digest = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  const header = customHeader !== undefined ? customHeader : `t=${timestamp},v1=${digest}`;

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  if (header !== null) {
    headers.set("x-vibelock-signature", header);
  }

  return new NextRequest("http://localhost:3000/api/webhooks/core-inventory", {
    method: "POST",
    headers,
    body,
  });
}

describe("Core-to-Website Inventory Webhook Route Handler", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, REVALIDATION_WEBHOOK_SECRET: TEST_SECRET };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("successfully verifies valid signature, triggers revalidateTag('products', { expire: 0 }), and returns 200", async () => {
    const req = buildSignedRequest();
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ success: true, revalidated: ["products"] });
    expect(revalidateTag).toHaveBeenCalledTimes(1);
    expect(revalidateTag).toHaveBeenCalledWith("products", { expire: 0 });
  });

  it("successfully verifies valid signature when signature is generated against raw body directly", async () => {
    const timestamp = Date.now();
    const body = JSON.stringify({
      id: "evt_raw_123",
      event: "inventory.updated",
      timestamp,
      data: { reason: "INVENTORY_ADJUSTMENT" },
    });
    const digest = crypto.createHmac("sha256", TEST_SECRET).update(body).digest("hex");
    const req = buildSignedRequest({
      timestamp,
      body,
      customHeader: `t=${timestamp},v1=${digest}`,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith("products", { expire: 0 });
  });

  it("rejects invalid signature with 401", async () => {
    const wrongDigest = "a".repeat(64);
    const req = buildSignedRequest({ customHeader: `t=${Date.now()},v1=${wrongDigest}` });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Invalid signature");
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("rejects tampered body with 401", async () => {
    const timestamp = Date.now();
    const originalBody = JSON.stringify({
      id: "evt_original",
      event: "inventory.updated",
      timestamp,
    });
    const validDigestForOriginal = crypto
      .createHmac("sha256", TEST_SECRET)
      .update(`${timestamp}.${originalBody}`)
      .digest("hex");

    const tamperedBody = JSON.stringify({
      id: "evt_tampered",
      event: "inventory.updated",
      timestamp,
    });

    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    headers.set("x-vibelock-signature", `t=${timestamp},v1=${validDigestForOriginal}`);

    const req = new NextRequest("http://localhost:3000/api/webhooks/core-inventory", {
      method: "POST",
      headers,
      body: tamperedBody,
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("rejects timestamps older than 5 minutes with 400", async () => {
    const expiredTimestamp = Date.now() - (5 * 60 * 1000 + 5000); // 5 min 5 sec ago
    const req = buildSignedRequest({ timestamp: expiredTimestamp });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/tolerance/i);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("rejects timestamps in the future beyond 5 minutes with 400", async () => {
    const futureTimestamp = Date.now() + (5 * 60 * 1000 + 5000); // 5 min 5 sec in future
    const req = buildSignedRequest({ timestamp: futureTimestamp });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/tolerance/i);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("rejects missing signature header with 400", async () => {
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    const req = new NextRequest("http://localhost:3000/api/webhooks/core-inventory", {
      method: "POST",
      headers,
      body: JSON.stringify({ id: "1", event: "inventory.updated", timestamp: Date.now() }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("rejects malformed signature header formats", async () => {
    const testCases = [
      "invalid-signature-format",
      `v1=${"a".repeat(64)}`, // missing t
      `t=${Date.now()}`, // missing v1
      `t=notanumber,v1=${"a".repeat(64)}`,
      `t=${Date.now()},v1=${"a".repeat(62)}`, // 62 chars instead of 64
      `t=${Date.now()},v1=${"z".repeat(64)}`, // non-hex character 'z'
    ];

    for (const badHeader of testCases) {
      const req = buildSignedRequest({ customHeader: badHeader });
      const res = await POST(req);
      expect(res.status).toBe(400);
      expect(revalidateTag).not.toHaveBeenCalled();
    }
  });

  it("rejects malformed JSON payload with 400", async () => {
    const timestamp = Date.now();
    const badJson = "not-a-json-string{";
    const digest = crypto
      .createHmac("sha256", TEST_SECRET)
      .update(`${timestamp}.${badJson}`)
      .digest("hex");

    const req = buildSignedRequest({
      timestamp,
      body: badJson,
      customHeader: `t=${timestamp},v1=${digest}`,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("rejects payloads that do not conform to schema with 400", async () => {
    const invalidSchemas = [
      { id: "1", event: "user.updated", timestamp: Date.now() }, // wrong event
      { event: "inventory.updated", timestamp: Date.now() }, // missing id
      { id: "1", event: "inventory.updated" }, // missing timestamp
    ];

    for (const invalidPayload of invalidSchemas) {
      const timestamp = Date.now();
      const body = JSON.stringify(invalidPayload);
      const digest = crypto
        .createHmac("sha256", TEST_SECRET)
        .update(`${timestamp}.${body}`)
        .digest("hex");

      const req = buildSignedRequest({
        timestamp,
        body,
        customHeader: `t=${timestamp},v1=${digest}`,
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      expect(revalidateTag).not.toHaveBeenCalled();
    }
  });

  it("ensures request-supplied tags or paths cannot influence invalidation", async () => {
    const maliciousPayload = {
      id: "evt_malicious",
      event: "inventory.updated",
      timestamp: Date.now(),
      data: {
        tags: ["admin", "users", "secrets"],
        paths: ["/admin/passwords", "/finance"],
      },
    };

    const req = buildSignedRequest({
      body: JSON.stringify(maliciousPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // Only "products" must ever be revalidated
    expect(revalidateTag).toHaveBeenCalledTimes(1);
    expect(revalidateTag).toHaveBeenCalledWith("products", { expire: 0 });
    expect(revalidateTag).not.toHaveBeenCalledWith("admin", expect.anything());
    expect(revalidateTag).not.toHaveBeenCalledWith("users", expect.anything());
  });

  it("fails closed with 500 when server secret is missing", async () => {
    delete process.env.REVALIDATION_WEBHOOK_SECRET;

    const req = buildSignedRequest();
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Server configuration error");
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
