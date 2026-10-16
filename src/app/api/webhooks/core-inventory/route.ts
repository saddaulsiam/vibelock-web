import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { revalidateTag } from "next/cache";
import { z } from "zod";

const MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000; // 5 minutes

// Schema validation for incoming inventory event payload
const inventoryWebhookPayloadSchema = z.object({
  id: z.string().min(1),
  event: z.literal("inventory.updated"),
  timestamp: z.number(),
  data: z
    .object({
      reason: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  // 1. Secret availability check (fail closed if unconfigured)
  const secret = process.env.REVALIDATION_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[Inventory Webhook] Missing server secret: REVALIDATION_WEBHOOK_SECRET is not configured.");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  // 2. Read raw request text before parsing JSON
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
  }

  // 3. Signature header extraction & format validation
  const signatureHeader = req.headers.get("x-vibelock-signature");
  if (!signatureHeader) {
    return NextResponse.json({ error: "Missing signature header" }, { status: 400 });
  }

  // Format: t=<timestamp>,v1=<hexDigest>
  const match = /^t=(\d+),v1=([a-f\d]{64})$/i.exec(signatureHeader.trim());
  if (!match) {
    return NextResponse.json({ error: "Malformed signature header" }, { status: 400 });
  }

  const timestampStr = match[1];
  const suppliedDigestHex = match[2];
  const timestamp = parseInt(timestampStr, 10);

  if (Number.isNaN(timestamp)) {
    return NextResponse.json({ error: "Invalid signature timestamp" }, { status: 400 });
  }

  // 4. Timestamp tolerance enforcement (+/- 5 minutes)
  const now = Date.now();
  if (Math.abs(now - timestamp) > MAX_TIMESTAMP_DRIFT_MS) {
    return NextResponse.json({ error: "Signature timestamp expired or out of tolerance" }, { status: 400 });
  }

  // 5. HMAC verification using timing-safe comparison
  const expectedDigestWithTimestamp = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const expectedDigestRaw = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const suppliedBuf = Buffer.from(suppliedDigestHex, "hex");
  const expectedBufWithTimestamp = Buffer.from(expectedDigestWithTimestamp, "hex");
  const expectedBufRaw = Buffer.from(expectedDigestRaw, "hex");

  const matchesWithTimestamp =
    suppliedBuf.length === expectedBufWithTimestamp.length &&
    crypto.timingSafeEqual(suppliedBuf, expectedBufWithTimestamp);

  const matchesRaw =
    suppliedBuf.length === expectedBufRaw.length &&
    crypto.timingSafeEqual(suppliedBuf, expectedBufRaw);

  if (!matchesWithTimestamp && !matchesRaw) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 6. JSON parsing & payload schema validation
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
  }

  const parsed = inventoryWebhookPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload schema" }, { status: 400 });
  }

  // 7. Strictly hardcoded cache invalidation (request tags/paths are ignored)
  try {
    revalidateTag("products", { expire: 0 });
  } catch (err) {
    console.error("[Inventory Webhook] Error during cache revalidation:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Revalidation failed" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    revalidated: ["products"],
  });
}
