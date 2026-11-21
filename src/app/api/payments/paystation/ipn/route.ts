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
      if (result.verification.isRetryable) {
        return NextResponse.json(
          { error: "Upstream gateway temporarily unavailable" },
          { status: 503 }
        );
      }

      const errorMessage = result.verification.error || "";

      // Internal credential or configuration issue -> HTTP 500 (not tampering, not 400)
      if (errorMessage.toLowerCase().includes("configuration missing")) {
        return NextResponse.json({ error: "Payment gateway configuration error" }, { status: 500 });
      }

      // Upstream HTTP 4xx failures from PayStation query -> HTTP 500/502 (not client tampering, not 400)
      if (errorMessage.includes("PayStation transaction-status query returned HTTP 4")) {
        const isAuthError = errorMessage.includes("HTTP 401") || errorMessage.includes("HTTP 403");
        return NextResponse.json(
          {
            error: isAuthError
              ? "Payment gateway authentication error"
              : "Upstream gateway query error",
          },
          { status: isAuthError ? 500 : 502 }
        );
      }

      // Genuine untrusted or mismatched payload: caller reported transaction that fails authoritative verification
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

    const message = error?.message || "";

    // 1. Differentiate retryable infrastructure / network / timeout / DB failures -> HTTP 503
    const isRetryable =
      error?.name === "TimeoutError" ||
      error?.name === "AbortError" ||
      Boolean(
        message.includes("P2028") ||
        message.includes("P1001") ||
        message.includes("P1002") ||
        message.includes("P1008") ||
        message.toLowerCase().includes("timeout") ||
        message.toLowerCase().includes("econnreset") ||
        message.toLowerCase().includes("etimedout") ||
        message.toLowerCase().includes("fetch failed")
      );

    if (isRetryable) {
      return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }

    // 2. Differentiate client payload errors / mismatches (e.g. unknown invoice, amount mismatch, etc.) -> HTTP 400
    const isClientError =
      message.includes("Missing transaction reference") ||
      message.includes("Invalid transaction reference") ||
      message.includes("Payment record not found") ||
      message.includes("Payment verification failed");

    if (isClientError) {
      return NextResponse.json({ error: message || "Bad Request" }, { status: 400 });
    }

    // 3. Unexpected internal server exceptions return HTTP 500
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
