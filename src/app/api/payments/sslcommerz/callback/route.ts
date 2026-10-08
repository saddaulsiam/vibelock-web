import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/lib/payment/service";
import { publicEnv } from "@/lib/config/public-env";

async function handleCallback(req: NextRequest) {
  try {
    const isUrlEncoded = req.headers
      .get("content-type")
      ?.includes("application/x-www-form-urlencoded");
    let payload: Record<string, unknown> = {};

    if (req.method === "GET") {
      for (const [key, value] of req.nextUrl.searchParams.entries()) {
        payload[key] = value;
      }
    } else if (isUrlEncoded) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      for (const [key, value] of params.entries()) {
        payload[key] = value;
      }
    } else {
      payload = await req.json();
    }

    const paymentService = new PaymentService();
    const result = await paymentService.verifyCallback("SSLCOMMERZ", payload);
    const paymentState =
      result.verification.status === "SUCCESS" ? "success" : result.verification.status.toLowerCase();
    const redirectUrl = new URL(
      `/order-success/${encodeURIComponent(result.orderNumber)}`,
      publicEnv.NEXT_PUBLIC_APP_URL
    );
    redirectUrl.searchParams.set("payment", paymentState);
    return NextResponse.redirect(redirectUrl, 303);
  } catch {
    console.error("[SSLCommerz Callback Error] Payment callback processing failed");
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
