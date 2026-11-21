import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/lib/payment/service";
import { readBoundedBodyText, MAX_REQUEST_PAYLOAD_BYTES } from "@/lib/security/request-boundary";

const MAX_IPN_PAYLOAD_BYTES = MAX_REQUEST_PAYLOAD_BYTES; // 64 KB

export async function POST(req: NextRequest) {
  try {
    const bounded = await readBoundedBodyText(req, MAX_IPN_PAYLOAD_BYTES);
    if (bounded.tooLarge) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const text = bounded.text;
    if (!text.trim()) {
      return NextResponse.json({ error: "Empty request payload" }, { status: 400 });
    }

    let payload: Record<string, unknown> = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(text);
      for (const [key, value] of params.entries()) {
        payload[key] = value;
      }
    } else {
      try {
        payload = JSON.parse(text);
      } catch {
        return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
      }
    }

    // IPN payload is unauthenticated. Every field is treated as untrusted.
    // PaymentService.verifyCallback delegates to PaystationProvider.verifyPayment,
    // which calls PayStation POST /transaction-status to authoritatively verify payment.
    const paymentService = new PaymentService();
    const result = await paymentService.verifyCallback("PAYSTATION", payload);

    if (result.verification.isUnverified) {
      const { logSecurityAlert } = await import("@/lib/monitoring/security-logger");
      logSecurityAlert("PAYMENT_TAMPERING_DETECTED", {
        endpoint: "paystation/ipn",
        gateway: "paystation",
        reason: "unverified_ipn_payload",
      });
      return NextResponse.json({ error: "Unverified IPN transaction" }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        status: result.verification.status,
        orderNumber: result.orderNumber,
        message: "PayStation IPN processed successfully",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[PayStation IPN Error] Processing failed:", error?.message);

    // Differentiate retryable infrastructure/DB errors vs client errors
    const isRetryable =
      error?.message?.includes("P2028") ||
      error?.message?.includes("P1001") ||
      error?.message?.includes("P1002") ||
      error?.message?.includes("P1008") ||
      error?.message?.includes("timeout") ||
      error?.message?.includes("ECONNRESET") ||
      error?.message?.includes("ETIMEDOUT");

    return NextResponse.json(
      { error: isRetryable ? "Service temporarily unavailable" : "Bad Request" },
      { status: isRetryable ? 503 : 400 }
    );
  }
}
