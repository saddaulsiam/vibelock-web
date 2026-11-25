import crypto from "node:crypto";

export type OrderSalesChannel = "WEBSITE" | "POS";

export const MAX_ORDER_NUMBER_COLLISION_RETRIES = 5;

/**
 * Generates an 8-digit random integer where the first digit is strictly 1–9.
 * Range: 10,000,000 to 99,999,999 (90 million possible values).
 * Cryptographically secure via Node crypto.randomInt.
 */
export function generateRandom8Digits(): number {
  return crypto.randomInt(10_000_000, 100_000_000);
}

/**
 * Generates a customer-facing Website order number:
 * Format: VL-XXXXXXXX (e.g. VL-83910275)
 * - Prefix: "VL-"
 * - Exactly 8 numeric digits
 * - First digit 1–9 (no leading zero)
 * - Total length: 11 characters
 */
export function generateWebsiteOrderNumber(): string {
  return `VL-${generateRandom8Digits()}`;
}

/**
 * Generates a POS counter order number:
 * Format: VL-POS-XXXXXXXX (e.g. VL-POS-58391027)
 * - Prefix: "VL-POS-"
 * - Exactly 8 numeric digits
 * - First digit 1–9 (no leading zero)
 * - Total length: 15 characters
 */
export function generatePosOrderNumber(): string {
  return `VL-POS-${generateRandom8Digits()}`;
}

/**
 * Channel-aware generator. Defaults to WEBSITE.
 */
export function generateOrderNumber(channel: OrderSalesChannel = "WEBSITE"): string {
  return channel === "POS" ? generatePosOrderNumber() : generateWebsiteOrderNumber();
}

/**
 * Validates whether an order number conforms to the WEBSITE format:
 * ^VL-[1-9][0-9]{7}$
 */
export function isValidWebsiteOrderNumber(orderNumber: string): boolean {
  return typeof orderNumber === "string" && /^VL-[1-9][0-9]{7}$/.test(orderNumber);
}

/**
 * Validates whether an order number conforms to the POS format:
 * ^VL-POS-[1-9][0-9]{7}$
 */
export function isValidPosOrderNumber(orderNumber: string): boolean {
  return typeof orderNumber === "string" && /^VL-POS-[1-9][0-9]{7}$/.test(orderNumber);
}

/**
 * Validates whether an order number conforms to either active format.
 */
export function isValidOrderNumber(orderNumber: string): boolean {
  return isValidWebsiteOrderNumber(orderNumber) || isValidPosOrderNumber(orderNumber);
}

/**
 * Checks if a database error is specifically a unique constraint collision on `Order.orderNumber`.
 * Handles Prisma P2002 with target metadata or message inspection.
 * Returns false for non-P2002 errors or collisions on other unique fields (e.g., checkoutIdempotencyKey, email).
 */
export function isOrderNumberCollision(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  const prismaCode = (error as { code?: unknown }).code;
  if (prismaCode !== "P2002") return false;

  const meta = (error as { meta?: { target?: unknown } }).meta;
  const target = meta?.target;

  if (Array.isArray(target)) {
    if (
      target.some(
        (t) =>
          typeof t === "string" &&
          (t.includes("orderNumber") || t.includes("Order_orderNumber_key"))
      )
    ) {
      return true;
    }
  } else if (typeof target === "string") {
    if (target.includes("orderNumber") || target.includes("Order_orderNumber_key")) {
      return true;
    }
  }

  const message = (error as { message?: unknown }).message;
  if (
    typeof message === "string" &&
    (message.includes("orderNumber") || message.includes("Order_orderNumber_key"))
  ) {
    return true;
  }

  return false;
}
