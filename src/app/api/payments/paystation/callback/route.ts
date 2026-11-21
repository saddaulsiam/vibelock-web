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

    const paymentService = new PaymentService();
    // Server-to-server verification is triggered by verifyCallback -> PaystationProvider.verifyPayment
    const result = await paymentService.verifyCallback("PAYSTATION", payload);
    correlatedOrderNumber = result.orderNumber || correlatedOrderNumber;

    const isJsonClient = req.headers.get("accept")?.includes("application/json");
    if (isJsonClient) {
      return NextResponse.json({
        success: result.verification.success,
        status: result.verification.status,
        orderNumber: correlatedOrderNumber,
        isUnverified: result.verification.isUnverified ?? false,
      });
    }

    let paymentState: string;
    if (result.verification.status === "SUCCESS") {
      paymentState = "success";
    } else if (result.verification.status === "FAILED") {
      paymentState = "failed";
    } else {
      // CANCELLED or PENDING (customer returned while transaction uncompleted / in-flight)
      paymentState = "cancelled";
    }

    const redirectUrl = new URL(
      `/order-success/${encodeURIComponent(correlatedOrderNumber!)}`,
      publicEnv.NEXT_PUBLIC_APP_URL
    );
    redirectUrl.searchParams.set("payment", paymentState);
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
            status: "CANCELLED",
            orderNumber: correlatedOrderNumber,
            isUnverified: true,
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

    // Correlated order is safely redirected to order confirmation with cancelled state
    if (correlatedOrderNumber) {
      const redirectUrl = new URL(
        `/order-success/${encodeURIComponent(correlatedOrderNumber)}`,
        publicEnv.NEXT_PUBLIC_APP_URL
      );
      redirectUrl.searchParams.set("payment", "cancelled");
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
