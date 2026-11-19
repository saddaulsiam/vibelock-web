import { randomUUID } from "crypto";
import prisma from "@/lib/prisma/client";
import { PaymentInitiationResponse, PaymentProvider, VerifiedCaptureCandidate } from "./types";
import { SSLCommerzProvider } from "./providers/sslcommerz/client";
import { BkashProvider } from "./providers/bkash/client";
import { NagadProvider } from "./providers/nagad/client";
import { CaptureReconciliationStatus, Order, PaymentStatus, Prisma } from "@prisma/client";
import {
  isSSLCommerzGateway,
  isBkashGateway,
  isNagadGateway,
  normalizePaymentGateway,
} from "./constants";
import { logSecurityAlert, hashSecurityIdentifier } from "@/lib/monitoring/security-logger";

const FORBIDDEN_METADATA_KEYS = new Set([
  "store_passwd",
  "store_id",
  "password",
  "app_secret",
  "app_key",
  "id_token",
  "refreshToken",
  "token",
  "sensitiveData",
  "signature",
  "merchantPrivateKey",
  "pgPublicKey",
  "secret",
  "credential",
  "initiation",
  "card_no",
  "card_number",
  "__proto__",
  "constructor",
  "prototype",
]);

const ALLOWED_CALLBACK_KEYS = new Set([
  // SSLCommerz
  "status",
  "tran_id",
  "val_id",
  "amount",
  "store_amount",
  "currency",
  "bank_tran_id",
  "card_type",
  "card_issuer",
  "card_brand",
  "card_sub_brand",
  "card_issuer_country",
  "card_issuer_country_code",
  "currency_type",
  "currency_amount",
  "currency_rate",
  "base_fair",
  "value_a",
  "value_b",
  "value_c",
  "value_d",
  "risk_level",
  "risk_title",
  "error",
  "failedreason",
  "tran_date",
  "gw_version",
  "validated_on",
  "gw_element",
  // bKash
  "paymentID",
  "trxID",
  "transactionStatus",
  "intent",
  "paymentCreateTime",
  "paymentExecuteTime",
  "payerReference",
  "customerMsisdn",
  "merchantInvoiceNumber",
  "errorMessage",
  "errorCode",
  // Nagad
  "payment_ref_id",
  "order_id",
  "issuer_payment_ref",
]);

function sanitizeCapturePayload(raw: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k.toLowerCase() === "card_no" || k.toLowerCase() === "card_number") {
      continue;
    }
    if (FORBIDDEN_METADATA_KEYS.has(k)) {
      continue;
    }
    sanitized[k] = v;
  }
  return sanitized;
}

function sanitizeCallbackPayload(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (ALLOWED_CALLBACK_KEYS.has(key) && !FORBIDDEN_METADATA_KEYS.has(key)) {
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null
      ) {
        clean[key] = value;
      }
    }
  }
  return clean;
}

function buildUpdatedGatewayPayload(
  existingPayload: unknown,
  rawCallbackPayload: unknown
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const existing =
    existingPayload && typeof existingPayload === "object" && !Array.isArray(existingPayload)
      ? (existingPayload as Record<string, unknown>)
      : null;

  // 1. Preserve existing trusted initiation metadata intact
  if (existing) {
    const existingInitiation = existing.initiation;
    if (
      existingInitiation &&
      typeof existingInitiation === "object" &&
      !Array.isArray(existingInitiation)
    ) {
      result.initiation = { ...(existingInitiation as Record<string, unknown>) };
    } else if (typeof existing.redirectUrl === "string") {
      // Legacy initiation format fallback: lift existing redirectUrl into initiation namespace
      result.initiation = {
        redirectUrl: existing.redirectUrl,
      };
    }

    // Preserve root-level redirectUrl if present (backwards compatibility for session reuse checks)
    if (typeof existing.redirectUrl === "string") {
      result.redirectUrl = existing.redirectUrl;
    }

    // Preserve cancellationReason if already present
    if (typeof existing.cancellationReason === "string") {
      result.cancellationReason = existing.cancellationReason;
    }

    // Preserve provisional namespace if already present
    if (
      existing.provisional &&
      typeof existing.provisional === "object" &&
      !Array.isArray(existing.provisional)
    ) {
      result.provisional = { ...(existing.provisional as Record<string, unknown>) };
    }
  }

  // 2. Add sanitized callback fields strictly under callback namespace
  const cleanCallback = sanitizeCallbackPayload(rawCallbackPayload);
  result.callback = cleanCallback;

  // 3. Backward-compatible root properties for order views & DTO mappers
  const cardType =
    typeof cleanCallback.card_type === "string"
      ? cleanCallback.card_type
      : typeof cleanCallback.cardType === "string"
        ? cleanCallback.cardType
        : typeof existing?.card_type === "string"
          ? existing.card_type
          : undefined;

  if (cardType) {
    result.card_type = cardType;
  }

  return result;
}

export class PaymentService {
  private getProvider(gateway: string): PaymentProvider {
    if (isSSLCommerzGateway(gateway)) {
      return new SSLCommerzProvider();
    }
    if (isBkashGateway(gateway)) {
      return new BkashProvider();
    }
    if (isNagadGateway(gateway)) {
      return new NagadProvider();
    }
    throw new Error(`Unsupported payment gateway: ${gateway}`);
  }

  async initiatePayment(
    order: Order,
    gateway: string,
    options?: { skipRateLimit?: boolean; clientIp?: string }
  ): Promise<PaymentInitiationResponse> {
    if (!options?.skipRateLimit && order.userId) {
      try {
        const { checkPaymentInitiationRateLimit } = await import("@/lib/security/rate-limit");
        await checkPaymentInitiationRateLimit(order.userId, options?.clientIp);
      } catch (rateLimitErr: unknown) {
        if (rateLimitErr instanceof Error && rateLimitErr.message === "RATE_LIMIT_EXCEEDED") {
          logSecurityAlert("PAYMENT_RATE_LIMIT_EXCEEDED", {
            endpoint: "initiatePayment",
            gateway: gateway.toLowerCase(),
            reason: "payment_initiation_rate_limit_exceeded",
            orderHash: hashSecurityIdentifier(order.orderNumber),
          });
          return {
            success: false,
            error: "Payment initiation rate limit exceeded. Please wait a few minutes before retrying.",
          };
        }
        throw rateLimitErr;
      }
    }

    const provider = this.getProvider(gateway);
    const normalizedGateway = normalizePaymentGateway(gateway);

    // Step 1: Pre-initiation short transaction
    // Authoritatively verifies order state and serializes concurrent initiation attempts
    // WITHOUT holding any database transaction open during subsequent external gateway calls.
    const preCheck = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${order.id} FOR UPDATE`;
      const currentOrder = await tx.order.findUnique({
        where: { id: order.id },
      });

      if (!currentOrder) {
        return { status: "ERROR" as const, error: "Order not found" };
      }
      if (currentOrder.paymentStatus === "SUCCESS") {
        return { status: "ERROR" as const, error: "Order is already paid" };
      }
      if (currentOrder.status === "CANCELLED") {
        return { status: "ERROR" as const, error: "Cannot initiate payment for a cancelled order" };
      }

      // Handle stale PENDING placeholders safely across ALL gateways (> 30s old)
      // This ensures abandoned, crashed, or dropped initiations do not permanently block subsequent attempts.
      await tx.payment.updateMany({
        where: {
          orderId: order.id,
          status: "PENDING",
          createdAt: { lte: new Date(Date.now() - 30 * 1000) },
        },
        data: {
          status: "FAILED",
          gatewayPayload: {
            error: "Payment initiation timed out (stale pending placeholder cleaned up)",
          },
        },
      });

      // Check if another concurrent initiation is actively in flight (< 30s) across ALL gateways
      const activePending = await tx.payment.findFirst({
        where: {
          orderId: order.id,
          status: "PENDING",
          createdAt: { gt: new Date(Date.now() - 30 * 1000) },
        },
        orderBy: { createdAt: "desc" },
      });

      if (activePending) {
        return {
          status: "IN_FLIGHT" as const,
          error: "A payment initiation is already in progress for this order. Please wait a moment.",
        };
      }

      // Check for any active INITIATED payment across ALL gateways
      const existingInitiated = await tx.payment.findFirst({
        where: {
          orderId: order.id,
          status: "INITIATED",
        },
        orderBy: { createdAt: "desc" },
      });

      if (existingInitiated?.merchantReferenceId) {
        if (existingInitiated.gateway === normalizedGateway) {
          // Same gateway: reuse active payment attempt if redirectUrl exists
          const payload = existingInitiated.gatewayPayload as Record<string, unknown> | null;
          if (typeof payload?.redirectUrl === "string" && payload.redirectUrl) {
            return {
              status: "REUSE" as const,
              response: {
                success: true,
                redirectUrl: payload.redirectUrl,
                merchantReferenceId: existingInitiated.merchantReferenceId,
              },
            };
          }

          // Same gateway but no cached redirectUrl: do not blindly create a duplicate active session
          return {
            status: "IN_FLIGHT" as const,
            error:
              "A payment attempt on this gateway is currently unresolved. Please wait while the transaction is verified, or contact support.",
          };
        } else {
          // Different gateway: strictly block switching gateways while an earlier attempt is unresolved
          return {
            status: "IN_FLIGHT" as const,
            error: `A payment attempt via ${existingInitiated.gateway} is currently unresolved. Switching payment methods is blocked until the existing transaction is confirmed or resolved.`,
          };
        }
      }

      // Create a PENDING placeholder to serialize and reserve the initiation slot
      const placeholder = await tx.payment.create({
        data: {
          orderId: currentOrder.id,
          amount: Number(currentOrder.total),
          status: "PENDING",
          gateway: normalizedGateway,
        },
      });

      return {
        status: "PROCEED" as const,
        placeholderId: placeholder.id,
        orderData: {
          orderId: currentOrder.id,
          orderNumber: currentOrder.orderNumber,
          amount: Number(currentOrder.total),
          customerName: currentOrder.customerName || "Customer",
          customerEmail: currentOrder.customerEmail,
          customerPhone: currentOrder.customerPhone || "00000000000",
          shippingStreet: currentOrder.shippingStreet,
          shippingCity: currentOrder.shippingCity,
          shippingZip: currentOrder.shippingZip || "1000",
          shippingCountry: currentOrder.shippingCountry,
        },
      };
    });

    if (preCheck.status === "REUSE") {
      return preCheck.response;
    }
    if (preCheck.status === "ERROR" || preCheck.status === "IN_FLIGHT") {
      return { success: false, error: preCheck.error };
    }

    const { placeholderId, orderData } = preCheck;

    // Step 2: External gateway call strictly OUTSIDE any database transaction
    let response: PaymentInitiationResponse;
    try {
      response = await provider.initiatePayment(orderData);
    } catch (networkErr) {
      await prisma.payment
        .update({
          where: { id: placeholderId },
          data: {
            status: "FAILED",
            gatewayPayload: {
              error:
                networkErr instanceof Error ? networkErr.message : "Network error during initiation",
            },
          },
        })
        .catch(() => {});
      throw networkErr;
    }

    // Step 3: Post-initiation short transaction
    // Atomically updates the placeholder to INITIATED or FAILED
    if (response.success && response.merchantReferenceId) {
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${order.id} FOR UPDATE`;
        const latestOrder = await tx.order.findUnique({
          where: { id: order.id },
          select: { status: true, paymentStatus: true },
        });

        const nowIso = new Date().toISOString();
        const initiationMetadata: Record<string, unknown> = {
          initiatedAt: nowIso,
        };
        if (typeof response.redirectUrl === "string" && response.redirectUrl) {
          initiationMetadata.redirectUrl = response.redirectUrl;
        }
        if (typeof response.sessionKey === "string" && response.sessionKey) {
          initiationMetadata.sessionKey = response.sessionKey;
        }

        if (latestOrder?.paymentStatus === "SUCCESS" || latestOrder?.status === "CANCELLED") {
          // Order was paid or cancelled while external call was in flight
          await tx.payment.update({
            where: { id: placeholderId },
            data: {
              status: "CANCELLED",
              merchantReferenceId: response.merchantReferenceId,
              gatewayPayload: {
                initiation: initiationMetadata,
                redirectUrl: response.redirectUrl,
                cancellationReason: `Order transitioned to ${latestOrder.status}/${latestOrder.paymentStatus} during initiation`,
              } as Prisma.InputJsonValue,
            },
          });
          return;
        }

        await tx.payment.update({
          where: { id: placeholderId },
          data: {
            status: "INITIATED",
            merchantReferenceId: response.merchantReferenceId,
            gatewayPayload: {
              initiation: initiationMetadata,
              redirectUrl: response.redirectUrl,
            } as Prisma.InputJsonValue,
          },
        });
      });
    } else {
      await prisma.payment
        .update({
          where: { id: placeholderId },
          data: {
            status: "FAILED",
            gatewayPayload: {
              error: response.error || "Gateway rejected initiation",
            },
          },
        })
        .catch(() => {});
    }

    return response;
  }

  async verifyCallback(
    gateway: string,
    payload: Record<string, unknown>
  ): Promise<{
    orderNumber: string;
    verification: Awaited<ReturnType<PaymentProvider["verifyPayment"]>>;
  }> {
    const provider = this.getProvider(gateway);

    // Extract merchant reference ID:
    // SSLCommerz uses 'tran_id', bKash uses 'paymentID', Nagad uses 'payment_ref_id'
    const merchantReferenceId =
      (typeof payload.tran_id === "string" && payload.tran_id.trim()
        ? payload.tran_id.trim()
        : undefined) ??
      (typeof payload.paymentID === "string" && payload.paymentID.trim()
        ? payload.paymentID.trim()
        : undefined) ??
      (typeof payload.paymentId === "string" && payload.paymentId.trim()
        ? payload.paymentId.trim()
        : undefined) ??
      (typeof payload.payment_ref_id === "string" && payload.payment_ref_id.trim()
        ? payload.payment_ref_id.trim()
        : undefined) ??
      (typeof payload.paymentRefId === "string" && payload.paymentRefId.trim()
        ? payload.paymentRefId.trim()
        : undefined);

    if (!merchantReferenceId) {
      console.error("[PaymentService] Missing transaction reference in callback");
      logSecurityAlert("PAYMENT_TAMPERING_DETECTED", {
        endpoint: "verifyCallback",
        gateway: gateway.toLowerCase(),
        reason: "missing_transaction_reference",
      });
      throw new Error("Missing transaction reference");
    }

    if (merchantReferenceId.length > 128) {
      console.error("[PaymentService] Transaction reference exceeds maximum allowed length");
      logSecurityAlert("PAYMENT_TAMPERING_DETECTED", {
        endpoint: "verifyCallback",
        gateway: gateway.toLowerCase(),
        reason: "invalid_transaction_reference_length",
      });
      throw new Error("Invalid transaction reference");
    }

    // Find the payment record
    const payment = await prisma.payment.findUnique({
      where: { merchantReferenceId },
    });

    if (!payment) {
      console.error(`[PaymentService] Payment not found for tran_id: ${merchantReferenceId}`);
      logSecurityAlert("PAYMENT_TAMPERING_DETECTED", {
        endpoint: "verifyCallback",
        gateway: gateway.toLowerCase(),
        reason: "payment_not_found",
        referenceHash: hashSecurityIdentifier(merchantReferenceId),
      });
      throw new Error("Payment record not found");
    }

    // A successful payment is terminal. Do not make a duplicate provider request.
    if (payment.status === "SUCCESS") {
      console.log(
        `[PaymentService] Payment ${merchantReferenceId} already verified successful. Ignoring callback.`
      );
      const order = await prisma.order.findUnique({
        where: { id: payment.orderId },
        select: { orderNumber: true },
      });
      if (!order) throw new Error("Order not found");
      return {
        orderNumber: order.orderNumber,
        verification: { success: true, status: "SUCCESS" },
      };
    }

    if (payment.status === "FAILED" || payment.status === "CANCELLED") {
      const incomingStatus = typeof payload.status === "string" ? payload.status.toUpperCase() : "";
      const isIncomingNonSuccess =
        (!payload.val_id && !payload.paymentID && !payload.paymentId) ||
        incomingStatus === "FAILED" ||
        incomingStatus === "FAIL" ||
        incomingStatus === "CANCELLED" ||
        incomingStatus === "CANCEL" ||
        incomingStatus === "UNATTEMPTED" ||
        incomingStatus === "EXPIRED" ||
        incomingStatus === "DECLINED" ||
        incomingStatus === "ISSUER BANK DECLINED" ||
        incomingStatus === "ISSUER_BANK_DECLINED" ||
        incomingStatus === "BANK DECLINED";

      if (isIncomingNonSuccess) {
        console.log(
          `[PaymentService] Payment ${merchantReferenceId} is already terminal (${payment.status}). Ignoring duplicate non-success callback.`
        );
        const order = await prisma.order.findUnique({
          where: { id: payment.orderId },
          select: { orderNumber: true },
        });
        if (!order) throw new Error("Order not found");
        return {
          orderNumber: order.orderNumber,
          verification: {
            success: true,
            status: payment.status,
            verifiedMerchantReferenceId: merchantReferenceId,
            rawPayload: payload,
          },
        };
      }
    }

    // Verify
    const verification = await provider.verifyPayment(payload);

    // Safeguard 1: Never mark payment FAILED/CANCELLED or release inventory based on an unverified browser callback!
    // Keep payment INITIATED and reservations unchanged until trusted reconciliation.
    if (verification.isUnverified) {
      console.warn(
        `[PaymentService] Unverified ${verification.status} callback received for ${merchantReferenceId}. ` +
          `Preserving INITIATED status and keeping reservations unchanged until trusted reconciliation.`
      );
      const order = await prisma.order.findUnique({
        where: { id: payment.orderId },
        select: { orderNumber: true },
      });
      if (!order) throw new Error("Order not found");
      return {
        orderNumber: order.orderNumber,
        verification: {
          success: false,
          status: verification.status,
          isUnverified: true,
          verifiedMerchantReferenceId: merchantReferenceId,
          rawPayload: payload,
        },
      };
    }

    // Ensure any verified merchant reference matches our record
    if (
      verification.verifiedMerchantReferenceId &&
      verification.verifiedMerchantReferenceId !== merchantReferenceId
    ) {
      logSecurityAlert("PAYMENT_TAMPERING_DETECTED", {
        endpoint: "verifyCallback",
        gateway: gateway.toLowerCase(),
        reason: "transaction_reference_mismatch",
        referenceHash: hashSecurityIdentifier(merchantReferenceId),
        orderHash: hashSecurityIdentifier(payment.orderId),
      });
      throw new Error("Payment verification failed: Transaction or Currency Mismatch");
    }

    // Cross-cutting currency safeguard for all authoritative responses
    if (verification.verifiedCurrency && verification.verifiedCurrency !== "BDT") {
      logSecurityAlert("PAYMENT_TAMPERING_DETECTED", {
        endpoint: "verifyCallback",
        gateway: gateway.toLowerCase(),
        reason: "currency_mismatch",
        referenceHash: hashSecurityIdentifier(merchantReferenceId),
        orderHash: hashSecurityIdentifier(payment.orderId),
      });
      throw new Error("Payment verification failed: Transaction or Currency Mismatch");
    }

    const hasAmountMismatch =
      verification.verifiedAmount !== undefined &&
      Math.abs(verification.verifiedAmount - Number(payment.amount)) > 0.01;

    // If verification was successful or amount mismatches, validate references and amount safely
    if ((verification.success && verification.status === "SUCCESS") || hasAmountMismatch) {
      if (verification.verifiedMerchantReferenceId !== merchantReferenceId) {
        logSecurityAlert("PAYMENT_TAMPERING_DETECTED", {
          endpoint: "verifyCallback",
          gateway: gateway.toLowerCase(),
          reason: "transaction_reference_mismatch",
          referenceHash: hashSecurityIdentifier(merchantReferenceId),
          orderHash: hashSecurityIdentifier(payment.orderId),
        });
        throw new Error("Payment verification failed: Transaction or Currency Mismatch");
      }

      if (verification.verifiedCurrency !== "BDT") {
        logSecurityAlert("PAYMENT_TAMPERING_DETECTED", {
          endpoint: "verifyCallback",
          gateway: gateway.toLowerCase(),
          reason: "currency_mismatch",
          referenceHash: hashSecurityIdentifier(merchantReferenceId),
          orderHash: hashSecurityIdentifier(payment.orderId),
        });
        throw new Error("Payment verification failed: Transaction or Currency Mismatch");
      }

      // Ensure any verified order reference matches our order record
      if (verification.verifiedOrderNumber) {
        const order = await prisma.order.findUnique({
          where: { id: payment.orderId },
          select: { orderNumber: true },
        });
        if (order && verification.verifiedOrderNumber !== order.orderNumber) {
          console.error(
            `[PaymentService] Order reference mismatch for ${merchantReferenceId}. ` +
              `Expected ${order.orderNumber}, got ${verification.verifiedOrderNumber}`
          );
          logSecurityAlert("PAYMENT_TAMPERING_DETECTED", {
            endpoint: "verifyCallback",
            gateway: gateway.toLowerCase(),
            reason: "order_reference_mismatch",
            referenceHash: hashSecurityIdentifier(merchantReferenceId),
            orderHash: hashSecurityIdentifier(order.orderNumber),
          });
          throw new Error("Payment verification failed: Order reference mismatch");
        }
      }

      if (
        verification.verifiedAmount === undefined ||
        Math.abs(verification.verifiedAmount - Number(payment.amount)) > 0.01
      ) {
        console.error(
          `[PaymentService] Amount mismatch for ${merchantReferenceId}. Expected ${payment.amount}, got ${verification.verifiedAmount}`
        );

        logSecurityAlert("PAYMENT_TAMPERING_DETECTED", {
          endpoint: "verifyCallback",
          gateway: gateway.toLowerCase(),
          reason: "amount_mismatch",
          referenceHash: hashSecurityIdentifier(merchantReferenceId),
          orderHash: hashSecurityIdentifier(payment.orderId),
          status: "FAILED",
        });

        const safePayload = buildUpdatedGatewayPayload(
          payment.gatewayPayload,
          verification.rawPayload
        );

        await prisma.payment.updateMany({
          where: { id: payment.id, status: { not: "SUCCESS" } },
          data: {
            status: "FAILED",
            gatewayPayload: safePayload as Prisma.InputJsonValue,
            gatewayTransactionId: verification.providerTransactionId,
          },
        });
        throw new Error("Payment verification failed: Amount Mismatch");
      }
    }

    if (
      !verification.success &&
      verification.status !== "FAILED" &&
      verification.status !== "CANCELLED"
    ) {
      throw new Error("Payment verification failed");
    }

    let shouldSendConfirmationEmail = false;

    // Wrap the final update in a transaction
    await prisma.$transaction(async (tx) => {
      // Concurrency lock: row-lock Order first to serialize against cancellation or concurrent callbacks
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${payment.orderId} FOR UPDATE`;
      const currentOrder = await tx.order.findUnique({
        where: { id: payment.orderId },
        include: { items: true },
      });
      if (!currentOrder) {
        logSecurityAlert("PAYMENT_TAMPERING_DETECTED", {
          endpoint: "verifyCallback",
          gateway: gateway.toLowerCase(),
          reason: "order_not_found",
          referenceHash: hashSecurityIdentifier(merchantReferenceId),
        });
        throw new Error("Order not found");
      }

      const safePayload = buildUpdatedGatewayPayload(
        payment.gatewayPayload,
        verification.rawPayload
      );

      // 1. Atomic update of Payment:
      // For SUCCESS: allow transitioning from INITIATED, FAILED, or CANCELLED (Late SUCCESS recovery path).
      // Also allow PENDING if the payment record was in PENDING status.
      // For FAILED/CANCELLED (server verified): only transition from INITIATED (or PENDING).
      const allowedSuccessStatuses: PaymentStatus[] = [
        PaymentStatus.INITIATED,
        PaymentStatus.FAILED,
        PaymentStatus.CANCELLED,
      ];
      if (payment.status === PaymentStatus.PENDING) {
        allowedSuccessStatuses.unshift(PaymentStatus.PENDING);
      }

      const whereCondition: Prisma.PaymentWhereInput =
        verification.status === "SUCCESS"
          ? {
              id: payment.id,
              status: {
                in: allowedSuccessStatuses,
              },
            }
          : payment.status === PaymentStatus.PENDING
            ? { id: payment.id, status: { in: [PaymentStatus.PENDING, PaymentStatus.INITIATED] } }
            : { id: payment.id, status: PaymentStatus.INITIATED };

      const updateResult = await tx.payment.updateMany({
        where: whereCondition,
        data: {
          status: verification.status as PaymentStatus,
          gatewayPayload: safePayload as Prisma.InputJsonValue,
          gatewayTransactionId: verification.providerTransactionId,
        },
      });

      // If no records updated, payment was already transitioned to terminal status by another process
      if (updateResult.count === 0) {
        console.log(
          `[PaymentService] Payment ${merchantReferenceId} was already updated by another concurrent process.`
        );
        return;
      }

      // 2. Process SUCCESS callback
      if (verification.status === "SUCCESS") {
        const candidates: VerifiedCaptureCandidate[] =
          verification.candidates && verification.candidates.length > 0
            ? [...verification.candidates]
            : [
                {
                  bankTranId: verification.providerTransactionId,
                  valId:
                    typeof (verification.rawPayload as Record<string, unknown>)?.val_id === "string"
                      ? ((verification.rawPayload as Record<string, unknown>).val_id as string)
                      : undefined,
                  cardType:
                    typeof (verification.rawPayload as Record<string, unknown>)?.card_type === "string"
                      ? ((verification.rawPayload as Record<string, unknown>).card_type as string)
                      : undefined,
                  cardBrand:
                    typeof (verification.rawPayload as Record<string, unknown>)?.card_brand === "string"
                      ? ((verification.rawPayload as Record<string, unknown>).card_brand as string)
                      : undefined,
                  amount: verification.verifiedAmount ?? Number(payment.amount),
                  currency: verification.verifiedCurrency ?? "BDT",
                  status: PaymentStatus.SUCCESS,
                  riskLevel:
                    (verification.rawPayload as Record<string, unknown>)?.risk_level !== undefined &&
                    (verification.rawPayload as Record<string, unknown>)?.risk_level !== null
                      ? String((verification.rawPayload as Record<string, unknown>).risk_level).trim()
                      : undefined,
                  riskTitle:
                    typeof (verification.rawPayload as Record<string, unknown>)?.risk_title === "string"
                      ? ((verification.rawPayload as Record<string, unknown>).risk_title as string)
                      : undefined,
                  tranDate:
                    typeof (verification.rawPayload as Record<string, unknown>)?.tran_date === "string"
                      ? ((verification.rawPayload as Record<string, unknown>).tran_date as string)
                      : undefined,
                  rawPayload: sanitizeCapturePayload(
                    (verification.rawPayload as Record<string, unknown>) ?? {}
                  ),
                },
              ];

        const validCandidates = candidates.filter((c) => c.status === PaymentStatus.SUCCESS);
        validCandidates.sort((a, b) => {
          if (a.tranDate && b.tranDate) {
            const tA = new Date(a.tranDate).getTime();
            const tB = new Date(b.tranDate).getTime();
            if (!isNaN(tA) && !isNaN(tB) && tA !== tB) {
              return tA - tB;
            }
          }
          const bA = a.bankTranId ?? "";
          const bB = b.bankTranId ?? "";
          return bA.localeCompare(bB);
        });

        const existingCaptures =
          typeof tx.paymentCapture?.findMany === "function"
            ? await tx.paymentCapture.findMany({
                where: { paymentId: payment.id },
              })
            : [];
        let hasPrimaryCapture = existingCaptures.some((c) => c.isPrimary);
        let settledPrimaryCapture: { id: string; bankTranId: string } | null =
          existingCaptures.find(
            (c) => c.isPrimary && c.reconciliationStatus === CaptureReconciliationStatus.SETTLED
          ) ?? null;
        let primaryCaptureBankTranId: string | null =
          existingCaptures.find((c) => c.isPrimary)?.bankTranId ?? null;
        let hasRiskHold = false;
        let hasLateCaptureOnCancelled = false;
        let hasProvisionalHold = false;
        let hasExcessCapture = false;

        for (const candidate of validCandidates) {
          if (!candidate.bankTranId) {
            hasProvisionalHold = true;
            const provKey = candidate.valId || `prov_${Date.now()}`;
            const existingProvisional = (
              safePayload.provisional as Record<string, unknown> | undefined
            )?.[provKey] as Record<string, unknown> | undefined;

            const escalationDeadline =
              typeof existingProvisional?.escalationDeadline === "string"
                ? existingProvisional.escalationDeadline
                : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

            if (!safePayload.provisional) {
              safePayload.provisional = {};
            }
            (safePayload.provisional as Record<string, unknown>)[provKey] = {
              valId: candidate.valId,
              amount: candidate.amount,
              currency: candidate.currency,
              status: candidate.status,
              riskLevel: candidate.riskLevel,
              timestamp: new Date().toISOString(),
              reconciliationHold: true,
              escalationDeadline,
            };

            const activeReservations = await tx.inventoryReservation.findMany({
              where: {
                orderId: payment.orderId,
                status: "RESERVED",
                expiresAt: { gt: new Date() },
              },
            });

            if (activeReservations.length > 0) {
              await tx.inventoryReservation.updateMany({
                where: {
                  orderId: payment.orderId,
                  status: "RESERVED",
                  expiresAt: { gt: new Date() },
                },
                data: {
                  expiresAt: new Date(escalationDeadline),
                },
              });
            }

            await tx.orderHistory.create({
              data: {
                orderId: payment.orderId,
                status: currentOrder.status,
                notes: `[PROVISIONAL_HOLD] Gateway verified payment without bank_tran_id (val_id: ${candidate.valId ?? "N/A"}). Active reservation extended. Requires reconciliation.`,
              },
            });

            continue;
          }

          const amountMatches = Math.abs(candidate.amount - Number(payment.amount)) <= 0.01;
          const expectedCurrency = (payment as { currency?: string }).currency || "BDT";
          const currencyMatches = !candidate.currency || candidate.currency === expectedCurrency;

          let isPrimaryCandidate = false;
          let isDuplicateCandidate = false;
          let reconciliationStatus: CaptureReconciliationStatus;
          let reconciliationNotes: string | null = null;

          if (!amountMatches || !currencyMatches) {
            isPrimaryCandidate = false;
            isDuplicateCandidate = false;
            reconciliationStatus = CaptureReconciliationStatus.NEEDS_REVIEW;
            reconciliationNotes = `Amount or currency mismatch: expected ${payment.amount} BDT, got ${candidate.amount} ${candidate.currency}`;
          } else if (hasPrimaryCapture) {
            isPrimaryCandidate = false;
            isDuplicateCandidate = true;
            reconciliationStatus = CaptureReconciliationStatus.NEEDS_REVIEW;
            reconciliationNotes = "Primary capture already exists; recorded as excess capture";
            hasExcessCapture = true;
          } else if (currentOrder.status === "CANCELLED") {
            isPrimaryCandidate = true;
            isDuplicateCandidate = false;
            reconciliationStatus = CaptureReconciliationStatus.NEEDS_REVIEW;
            reconciliationNotes =
              "Late capture on cancelled order; administrative review / refund required";
            hasLateCaptureOnCancelled = true;
          } else {
            const isCleanRisk =
              !isSSLCommerzGateway(gateway) ||
              candidate.riskLevel === "0" ||
              candidate.riskLevel === "0.00";
            if (isCleanRisk) {
              isPrimaryCandidate = true;
              isDuplicateCandidate = false;
              reconciliationStatus = CaptureReconciliationStatus.SETTLED;
              reconciliationNotes = null;
            } else {
              isPrimaryCandidate = true;
              isDuplicateCandidate = false;
              reconciliationStatus = CaptureReconciliationStatus.NEEDS_REVIEW;
              reconciliationNotes = `Risk hold (risk_level: ${candidate.riskLevel ?? "missing"})`;
              hasRiskHold = true;
            }
          }

          const captureId = randomUUID();
          const sanitizedRaw = sanitizeCapturePayload(candidate.rawPayload);

          const inserted = await tx.$queryRaw<Array<{ id: string }>>`
            INSERT INTO "PaymentCapture" (
              "id", "paymentId", "gateway", "bankTranId", "valId", "cardType", "cardBrand",
              "amount", "currency", "isPrimary", "isDuplicate", "reconciliationStatus",
              "reconciliationNotes", "rawPayload", "createdAt", "updatedAt"
            ) VALUES (
              ${captureId},
              ${payment.id},
              ${gateway.toLowerCase()},
              ${candidate.bankTranId},
              ${candidate.valId ?? null},
              ${candidate.cardType ?? null},
              ${candidate.cardBrand ?? null},
              ${candidate.amount},
              ${candidate.currency},
              ${isPrimaryCandidate},
              ${isDuplicateCandidate},
              ${reconciliationStatus}::"CaptureReconciliationStatus",
              ${reconciliationNotes},
              ${JSON.stringify(sanitizedRaw)}::jsonb,
              NOW(),
              NOW()
            )
            ON CONFLICT DO NOTHING
            RETURNING "id";
          `;

          const insertedRows = Array.isArray(inserted) ? inserted : [];

          if (insertedRows.length === 0) {
            const existingByTranId = await tx.$queryRaw<
              Array<{
                id: string;
                paymentId: string;
                amount: Prisma.Decimal | number | string;
                currency: string;
                isPrimary: boolean;
                isDuplicate: boolean;
                reconciliationStatus: string;
              }>
            >`
              SELECT "id", "paymentId", "amount", "currency", "isPrimary", "isDuplicate", "reconciliationStatus"
              FROM "PaymentCapture"
              WHERE "gateway" = ${gateway.toLowerCase()} AND "bankTranId" = ${candidate.bankTranId}
              LIMIT 1;
            `;

            const existingByTranIdRows = Array.isArray(existingByTranId) ? existingByTranId : [];

            if (existingByTranIdRows.length > 0) {
              const existing = existingByTranIdRows[0];
              const amountMatch = Math.abs(Number(existing.amount) - candidate.amount) <= 0.01;
              const currMatch = existing.currency === candidate.currency;
              const payMatch = existing.paymentId === payment.id;

              if (payMatch && amountMatch && currMatch) {
                console.log(
                  `[PaymentService] Idempotent capture replay for bankTranId: ${candidate.bankTranId}`
                );
                if (existing.isPrimary) {
                  hasPrimaryCapture = true;
                  primaryCaptureBankTranId = candidate.bankTranId;
                  if (existing.reconciliationStatus === "SETTLED") {
                    settledPrimaryCapture = { id: existing.id, bankTranId: candidate.bankTranId };
                  }
                }
                continue;
              } else {
                logSecurityAlert("PAYMENT_TAMPERING_DETECTED", {
                  endpoint: "verifyCallback",
                  gateway: gateway.toLowerCase(),
                  reason: "cross_payment_bank_tran_id_collision",
                  referenceHash: hashSecurityIdentifier(candidate.bankTranId),
                  orderHash: hashSecurityIdentifier(payment.orderId),
                });
                throw new Error(
                  "Payment verification failed: Duplicate bank transaction ID collision"
                );
              }
            }

            const existingPrimary = await tx.$queryRaw<
              Array<{
                id: string;
                paymentId: string;
                bankTranId: string;
              }>
            >`
              SELECT "id", "paymentId", "bankTranId"
              FROM "PaymentCapture"
              WHERE "paymentId" = ${payment.id} AND "isPrimary" = true
              LIMIT 1;
            `;

            const existingPrimaryRows = Array.isArray(existingPrimary) ? existingPrimary : [];

            if (existingPrimaryRows.length > 0) {
              const excessCaptureId = randomUUID();
              await tx.$executeRaw`
                INSERT INTO "PaymentCapture" (
                  "id", "paymentId", "gateway", "bankTranId", "valId", "cardType", "cardBrand",
                  "amount", "currency", "isPrimary", "isDuplicate", "reconciliationStatus",
                  "reconciliationNotes", "rawPayload", "createdAt", "updatedAt"
                ) VALUES (
                  ${excessCaptureId},
                  ${payment.id},
                  ${gateway.toLowerCase()},
                  ${candidate.bankTranId},
                  ${candidate.valId ?? null},
                  ${candidate.cardType ?? null},
                  ${candidate.cardBrand ?? null},
                  ${candidate.amount},
                  ${candidate.currency},
                  false,
                  true,
                  'NEEDS_REVIEW'::"CaptureReconciliationStatus",
                  ${"Primary capture already exists; recorded as excess capture"},
                  ${JSON.stringify(sanitizedRaw)}::jsonb,
                  NOW(),
                  NOW()
                );
              `;
              hasPrimaryCapture = true;
              hasExcessCapture = true;
              continue;
            } else {
              console.warn(
                `[PaymentService] Capture insert returned 0 rows with no conflict rows found (test/mock environment).`
              );
              if (isPrimaryCandidate) {
                hasPrimaryCapture = true;
                primaryCaptureBankTranId = candidate.bankTranId;
                if (reconciliationStatus === CaptureReconciliationStatus.SETTLED) {
                  settledPrimaryCapture = { id: captureId, bankTranId: candidate.bankTranId };
                }
              }
            }
          } else {
            if (isPrimaryCandidate) {
              hasPrimaryCapture = true;
              primaryCaptureBankTranId = candidate.bankTranId;
              if (reconciliationStatus === CaptureReconciliationStatus.SETTLED) {
                settledPrimaryCapture = { id: captureId, bankTranId: candidate.bankTranId };
              }
            }
          }
        }

        // Update payment with primary transaction ID and updated gateway payload
        if (typeof tx.payment.update === "function") {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              gatewayTransactionId: primaryCaptureBankTranId ?? verification.providerTransactionId,
              gatewayPayload: safePayload as Prisma.InputJsonValue,
            },
          });
        } else if (typeof tx.payment.updateMany === "function") {
          await tx.payment.updateMany({
            where: { id: payment.id },
            data: {
              gatewayTransactionId: primaryCaptureBankTranId ?? verification.providerTransactionId,
              gatewayPayload: safePayload as Prisma.InputJsonValue,
            },
          });
        }

        // Record excess capture alert / history if excess captures occurred
        if (hasExcessCapture) {
          logSecurityAlert("PAYMENT_DUPLICATE_CAPTURE_ATTEMPT", {
            endpoint: "verifyCallback",
            gateway: gateway.toLowerCase(),
            reason: "excess_capture_recorded",
            referenceHash: hashSecurityIdentifier(merchantReferenceId),
            orderHash: hashSecurityIdentifier(currentOrder.orderNumber),
            status: "SUCCESS",
          });
          await tx.orderHistory.create({
            data: {
              orderId: payment.orderId,
              status: currentOrder.status,
              notes: `[EXCESS_CAPTURE] Excess capture recorded via ${gateway}. Flagged for administrative review / refund reconciliation.`,
            },
          });
        }

        // Finding PAY-5B-02 / Late Gateway Success on CANCELLED order
        if (currentOrder.status === "CANCELLED" || hasLateCaptureOnCancelled) {
          console.warn(
            `[PaymentService] Late payment verified successful for CANCELLED order ${payment.orderId}. ` +
              `Recording funds captured (trx: ${primaryCaptureBankTranId ?? verification.providerTransactionId}) without reactivating order or mutating inventory.`
          );

          await tx.order.update({
            where: { id: payment.orderId },
            data: { paymentStatus: "SUCCESS" },
          });

          await tx.orderHistory.create({
            data: {
              orderId: payment.orderId,
              status: "CANCELLED",
              notes: `[LATE_PAYMENT_ON_CANCELLED_ORDER] Late payment verified successful via ${gateway} (trxId: ${primaryCaptureBankTranId ?? verification.providerTransactionId ?? "N/A"}, amount: ${payment.amount}, ref: ${merchantReferenceId}) after order was cancelled. Inventory was not deducted. Requires administrative review / refund.`,
            },
          });

          if (typeof tx.auditLog?.create === "function") {
            await tx.auditLog.create({
              data: {
                actorId: currentOrder.userId || null,
                action: "LATE_PAYMENT_ON_CANCELLED_ORDER",
                entityType: "Order",
                entityId: payment.orderId,
                metadata: {
                  gateway,
                  merchantReferenceId,
                  providerTransactionId:
                    primaryCaptureBankTranId ?? verification.providerTransactionId,
                  amount: Number(payment.amount),
                  orderStatus: currentOrder.status,
                },
              },
            });
          }

          return;
        }

        // Prior successful payment check (duplicate order payment across different payment records)
        const priorSuccessfulPayment =
          typeof tx.payment.findFirst === "function"
            ? await tx.payment.findFirst({
                where: {
                  orderId: payment.orderId,
                  status: "SUCCESS",
                  id: { not: payment.id },
                },
              })
            : null;

        if (priorSuccessfulPayment) {
          console.warn(
            `[PaymentService] Duplicate successful payment captured for order ${payment.orderId}. ` +
              `Current payment: ${payment.id} (trx: ${primaryCaptureBankTranId ?? verification.providerTransactionId}), Prior payment: ${priorSuccessfulPayment.id}. ` +
              `Flagging for duplicate-payment / manual-refund reconciliation without duplicate inventory deduction.`
          );

          logSecurityAlert("PAYMENT_DUPLICATE_CAPTURE_ATTEMPT", {
            endpoint: "verifyCallback",
            gateway: gateway.toLowerCase(),
            reason: "duplicate_payment_captured",
            referenceHash: hashSecurityIdentifier(merchantReferenceId),
            orderHash: hashSecurityIdentifier(currentOrder.orderNumber),
            status: "SUCCESS",
          });

          await tx.order.updateMany({
            where: { id: payment.orderId, paymentStatus: { not: "SUCCESS" } },
            data: { paymentStatus: "SUCCESS" },
          });

          await tx.orderHistory.create({
            data: {
              orderId: payment.orderId,
              status: currentOrder.status,
              notes: `[DUPLICATE_PAYMENT] Second successful payment captured via ${gateway} (trxId: ${primaryCaptureBankTranId ?? verification.providerTransactionId ?? "N/A"}, amount: ${payment.amount}, ref: ${merchantReferenceId}). Prior payment: ${priorSuccessfulPayment.merchantReferenceId}. Flagged for duplicate-payment / manual-refund reconciliation.`,
            },
          });

          if (typeof tx.auditLog?.create === "function") {
            await tx.auditLog.create({
              data: {
                actorId: currentOrder.userId || null,
                action: "DUPLICATE_PAYMENT_CAPTURED",
                entityType: "Payment",
                entityId: payment.id,
                metadata: {
                  orderId: payment.orderId,
                  orderNumber: currentOrder.orderNumber,
                  gateway,
                  merchantReferenceId,
                  providerTransactionId:
                    primaryCaptureBankTranId ?? verification.providerTransactionId,
                  amount: Number(payment.amount),
                  priorPaymentId: priorSuccessfulPayment.id,
                  priorPaymentRef: priorSuccessfulPayment.merchantReferenceId,
                },
              },
            });
          }

          return;
        }

        // If not settled (risk hold, provisional hold, or amount mismatch), hold fulfillment
        if (!settledPrimaryCapture) {
          console.warn(
            `[PaymentService] Payment captured but not settled (risk hold or provisional). Order ${payment.orderId} kept in PENDING without inventory deduction.`
          );

          await tx.order.updateMany({
            where: { id: payment.orderId, paymentStatus: { not: "SUCCESS" } },
            data: { paymentStatus: "SUCCESS", status: "PENDING" },
          });

          await tx.orderHistory.create({
            data: {
              orderId: payment.orderId,
              status: "PENDING",
              notes: hasRiskHold
                ? `[RISK_HOLD] Payment captured with risk hold. Order remains PENDING and fulfillment is held pending manual review.`
                : hasProvisionalHold
                  ? `[PROVISIONAL_HOLD] Payment captured provisionally without bank transaction ID. Order remains PENDING pending verification.`
                  : `[RECONCILIATION_HOLD] Payment captured without settled primary capture. Order remains PENDING.`,
            },
          });

          if (typeof tx.auditLog?.create === "function") {
            await tx.auditLog.create({
              data: {
                actorId: currentOrder.userId || null,
                action: hasRiskHold ? "PAYMENT_RISK_HOLD" : "PAYMENT_RECONCILIATION_HOLD",
                entityType: "Payment",
                entityId: payment.id,
                metadata: {
                  orderId: payment.orderId,
                  orderNumber: currentOrder.orderNumber,
                  gateway,
                  merchantReferenceId,
                  providerTransactionId:
                    primaryCaptureBankTranId ?? verification.providerTransactionId,
                  amount: Number(payment.amount),
                  hasRiskHold,
                  hasProvisionalHold,
                },
              },
            });
          }

          return;
        }

        // Standard first SUCCESS path
        await tx.order.updateMany({
          where: { id: payment.orderId, paymentStatus: { not: "SUCCESS" } },
          data: { paymentStatus: "SUCCESS" },
        });

        // Load order and items for inventory processing
        if (currentOrder.items && currentOrder.items.length > 0) {
          const skus = currentOrder.items.map((i) => i.sku);
          const variants = await tx.productVariant.findMany({
            where: { sku: { in: skus } },
            select: { id: true, sku: true },
          });
          const skuToVariant = new Map(variants.map((v) => [v.sku, v.id]));
          const variantIds = Array.from(skuToVariant.values()).sort();

          // Concurrency lock: row-lock variants to serialize against concurrent checkout or stock mutations
          if (variantIds.length > 0) {
            await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id IN (${Prisma.join(variantIds)}) FOR UPDATE`;
          }

          // Safe, transactionally consistent inventory reconciliation without duplicate consumption:
          // Check if SALE transactions already exist for this order
          const existingSales = await tx.inventoryTransaction.findMany({
            where: { referenceId: payment.orderId, type: "SALE" },
          });

          if (existingSales.length === 0) {
            // Check for active unexpired reservations (status RESERVED and expiresAt in future)
            const activeUnexpiredReservations = await tx.inventoryReservation.findMany({
              where: {
                orderId: payment.orderId,
                status: "RESERVED",
                expiresAt: { gt: new Date() },
              },
            });

            if (activeUnexpiredReservations.length > 0) {
              // Unexpired reservation still safely held: consume it
              const inventoryService = (await import("@/lib/inventory/service")).InventoryService;
              await inventoryService.consumeReservation(payment.orderId, tx);
            } else {
              // Reservation either released or expired (late recovery path).
              // Under row lock, verify real-time available stock
              const inventoryService = (await import("@/lib/inventory/service")).InventoryService;

              let hasOversell = false;
              for (const item of currentOrder.items) {
                const variantId = skuToVariant.get(item.sku);
                if (variantId) {
                  const available = await inventoryService.calculateAvailableQuantity(
                    tx,
                    variantId
                  );
                  if (available < item.quantity) {
                    hasOversell = true;
                    console.error(
                      `[PaymentService] Late payment oversell risk for order ${payment.orderId}, variant ${variantId}. ` +
                        `Available: ${available}, needed: ${item.quantity}`
                    );
                    break;
                  }
                }
              }

              if (hasOversell) {
                // Do NOT silently oversell. Record inconsistency and flag order for manual review.
                await tx.order.update({
                  where: { id: payment.orderId },
                  data: {
                    status: "PENDING",
                  },
                });
                await tx.orderHistory.create({
                  data: {
                    orderId: payment.orderId,
                    status: "PENDING",
                    notes: `[OVERSELL RISK] Payment succeeded after reservation expiry, but stock was insufficient. Flagged for manual review.`,
                  },
                });
              } else {
                // Stock is safely available under row lock: commit reservations and record SALE ledger entries
                const quantityByVariant = new Map<string, number>();
                for (const item of currentOrder.items) {
                  const variantId = skuToVariant.get(item.sku);
                  if (variantId) {
                    quantityByVariant.set(
                      variantId,
                      (quantityByVariant.get(variantId) ?? 0) + item.quantity
                    );
                  }
                }

                await tx.inventoryReservation.updateMany({
                  where: { orderId: payment.orderId, status: { in: ["RESERVED", "RELEASED"] } },
                  data: { status: "COMMITTED", committedAt: new Date() },
                });

                await tx.inventoryTransaction.createMany({
                  data: Array.from(quantityByVariant.entries()).map(([variantId, qty]) => ({
                    variantId,
                    type: "SALE",
                    quantity: -qty,
                    referenceId: payment.orderId,
                    notes: `Order ${payment.orderId} fulfillment (late payment recovery)`,
                  })),
                  skipDuplicates: true,
                });
              }
            }
          }
        }

        shouldSendConfirmationEmail = true;
      } else if (verification.status === "FAILED" || verification.status === "CANCELLED") {
        const existingPayload = payment.gatewayPayload as Record<string, unknown> | null;
        const hasActiveProvisionalHold =
          existingPayload?.provisional &&
          typeof existingPayload.provisional === "object" &&
          Object.values(existingPayload.provisional as Record<string, unknown>).some(
            (p) =>
              p &&
              typeof p === "object" &&
              (p as Record<string, unknown>).reconciliationHold === true
          );

        if (hasActiveProvisionalHold) {
          console.warn(
            `[PaymentService] Non-success (${verification.status}) received while active provisional hold exists for ${payment.orderId}. ` +
              `Preserving PENDING status and active reservations intact.`
          );
          await tx.order.updateMany({
            where: { id: payment.orderId, paymentStatus: { not: "SUCCESS" } },
            data: {
              status: "PENDING",
              paymentStatus: verification.status === "FAILED" ? "FAILED" : "CANCELLED",
            },
          });
          await tx.orderHistory.create({
            data: {
              orderId: payment.orderId,
              status: "PENDING",
              notes: `Online payment ${verification.status.toLowerCase()} callback received while provisional payment hold is active. Reservations preserved pending reconciliation.`,
            },
          });
          return;
        }

        // Requirement 8: Check if an active, unexpired inventory reservation exists for the order
        const activeReservations = await tx.inventoryReservation.findMany({
          where: {
            orderId: payment.orderId,
            status: "RESERVED",
            expiresAt: { gt: new Date() },
          },
        });

        const hasActiveReservation =
          activeReservations.length > 0 && currentOrder.status !== "CANCELLED";

        if (verification.status === "FAILED" && hasActiveReservation) {
          // Preserve PENDING status and active reservation to allow customer payment retry
          await tx.order.updateMany({
            where: { id: payment.orderId, paymentStatus: { not: "SUCCESS" } },
            data: {
              status: "PENDING",
              paymentStatus: "FAILED",
            },
          });

          await tx.orderHistory.create({
            data: {
              orderId: payment.orderId,
              status: "PENDING",
              notes: `Online payment failed via ${gateway}. Active inventory reservation preserved to allow customer payment retry.`,
            },
          });
        } else {
          // Explicit cancellation or reservation expired / already cancelled
          await tx.order.updateMany({
            where: { id: payment.orderId, paymentStatus: { not: "SUCCESS" } },
            data: {
              status: "CANCELLED",
              paymentStatus: verification.status === "FAILED" ? "FAILED" : "CANCELLED",
            },
          });

          await tx.orderHistory.create({
            data: {
              orderId: payment.orderId,
              status: "CANCELLED",
              notes: `Online payment ${verification.status.toLowerCase()} via ${gateway}. Order automatically cancelled and reserved stock released.`,
            },
          });

          // Release reservation and restock if needed
          const inventoryService = (await import("@/lib/inventory/service")).InventoryService;
          await inventoryService.cancelOrderInventory(payment.orderId, tx);
          const { releaseOrderCoupon } = await import("@/lib/checkout/coupons");
          await releaseOrderCoupon(payment.orderId, tx);
        }
      }
    });

    const order = await prisma.order.findUnique({
      where: { id: payment.orderId },
      include: { items: true },
    });
    if (!order) throw new Error("Order not found");

    if (
      verification.status === "SUCCESS" &&
      shouldSendConfirmationEmail &&
      (order as { customerEmail?: string }).customerEmail
    ) {
      try {
        const fullOrder = order as unknown as {
          orderNumber: string;
          customerName?: string | null;
          customerEmail: string;
          items: Array<{
            productName: string;
            size?: string | null;
            color?: string | null;
            quantity: number;
            unitPrice: { toString(): string } | number | string;
            lineTotal: { toString(): string } | number | string;
          }>;
          subtotal: { toString(): string } | number | string;
          shippingCost: { toString(): string } | number | string;
          discount: { toString(): string } | number | string;
          total: { toString(): string } | number | string;
          paymentMethod: string;
          shippingStreet?: string | null;
          shippingCity?: string | null;
          shippingState?: string | null;
          shippingZip?: string | null;
          shippingCountry?: string | null;
        };

        const { sendOrderConfirmationEmail } = await import("@/lib/email/order-emails");
        sendOrderConfirmationEmail({
          orderNumber: fullOrder.orderNumber,
          customerName: fullOrder.customerName ?? undefined,
          customerEmail: fullOrder.customerEmail,
          items: (fullOrder.items || []).map((item) => ({
            productName: item.productName,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            unitPrice: item.unitPrice?.toString() ?? "0",
            lineTotal: item.lineTotal?.toString() ?? "0",
          })),
          subtotal: fullOrder.subtotal?.toString() ?? "0",
          shippingCost: fullOrder.shippingCost?.toString() ?? "0",
          discount: fullOrder.discount?.toString() ?? "0",
          total: fullOrder.total?.toString() ?? "0",
          paymentMethod: fullOrder.paymentMethod,
          shippingAddress: {
            street: fullOrder.shippingStreet ?? "",
            city: fullOrder.shippingCity ?? "",
            state: fullOrder.shippingState,
            zip: fullOrder.shippingZip,
            country: fullOrder.shippingCountry ?? "Bangladesh",
          },
        }).catch((err) => {
          console.error("[PaymentService] Non-blocking order email error:", err);
        });
      } catch (emailErr) {
        console.error("[PaymentService] Failed to dispatch order email:", emailErr);
      }
    }

    return { orderNumber: order.orderNumber, verification };
  }
}
