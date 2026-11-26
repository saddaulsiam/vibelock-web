import "server-only";

import { z } from "zod";
import { getStoreSetting, updateStoreSetting, STORE_SETTING_KEYS } from "./store-settings-service";
import { env } from "@/lib/config/env";

export const CheckoutSettingsSchema = z.object({
  minOrderValue: z.coerce.number().min(0, "Minimum order value cannot be negative").default(0),
  maxCodOrderValue: z.coerce.number().min(500, "Maximum COD ceiling must be at least ৳500").default(10000),
  requireCodAdvanceDeliveryCharge: z.boolean().default(false),
  codAdvanceInsideDhaka: z.coerce.number().min(0, "Inside Dhaka advance fee cannot be negative").default(100),
  codAdvanceOutsideDhaka: z.coerce.number().min(0, "Outside Dhaka advance fee cannot be negative").default(150),
  onlineReservationTtlMinutes: z.coerce
    .number()
    .min(5, "Reservation TTL must be at least 5 minutes")
    .max(120, "Reservation TTL cannot exceed 120 minutes")
    .default(15),
  enforceFirstTimeCodOtp: z.boolean().default(false),
  allowGuestCheckout: z.boolean().default(true),
  codOrderNotice: z
    .string()
    .default("Cash on Delivery orders are subject to telephonic verification before consignment dispatch."),
});

export type CheckoutSettings = z.output<typeof CheckoutSettingsSchema>;

/**
 * Strategy A verified runtime defaults for checkout policies.
 */
export function getDefaultCheckoutSettings(): CheckoutSettings {
  return {
    minOrderValue: 0,
    maxCodOrderValue: 10000,
    requireCodAdvanceDeliveryCharge: false,
    codAdvanceInsideDhaka: 100,
    codAdvanceOutsideDhaka: 150,
    onlineReservationTtlMinutes: Math.round((env.INVENTORY_RESERVATION_TTL_SECONDS || 900) / 60),
    enforceFirstTimeCodOtp: false,
    allowGuestCheckout: true,
    codOrderNotice: "Cash on Delivery orders are subject to telephonic verification before consignment dispatch.",
  };
}

/**
 * Returns current checkout settings with Strategy A fallback.
 */
export async function getCheckoutSettings(): Promise<{
  settings: CheckoutSettings;
  isPersisted: boolean;
  hasStore: boolean;
}> {
  const fallback = getDefaultCheckoutSettings();
  const res = await getStoreSetting(STORE_SETTING_KEYS.CHECKOUT, CheckoutSettingsSchema, fallback);
  return {
    settings: res.data,
    isPersisted: res.isPersisted,
    hasStore: res.hasStore,
  };
}

/**
 * Updates checkout settings with atomic audit logging.
 */
export async function updateCheckoutSettings(
  settings: CheckoutSettings,
  actorId?: string
): Promise<{ success: boolean; data?: CheckoutSettings; error?: string }> {
  return updateStoreSetting(
    STORE_SETTING_KEYS.CHECKOUT,
    settings,
    CheckoutSettingsSchema,
    actorId,
    "Checkout order minimums, COD fraud exposure ceilings, and inventory reservation TTL"
  );
}

/**
 * Returns effective reservation TTL in seconds for inventory locks.
 */
export async function getEffectiveReservationTtlSeconds(): Promise<number> {
  try {
    const { settings } = await getCheckoutSettings();
    return settings.onlineReservationTtlMinutes * 60;
  } catch {
    return env.INVENTORY_RESERVATION_TTL_SECONDS || 900;
  }
}

/**
 * Validates checkout constraints against active store policies.
 */
export async function validateOrderCheckoutPolicies(params: {
  total: number;
  paymentMethod: "COD" | "ONLINE" | "BKASH" | "PAYSTATION";
}): Promise<{ valid: boolean; error?: string }> {
  try {
    const { settings } = await getCheckoutSettings();

    // 1. Min order value check
    if (settings.minOrderValue > 0 && params.total < settings.minOrderValue) {
      return {
        valid: false,
        error: `Minimum order value for checkout is ৳${settings.minOrderValue}. Please add more items to your cart.`,
      };
    }

    // 2. Max COD ceiling check
    if (params.paymentMethod === "COD" && params.total > settings.maxCodOrderValue) {
      return {
        valid: false,
        error: `Cash on Delivery is limited to ৳${settings.maxCodOrderValue.toLocaleString()} per order to protect parcel consignment. For orders exceeding this amount, please select bKash or Online Payment.`,
      };
    }

    return { valid: true };
  } catch (err) {
    // Failsafe: if settings retrieval fails, do not block checkout, log error
    console.error("[CheckoutSettings] Failed to evaluate policies, proceeding with defaults:", err);
    return { valid: true };
  }
}
