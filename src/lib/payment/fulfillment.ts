import { PaymentMethod, PaymentStatus } from "@prisma/client";

export interface PaymentFulfillmentCheckTarget {
  id?: string;
  status: PaymentStatus;
  gatewayPayload?: unknown;
  captures?: Array<{
    isPrimary: boolean;
    reconciliationStatus: string;
  }>;
}

export interface OrderFulfillmentCheckTarget {
  paymentMethod: PaymentMethod | string;
  paymentStatus: PaymentStatus | string;
  payments?: PaymentFulfillmentCheckTarget[];
}

export interface FulfillmentEligibilityResult {
  eligible: boolean;
  error?: string;
}

/**
 * Shared authoritative online-payment fulfillment eligibility check.
 * Considers both PaymentCapture reconciliation state and unresolved gatewayPayload.provisional evidence.
 *
 * Rules:
 * - COD orders are always eligible for fulfillment advancement.
 * - Online orders must have order.paymentStatus === "SUCCESS".
 * - Online orders with unresolved provisional holds (gatewayPayload.provisional with reconciliationHold: true) are BLOCKED.
 * - Online orders with PaymentCapture records must have at least one settled primary capture (isPrimary: true, reconciliationStatus: "SETTLED").
 * - Online orders with unreconciled primary capture (NEEDS_REVIEW / risk hold / amount mismatch) are BLOCKED.
 */
export function checkOnlinePaymentFulfillmentEligibility(
  order: OrderFulfillmentCheckTarget
): FulfillmentEligibilityResult {
  if (order.paymentMethod !== "ONLINE") {
    return { eligible: true };
  }

  if (order.paymentStatus !== "SUCCESS") {
    return {
      eligible: false,
      error: "Online orders must be fully paid before fulfillment.",
    };
  }

  const payments = order.payments ?? [];

  for (const payment of payments) {
    // 1. Check for unresolved provisional holds in gatewayPayload
    const payload = payment.gatewayPayload as Record<string, unknown> | null;
    if (payload?.provisional && typeof payload.provisional === "object") {
      const provisionalEntries = Object.values(payload.provisional as Record<string, unknown>);
      const hasActiveProvisional = provisionalEntries.some(
        (p) =>
          p &&
          typeof p === "object" &&
          (p as Record<string, unknown>).reconciliationHold === true
      );
      if (hasActiveProvisional) {
        return {
          eligible: false,
          error:
            "Online payment has an unresolved provisional capture hold pending verification.",
        };
      }
    }

    // 2. Check PaymentCapture reconciliation state
    const captures = payment.captures ?? [];
    if (captures.length > 0) {
      const hasSettledPrimary = captures.some(
        (c) => c.isPrimary && c.reconciliationStatus === "SETTLED"
      );
      if (!hasSettledPrimary) {
        return {
          eligible: false,
          error:
            "Cannot advance order status: online payment has unreconciled primary capture or risk hold.",
        };
      }
    }
  }

  return { eligible: true };
}
