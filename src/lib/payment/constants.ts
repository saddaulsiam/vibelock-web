export const PAYMENT_GATEWAY = {
  SSLCOMMERZ: "SSLCOMMERZ",
} as const;

export const PAYMENT_GATEWAYS = PAYMENT_GATEWAY;

export type PaymentGateway = (typeof PAYMENT_GATEWAY)[keyof typeof PAYMENT_GATEWAY];

/**
 * Returns true if the provided gateway identifier matches SSLCOMMERZ (case-insensitive).
 */
export function isSSLCommerzGateway(gateway: string | null | undefined): boolean {
  if (!gateway) return false;
  return gateway.trim().toUpperCase() === PAYMENT_GATEWAY.SSLCOMMERZ;
}

/**
 * Normalizes payment gateway strings to the canonical uppercase form if known.
 */
export function normalizePaymentGateway(gateway: string | null | undefined): string {
  if (!gateway) return "";
  const trimmed = gateway.trim();
  if (trimmed.toUpperCase() === PAYMENT_GATEWAY.SSLCOMMERZ) {
    return PAYMENT_GATEWAY.SSLCOMMERZ;
  }
  return trimmed;
}
