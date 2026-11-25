import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/lib/payment/service";
import { publicEnv } from "@/lib/config/public-env";
import { readBoundedBodyText, MAX_REQUEST_PAYLOAD_BYTES } from "@/lib/security/request-boundary";
import prisma from "@/lib/prisma/client";
import { auth } from "@/auth";

const MAX_CALLBACK_PAYLOAD_BYTES = MAX_REQUEST_PAYLOAD_BYTES; // 64 KB

function extractOrderNumberFromInvoice(invoiceNumber?: string): string | undefined {
  if (!invoiceNumber) return undefined;
  // Format is PS-${request.orderNumber}-${Date.now()}
  const match = invoiceNumber.match(/^PS-(.+)-\d+$/);
  if (match && match[1]) {
    return match[1];
  }
  return undefined;
}

async function handleCallback(req: NextRequest) {
  let correlatedOrderNumber: string | undefined;
  let hasCancelSignal = false;

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

    // Combine parameters (search params and body)
    const payload: Record<string, unknown> = { ...searchParamsPayload, ...bodyPayload };

    console.log("🔔 [PayStation Callback: Step 1] Browser redirect callback received:", {
      method: req.method,
      contentType: req.headers.get("content-type"),
      url: req.url,
      searchParams: searchParamsPayload,
      bodyPayload,
      combinedPayload: payload,
    });

    let invoiceNumber =
      (typeof payload.invoice_number === "string" && payload.invoice_number.trim()
        ? payload.invoice_number.trim()
        : undefined) ??
      (typeof payload.invoiceNumber === "string" && payload.invoiceNumber.trim()
        ? payload.invoiceNumber.trim()
        : undefined);

    let orderNumber =
      (typeof payload.order_number === "string" && payload.order_number.trim()
        ? payload.order_number.trim()
        : undefined) ??
      (typeof payload.orderNumber === "string" && payload.orderNumber.trim()
        ? payload.orderNumber.trim()
        : undefined) ??
      (typeof payload.reference === "string" && payload.reference.trim()
        ? payload.reference.trim()
        : undefined);

    if (!orderNumber && invoiceNumber) {
      orderNumber = extractOrderNumberFromInvoice(invoiceNumber);
    }

    // Session fallback if correlation parameters were stripped on browser redirect
    if (!invoiceNumber || !orderNumber) {
      try {
        const session = await auth();
        if (session?.user?.id) {
          const recentPayment = await prisma.payment.findFirst({
            where: {
              gateway: "PAYSTATION",
              status: "INITIATED",
              order: { userId: session.user.id },
            },
            orderBy: { createdAt: "desc" },
            include: { order: { select: { orderNumber: true } } },
          });

          if (recentPayment) {
            if (!invoiceNumber && recentPayment.merchantReferenceId) {
              invoiceNumber = recentPayment.merchantReferenceId;
              payload.invoice_number = invoiceNumber;
            }
            if (!orderNumber && recentPayment.order?.orderNumber) {
              orderNumber = recentPayment.order.orderNumber;
            }
          }
        }
      } catch {
        // Fallback session lookup is best-effort
      }
    }

    correlatedOrderNumber = orderNumber;

    const rawCallbackStatus =
      (typeof payload.status === "string" && payload.status.trim().toLowerCase()) ||
      (typeof payload.trx_status === "string" && payload.trx_status.trim().toLowerCase()) ||
      (typeof payload.payment_status === "string" && payload.payment_status.trim().toLowerCase()) ||
      "";
    hasCancelSignal =
      rawCallbackStatus === "cancel" ||
      rawCallbackStatus === "canceled" ||
      rawCallbackStatus === "cancelled" ||
      rawCallbackStatus === "aborted" ||
      payload.cancel === "true" ||
      payload.cancelled === "true" ||
      payload.canceled === "true";

    console.info(
      "[PayStation][Callback]",
      JSON.stringify({
        event: "callback_received",
        method: req.method,
        orderNumber: correlatedOrderNumber,
        invoiceNumber,
        gateway: "PAYSTATION",
        hasCancelSignal,
        hasPayload: Object.keys(payload).length > 0,
      })
    );

    // If invoice_number is missing and cannot be correlated, we cannot verify via PaymentService
    if (!invoiceNumber) {
      if (correlatedOrderNumber) {
        console.warn(
          `[PayStation Callback] Missing invoice_number but order correlated (${correlatedOrderNumber}). Redirecting to cancelled.`
        );
        const redirectUrl = new URL(
          `/order-success/${encodeURIComponent(correlatedOrderNumber)}`,
          publicEnv.NEXT_PUBLIC_APP_URL
        );
        redirectUrl.searchParams.set("payment", "cancelled");
        return NextResponse.redirect(redirectUrl, 303);
      }
      throw new Error("Missing transaction reference");
    }

    console.log("🔄 [PayStation Callback: Step 2] Calling PaymentService.verifyCallback for invoice:", invoiceNumber);
    const paymentService = new PaymentService();
    // Server-to-server verification is triggered by verifyCallback -> PaystationProvider.verifyPayment
    const result = await paymentService.verifyCallback("PAYSTATION", payload);
    correlatedOrderNumber = result.orderNumber || correlatedOrderNumber;

    console.log("📥 [PayStation Callback: Step 3] PaymentService verification result:", {
      orderNumber: correlatedOrderNumber,
      status: result.verification.status,
      success: result.verification.success,
      isUnverified: result.verification.isUnverified,
      isRetryable: result.verification.isRetryable,
      error: result.verification.error,
    });

    const isJsonClient = req.headers.get("accept")?.includes("application/json");
    if (isJsonClient) {
      const jsonStatus =
        result.verification.status === "SUCCESS"
          ? "SUCCESS"
          : result.verification.status === "FAILED" && !result.verification.isUnverified
            ? "FAILED"
            : hasCancelSignal || result.verification.status === "CANCELLED"
              ? "CANCELLED"
              : "PENDING";

      return NextResponse.json({
        success: result.verification.success,
        status: jsonStatus,
        orderNumber: correlatedOrderNumber,
        isUnverified: result.verification.isUnverified ?? false,
      });
    }

    let paymentState: "success" | "failed" | "cancelled" | "pending";
    if (result.verification.success && result.verification.status === "SUCCESS") {
      paymentState = "success";
    } else if (result.verification.status === "FAILED" && !result.verification.isUnverified) {
      // ONLY authoritatively verified failures get payment=failed!
      paymentState = "failed";
    } else if (result.verification.status === "CANCELLED" || hasCancelSignal) {
      // Customer cancelled checkout session; marks payment attempt CANCELLED while keeping order PENDING.
      paymentState = "cancelled";
    } else {
      // Unverified, processing, pending, or retryable timeout -> pending!
      paymentState = "pending";
    }

    const redirectUrl = new URL(
      `/order-success/${encodeURIComponent(correlatedOrderNumber!)}`,
      publicEnv.NEXT_PUBLIC_APP_URL
    );
    redirectUrl.searchParams.set("payment", paymentState);

    console.log("🏁 [PayStation Callback: Step 4] Redirecting customer to order page:", {
      destination: redirectUrl.pathname + redirectUrl.search,
      paymentState,
      orderNumber: correlatedOrderNumber,
    });

    console.info(
      "[PayStation][Decision]",
      JSON.stringify({
        event: "callback_decision",
        orderNumber: correlatedOrderNumber,
        invoiceNumber,
        gateway: "PAYSTATION",
        verificationStatus: result.verification.status,
        isUnverified: result.verification.isUnverified ?? false,
        isRetryable: result.verification.isRetryable ?? false,
        paymentState,
        redirectDestination: redirectUrl.pathname + redirectUrl.search,
      })
    );

    return NextResponse.redirect(redirectUrl, 303);
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[PayStation Callback Error] Payment callback processing failed:", error?.message);

    const isJsonClient = req.headers.get("accept")?.includes("application/json");
    if (isJsonClient) {
      if (correlatedOrderNumber) {
        return NextResponse.json(
          {
            success: false,
            status: hasCancelSignal ? "CANCELLED" : "PENDING",
            orderNumber: correlatedOrderNumber,
            isUnverified: true,
            isRetryable: true,
            error: error?.message || "Payment verification failed",
          },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { error: error?.message || "Payment verification failed" },
        { status: 400 }
      );
    }

    // Correlated order is safely redirected to order confirmation with appropriate state
    if (correlatedOrderNumber) {
      const paymentState = hasCancelSignal ? "cancelled" : "pending";
      const redirectUrl = new URL(
        `/order-success/${encodeURIComponent(correlatedOrderNumber)}`,
        publicEnv.NEXT_PUBLIC_APP_URL
      );
      redirectUrl.searchParams.set("payment", paymentState);

      console.warn(
        "[PayStation][Decision]",
        JSON.stringify({
          event: "error_decision",
          orderNumber: correlatedOrderNumber,
          gateway: "PAYSTATION",
          error: error?.message,
          paymentState,
          redirectDestination: redirectUrl.pathname + redirectUrl.search,
        })
      );

      return NextResponse.redirect(redirectUrl, 303);
    }

    // Only completely uncorrelated / unresolvable requests redirect to generic cart error
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
