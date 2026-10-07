import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/lib/payment/service";

export async function POST(req: NextRequest) {
  try {
    const isUrlEncoded = req.headers
      .get("content-type")
      ?.includes("application/x-www-form-urlencoded");
    let payload: Record<string, unknown> = {};

    if (isUrlEncoded) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      for (const [key, value] of params.entries()) {
        payload[key] = value;
      }
    } else {
      payload = await req.json();
    }

    const paymentService = new PaymentService();
    await paymentService.verifyCallback("SSLCOMMERZ", payload);

    const status = payload.status;
    const baseUrl = req.nextUrl.origin;

    // SSLCommerz typically redirects here for success/fail
    // Let's redirect user to their order details or success/failure page
    // Unfortunately we only have `tran_id` which encodes the orderNumber `SSLC-${orderNumber}-${timestamp}`
    let orderNumber = "";
    const tran_id = payload.tran_id as string;
    if (tran_id) {
      const parts = tran_id.split("-");
      if (parts.length >= 2) {
        orderNumber = parts[1];
      }
    }

    if (status === "VALID" || status === "VALIDATED") {
      return NextResponse.redirect(`${baseUrl}/order-success/${orderNumber}?payment=success`, 303);
    } else if (status === "FAILED") {
      return NextResponse.redirect(`${baseUrl}/order-success/${orderNumber}?payment=failed`, 303);
    } else if (status === "CANCELLED") {
      return NextResponse.redirect(
        `${baseUrl}/order-success/${orderNumber}?payment=cancelled`,
        303
      );
    }

    // Default fallback
    return NextResponse.redirect(`${baseUrl}/products`, 303);
  } catch (error) {
    console.error("[SSLCommerz Callback Error]", error);
    return NextResponse.redirect(
      `${req.nextUrl.origin}/cart?error=payment_verification_failed`,
      303
    );
  }
}
