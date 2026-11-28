import { PaymentMethod, PaymentStatus } from "@prisma/client";

export type CaptureReconciliationStatus = "SETTLED" | "NEEDS_REVIEW" | "RESOLVED";
export const CaptureReconciliationStatus = {
  SETTLED: "SETTLED",
  NEEDS_REVIEW: "NEEDS_REVIEW",
  RESOLVED: "RESOLVED",
} as const;

export interface CaptureFulfillmentCheckTarget {
  isPrimary?: boolean;
  reconciliationStatus?: string | CaptureReconciliationStatus;
  [key: string]: unknown;
}

export interface PaymentFulfillmentCheckTarget {
  id?: string;
  status?: PaymentStatus | string;
  gatewayPayload?: unknown;
  captures?: CaptureFulfillmentCheckTarget[] | null;
  [key: string]: unknown;
}

export interface OrderFulfillmentCheckTarget {
  paymentMethod?: PaymentMethod | string;
  paymentStatus?: PaymentStatus | string;
  payments?: PaymentFulfillmentCheckTarget[] | null;
  [key: string]: unknown;
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
 * - Online orders must have authoritative payment records (payments array cannot be missing or empty).
 * - Online orders must have at least one confirmed successful payment record (status === "SUCCESS").
 * - Online orders with unresolved provisional holds (gatewayPayload.provisional with reconciliationHold: true) are BLOCKED.
 * - Online orders with PaymentCapture records must have at least one settled primary capture (isPrimary: true, reconciliationStatus: "SETTLED").
 * - Online orders with unreconciled primary capture (NEEDS_REVIEW / risk hold / amount mismatch) are BLOCKED.
 * - Online orders with confirmed successful payment and empty captures (legacy/non-capture gateways) are ELIGIBLE as long as no provisional/risk holds exist.
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
  if (payments.length === 0) {
    return {
      eligible: false,
      error: "Online orders must have authoritative payment records before fulfillment.",
    };
  }

  const hasSuccessfulPayment = payments.some((p) => p && p.status === "SUCCESS");
  if (!hasSuccessfulPayment) {
    return {
      eligible: false,
      error: "Online orders must have a confirmed successful payment record before fulfillment.",
    };
  }

  for (const payment of payments) {
    if (!payment) continue;

    // 1. Check for unresolved provisional holds in gatewayPayload
    const payload = payment.gatewayPayload as Record<string, unknown> | null;
    if (payload?.provisional && typeof payload.provisional === "object") {
      const provisionalEntries = Object.values(payload.provisional as Record<string, unknown>);
      const hasActiveProvisional = provisionalEntries.some(
        (p) =>
          p && typeof p === "object" && (p as Record<string, unknown>).reconciliationHold === true
      );
      if (hasActiveProvisional) {
        return {
          eligible: false,
          error: "Online payment has an unresolved provisional capture hold pending verification.",
        };
      }
    }

    // 2. Check PaymentCapture reconciliation state
    const captures = payment.captures ?? [];
    if (captures.length > 0) {
      const hasSettledPrimary = captures.some(
        (c) => c && c.isPrimary && c.reconciliationStatus === "SETTLED"
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
