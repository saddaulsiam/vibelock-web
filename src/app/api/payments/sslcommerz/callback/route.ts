import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/lib/payment/service";
import { publicEnv } from "@/lib/config/public-env";
import { readBoundedBodyText, MAX_REQUEST_PAYLOAD_BYTES } from "@/lib/security/request-boundary";

const MAX_CALLBACK_PAYLOAD_BYTES = MAX_REQUEST_PAYLOAD_BYTES; // 64 KB

async function handleCallback(req: NextRequest) {
  let isIpn = false;
  try {
    const isUrlEncoded = req.headers
      .get("content-type")
      ?.includes("application/x-www-form-urlencoded");

    const searchParamsPayload: Record<string, unknown> = {};
    for (const [key, value] of req.nextUrl.searchParams.entries()) {
      searchParamsPayload[key] = value;
    }

    let bodyPayload: Record<string, unknown> = {};
    if (req.method !== "GET") {
      const bounded = await readBoundedBodyText(req, MAX_CALLBACK_PAYLOAD_BYTES);
      if (bounded.tooLarge) {
        const isJsonClient = req.headers.get("accept")?.includes("application/json");
        if (isJsonClient) {
          return NextResponse.json({ error: "Payload too large" }, { status: 413 });
        }
        return new NextResponse("Payload too large", { status: 413 });
      }

      const text = bounded.text;
      if (isUrlEncoded) {
        const params = new URLSearchParams(text);
        for (const [key, value] of params.entries()) {
          bodyPayload[key] = value;
        }
      } else if (text.trim()) {
        try {
          bodyPayload = JSON.parse(text);
        } catch {
          // Non-JSON or malformed body
        }
      }
    }

    const payload = { ...searchParamsPayload, ...bodyPayload };

    const statusParam = req.nextUrl.searchParams.get("status")?.toLowerCase();
    isIpn =
      statusParam === "ipn" ||
      (typeof payload.status === "string" && payload.status.toLowerCase() === "ipn") ||
      req.headers.get("x-sslcommerz-ipn") === "true";

    const paymentService = new PaymentService();
    const result = await paymentService.verifyCallback("SSLCOMMERZ", payload);

    if (isIpn) {
      if (result.verification.isUnverified) {
        return new NextResponse("Unverified IPN payload", {
          status: 400,
          headers: { "Content-Type": "text/plain" },
        });
      }
      return new NextResponse("IPN OK", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    const paymentState =
      result.verification.status === "SUCCESS"
        ? "success"
        : result.verification.status.toLowerCase();
    const redirectUrl = new URL(
      `/order-success/${encodeURIComponent(result.orderNumber)}`,
      publicEnv.NEXT_PUBLIC_APP_URL
    );
    redirectUrl.searchParams.set("payment", paymentState);
    return NextResponse.redirect(redirectUrl, 303);
  } catch (err: unknown) {
    const error = err as Error;
    console.error(
      "[SSLCommerz Callback Error] Payment callback processing failed:",
      error?.message
    );

    if (isIpn) {
      const isRetryable =
        error?.message?.includes("P2028") ||
        error?.message?.includes("P1001") ||
        error?.message?.includes("P1002") ||
        error?.message?.includes("P1008") ||
        error?.message?.includes("timeout") ||
        error?.message?.includes("ECONNRESET") ||
        error?.message?.includes("ETIMEDOUT");

      return new NextResponse(isRetryable ? "Service Unavailable" : "Bad Request", {
        status: isRetryable ? 503 : 400,
        headers: { "Content-Type": "text/plain" },
      });
    }

    return NextResponse.redirect(
      new URL("/cart?error=payment_verification_failed", publicEnv.NEXT_PUBLIC_APP_URL),
      303
    );
  }
}

export async function POST(req: NextRequest) {
  return handleCallback(req);
}

export async function GET(req: NextRequest) {
  return handleCallback(req);
}
