import prisma from "@/lib/prisma/client";
import { PaymentInitiationResponse, PaymentProvider } from "./types";
import { SSLCommerzProvider } from "./providers/sslcommerz/client";
import { BkashProvider } from "./providers/bkash/client";
import { NagadProvider } from "./providers/nagad/client";
import { Order, PaymentStatus, Prisma } from "@prisma/client";
import {
  isSSLCommerzGateway,
  isBkashGateway,
  isNagadGateway,
  normalizePaymentGateway,
} from "./constants";
import { logSecurityAlert, hashSecurityIdentifier } from "@/lib/monitoring/security-logger";

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

      // Check for active INITIATED payment across ALL gateways within reservation TTL window (15 mins)
      const existingInitiated = await tx.payment.findFirst({
        where: {
          orderId: order.id,
          status: "INITIATED",
          createdAt: { gt: new Date(Date.now() - 15 * 60 * 1000) },
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
        } else {
          // Different gateway: safely cancel the old active session across other gateways
          await tx.payment.updateMany({
            where: {
              orderId: order.id,
              status: "INITIATED",
              gateway: { not: normalizedGateway },
            },
            data: {
              status: "CANCELLED",
              gatewayPayload: {
                cancellationReason: `Superseded by new payment initiation via ${normalizedGateway}`,
              },
            },
          });
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

        if (latestOrder?.paymentStatus === "SUCCESS" || latestOrder?.status === "CANCELLED") {
          // Order was paid or cancelled while external call was in flight
          await tx.payment.update({
            where: { id: placeholderId },
            data: {
              status: "CANCELLED",
              merchantReferenceId: response.merchantReferenceId,
              gatewayPayload: {
                redirectUrl: response.redirectUrl,
                cancellationReason: `Order transitioned to ${latestOrder.status}/${latestOrder.paymentStatus} during initiation`,
              },
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
              redirectUrl: response.redirectUrl,
            },
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
        incomingStatus === "UNATTEMPTED";

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

    // If verification was successful but the verified amount does not match, log error and fail securely.
    if (verification.success && verification.status === "SUCCESS") {
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

        const safePayload = { ...(verification.rawPayload as object) } as Record<string, unknown>;
        delete safePayload.store_passwd;
        delete safePayload.store_id;
        delete safePayload.password;
        delete safePayload.app_secret;
        delete safePayload.app_key;
        delete safePayload.id_token;
        delete safePayload.refreshToken;
        delete safePayload.token;
        delete safePayload.sensitiveData;
        delete safePayload.signature;
        delete safePayload.merchantPrivateKey;
        delete safePayload.pgPublicKey;

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
      // Clean payload
      const safePayload = { ...(verification.rawPayload as object) } as Record<string, unknown>;
      delete safePayload.store_passwd;
      delete safePayload.store_id;
      delete safePayload.password;
      delete safePayload.app_secret;
      delete safePayload.app_key;
      delete safePayload.id_token;
      delete safePayload.refreshToken;
      delete safePayload.token;
      delete safePayload.sensitiveData;
      delete safePayload.signature;
      delete safePayload.merchantPrivateKey;
      delete safePayload.pgPublicKey;

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
        // Finding PAY-5B-02 / Requirement 1: Late Gateway Success on CANCELLED order
        // Never silently reactivate a cancelled order, never mutate or deduct inventory.
        if (currentOrder.status === "CANCELLED") {
          console.warn(
            `[PaymentService] Late payment verified successful for CANCELLED order ${payment.orderId}. ` +
              `Recording funds captured (trx: ${verification.providerTransactionId}) without reactivating order or mutating inventory.`
          );

          await tx.order.update({
            where: { id: payment.orderId },
            data: { paymentStatus: "SUCCESS" },
          });

          await tx.orderHistory.create({
            data: {
              orderId: payment.orderId,
              status: "CANCELLED",
              notes: `[LATE_PAYMENT_ON_CANCELLED_ORDER] Late payment verified successful via ${gateway} (trxId: ${verification.providerTransactionId ?? "N/A"}, amount: ${payment.amount}, ref: ${merchantReferenceId}) after order was cancelled. Inventory was not deducted. Requires administrative review / refund.`,
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
                  providerTransactionId: verification.providerTransactionId,
                  amount: Number(payment.amount),
                  orderStatus: currentOrder.status,
                },
              },
            });
          }

          return;
        }

        // Finding PAY-5B-03 / Requirement 3: Second successful gateway payment (Duplicate payment)
        // Record funds as captured, flag for manual refund reconciliation, never deduct inventory twice.
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
              `Current payment: ${payment.id} (trx: ${verification.providerTransactionId}), Prior payment: ${priorSuccessfulPayment.id}. ` +
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
              notes: `[DUPLICATE_PAYMENT] Second successful payment captured via ${gateway} (trxId: ${verification.providerTransactionId ?? "N/A"}, amount: ${payment.amount}, ref: ${merchantReferenceId}). Prior payment: ${priorSuccessfulPayment.merchantReferenceId}. Flagged for duplicate-payment / manual-refund reconciliation.`,
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
                  providerTransactionId: verification.providerTransactionId,
                  amount: Number(payment.amount),
                  priorPaymentId: priorSuccessfulPayment.id,
                  priorPaymentRef: priorSuccessfulPayment.merchantReferenceId,
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
        if (currentOrder.items.length > 0) {
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
