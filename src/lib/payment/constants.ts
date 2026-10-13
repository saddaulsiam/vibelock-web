export const PAYMENT_GATEWAY = {
  SSLCOMMERZ: "SSLCOMMERZ",
  BKASH: "BKASH",
  NAGAD: "NAGAD",
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
 * Returns true if the provided gateway identifier matches BKASH (case-insensitive).
 */
export function isBkashGateway(gateway: string | null | undefined): boolean {
  if (!gateway) return false;
  return gateway.trim().toUpperCase() === PAYMENT_GATEWAY.BKASH;
}

/**
 * Returns true if the provided gateway identifier matches NAGAD (case-insensitive).
 */
export function isNagadGateway(gateway: string | null | undefined): boolean {
  if (!gateway) return false;
  return gateway.trim().toUpperCase() === PAYMENT_GATEWAY.NAGAD;
}

/**
 * Normalizes payment gateway strings to the canonical uppercase form if known.
 */
export function normalizePaymentGateway(gateway: string | null | undefined): string {
  if (!gateway) return "";
  const upper = gateway.trim().toUpperCase();
  if (upper === PAYMENT_GATEWAY.SSLCOMMERZ) {
    return PAYMENT_GATEWAY.SSLCOMMERZ;
  }
  if (upper === PAYMENT_GATEWAY.BKASH) {
    return PAYMENT_GATEWAY.BKASH;
  }
  if (upper === PAYMENT_GATEWAY.NAGAD) {
    return PAYMENT_GATEWAY.NAGAD;
  }
  return gateway.trim();
}
