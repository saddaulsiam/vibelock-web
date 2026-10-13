import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/lib/payment/service";
import { publicEnv } from "@/lib/config/public-env";

async function handleCallback(req: NextRequest) {
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
      if (isUrlEncoded) {
        const text = await req.text();
        const params = new URLSearchParams(text);
        for (const [key, value] of params.entries()) {
          bodyPayload[key] = value;
        }
      } else {
        try {
          bodyPayload = await req.json();
        } catch {
          // Non-JSON or empty body
        }
      }
    }

    const payload = { ...searchParamsPayload, ...bodyPayload };

    const paymentService = new PaymentService();
    const result = await paymentService.verifyCallback("BKASH", payload);

    const isJsonClient = req.headers.get("accept")?.includes("application/json");
    if (isJsonClient) {
      return NextResponse.json({
        success: result.verification.success,
        status: result.verification.status,
        orderNumber: result.orderNumber,
        isUnverified: result.verification.isUnverified ?? false,
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
    console.error("[bKash Callback Error] Payment callback processing failed:", error?.message);

    const isJsonClient = req.headers.get("accept")?.includes("application/json");
    if (isJsonClient) {
      return NextResponse.json(
        { error: error?.message || "Payment verification failed" },
        { status: 400 }
      );
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
