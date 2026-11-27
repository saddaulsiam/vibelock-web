import "server-only";

import { z } from "zod";
import { getStoreSetting, updateStoreSetting, STORE_SETTING_KEYS } from "./store-settings-service";
import { isDhakaCity } from "@/lib/shipping/pricing";

export const ShippingRulesSettingsSchema = z.object({
  enableFreeShipping: z.boolean().default(true),
  freeShippingThreshold: z.coerce
    .number()
    .min(500, "Free shipping threshold must be at least ৳500")
    .default(2500),
  freeShippingScope: z.enum(["NATIONWIDE", "INSIDE_DHAKA_ONLY"]).default("NATIONWIDE"),
  freeShippingBannerText: z
    .string()
    .default("Free standard delivery on all nationwide orders above ৳2,500!"),
  pickupHubName: z.string().min(1, "Pickup hub name is required").default("VibeLock Central Fulfillment Hub"),
  pickupAddress: z
    .string()
    .min(1, "Pickup address is required")
    .default("House 12, Road 4, Sector 3, Uttara, Dhaka-1230"),
  contactPerson: z.string().min(1, "Contact person is required").default("Operations Lead"),
  contactPhone: z.string().min(1, "Contact phone is required").default("8801311333277"),
  insideDhakaSla: z.string().default("24–48 Hours"),
  outsideDhakaSla: z.string().default("3–5 Business Days"),
  expressDhakaSla: z.string().default("Same-Day / 24 Hours"),
  primaryCourier: z.enum(["STEADFAST", "PATHAO", "MANUAL"]).default("STEADFAST"),
  autoCreateConsignment: z.boolean().default(false),
});

export type ShippingRulesSettings = z.output<typeof ShippingRulesSettingsSchema>;

/**
 * Strategy A verified runtime defaults for shipping rules.
 */
export function getDefaultShippingRulesSettings(): ShippingRulesSettings {
  return {
    enableFreeShipping: true,
    freeShippingThreshold: 2500,
    freeShippingScope: "NATIONWIDE",
    freeShippingBannerText: "Free standard delivery on all nationwide orders above ৳2,500!",
    pickupHubName: "VibeLock Central Fulfillment Hub",
    pickupAddress: "House 12, Road 4, Sector 3, Uttara, Dhaka-1230",
    contactPerson: "Operations Lead",
    contactPhone: "8801311333277",
    insideDhakaSla: "24–48 Hours",
    outsideDhakaSla: "3–5 Business Days",
    expressDhakaSla: "Same-Day / 24 Hours",
    primaryCourier: "STEADFAST",
    autoCreateConsignment: false,
  };
}

/**
 * Returns current shipping rules settings with Strategy A fallback.
 */
export async function getShippingRulesSettings(): Promise<{
  settings: ShippingRulesSettings;
  isPersisted: boolean;
  hasStore: boolean;
}> {
  const fallback = getDefaultShippingRulesSettings();
  const res = await getStoreSetting(STORE_SETTING_KEYS.SHIPPING, ShippingRulesSettingsSchema, fallback);
  return {
    settings: res.data,
    isPersisted: res.isPersisted,
    hasStore: res.hasStore,
  };
}

/**
 * Updates shipping rules settings with atomic audit logging.
 */
export async function updateShippingRulesSettings(
  settings: ShippingRulesSettings,
  actorId?: string
): Promise<{ success: boolean; data?: ShippingRulesSettings; error?: string }> {
  return updateStoreSetting(
    STORE_SETTING_KEYS.SHIPPING,
    settings,
    ShippingRulesSettingsSchema,
    actorId,
    "Free delivery incentive thresholds, default courier pickup hub, and delivery SLA promises"
  );
}

/**
 * Evaluates whether free shipping applies to a cart given its subtotal and delivery destination.
 */
export async function calculateEffectiveShippingFee(params: {
  subtotal: number;
  city?: string | null;
  state?: string | null;
  standardCost: number;
}): Promise<{
  cost: number;
  isFree: boolean;
  discountAmount: number;
  reason?: string;
}> {
  try {
    const { settings } = await getShippingRulesSettings();

    if (!settings.enableFreeShipping) {
      return {
        cost: params.standardCost,
        isFree: false,
        discountAmount: 0,
      };
    }

    if (params.subtotal < settings.freeShippingThreshold) {
      return {
        cost: params.standardCost,
        isFree: false,
        discountAmount: 0,
        reason: `Add ৳${(settings.freeShippingThreshold - params.subtotal).toFixed(0)} more to unlock free shipping!`,
      };
    }

    // Check scope constraints
    if (settings.freeShippingScope === "INSIDE_DHAKA_ONLY") {
      const isDhaka = isDhakaCity(params.city, params.state);
      if (!isDhaka) {
        return {
          cost: params.standardCost,
          isFree: false,
          discountAmount: 0,
          reason: "Free delivery applies to Dhaka Metro destinations only.",
        };
      }
    }

    // Free delivery unlocks
    return {
      cost: 0,
      isFree: true,
      discountAmount: params.standardCost,
      reason: "Free delivery applied!",
    };
  } catch (err) {
    console.error("[ShippingRules] Error calculating free shipping, falling back to standard rate:", err);
    return {
      cost: params.standardCost,
      isFree: false,
      discountAmount: 0,
    };
  }
}
