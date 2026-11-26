import "server-only";

import { getStoreSetting, updateStoreSetting, STORE_SETTING_KEYS } from "./store-settings-service";
import { z } from "zod";

// ============================================================================
// PHASE 5: INVENTORY INTELLIGENCE & RETURN POLICIES SCHEMA
// ============================================================================

export const InventoryReturnSettingsSchema = z.object({
  // Inventory Intelligence & Thresholds
  lowStockThreshold: z.coerce
    .number()
    .int("Low stock threshold must be an integer")
    .min(1, "Threshold must be at least 1 unit")
    .max(500, "Threshold cannot exceed 500 units")
    .default(5),
  criticalStockThreshold: z.coerce
    .number()
    .int("Critical stock threshold must be an integer")
    .min(0, "Threshold cannot be negative")
    .max(100, "Critical threshold cannot exceed 100 units")
    .default(2),
  allowBackorders: z.boolean().default(false),
  autoHideOutOfStock: z.boolean().default(false),
  notifyLowStockEmail: z.boolean().default(true),
  lowStockNotificationEmail: z
    .string()
    .email("Enter a valid admin email for low-stock alerts")
    .optional()
    .or(z.literal(""))
    .default("inventory@vibelock.com"),

  // Return Policy Governance
  returnWindowDays: z.coerce
    .number()
    .int("Return window must be an integer")
    .min(0, "Return window cannot be negative (0 to disable returns)")
    .max(90, "Return window cannot exceed 90 days")
    .default(7),
  requirePhotoProofOnDefect: z.boolean().default(true),
  allowPartialReturns: z.boolean().default(true),
  nonReturnableCategories: z
    .array(z.string().min(1, "Category cannot be empty"))
    .default(["Underwear", "Swimwear", "Clearance", "Earrings", "Socks"]),

  // Return Fee Governance & Restocking
  deductShippingFeeFromRefund: z.boolean().default(true),
  returnProcessingFee: z.coerce
    .number()
    .min(0, "Processing fee cannot be negative")
    .max(5000, "Processing fee cannot exceed 5,000 BDT")
    .default(0),
  autoRestockCompletedReturns: z.boolean().default(false),
  restockLocation: z
    .string()
    .min(1, "Restock warehouse location is required")
    .default("Uttara Central Warehouse"),
});

export type InventoryReturnSettings = z.output<typeof InventoryReturnSettingsSchema>;

// ============================================================================
// DEFAULTS & STRATEGY A FALLBACK
// ============================================================================

export const DEFAULT_INVENTORY_RETURN_SETTINGS: InventoryReturnSettings = {
  lowStockThreshold: 5,
  criticalStockThreshold: 2,
  allowBackorders: false,
  autoHideOutOfStock: false,
  notifyLowStockEmail: true,
  lowStockNotificationEmail: "inventory@vibelock.com",
  returnWindowDays: 7,
  requirePhotoProofOnDefect: true,
  allowPartialReturns: true,
  nonReturnableCategories: ["Underwear", "Swimwear", "Clearance", "Earrings", "Socks"],
  deductShippingFeeFromRefund: true,
  returnProcessingFee: 0,
  autoRestockCompletedReturns: false,
  restockLocation: "Uttara Central Warehouse",
};

// ============================================================================
// DATA ACCESS & PERSISTENCE
// ============================================================================

/**
 * Retrieves effective inventory and return policies.
 * Falls back to DEFAULT_INVENTORY_RETURN_SETTINGS if unmigrated or unconfigured.
 */
export async function getInventoryReturnSettings(): Promise<{
  settings: InventoryReturnSettings;
  isPersisted: boolean;
  hasStore: boolean;
}> {
  const res = await getStoreSetting<InventoryReturnSettings>(
    STORE_SETTING_KEYS.POLICIES,
    InventoryReturnSettingsSchema,
    DEFAULT_INVENTORY_RETURN_SETTINGS
  );
  return {
    settings: res.data,
    isPersisted: res.isPersisted,
    hasStore: res.hasStore,
  };
}

/**
 * Atomically saves inventory and return policies within a transaction with an immutable AuditLog.
 */
export async function updateInventoryReturnSettings(
  settings: InventoryReturnSettings,
  actorId?: string
): Promise<{ success: boolean; data?: InventoryReturnSettings; error?: string }> {
  return updateStoreSetting(
    STORE_SETTING_KEYS.POLICIES,
    settings,
    InventoryReturnSettingsSchema,
    actorId,
    "Inventory intelligence thresholds, customer return policies, and warehouse restocking rules"
  );
}

// ============================================================================
// RUNTIME BUSINESS HELPERS
// ============================================================================

/**
 * Resolves the effective return window days from database or fallback.
 */
export async function getEffectiveReturnWindowDays(): Promise<number> {
  const { settings } = await getInventoryReturnSettings();
  return settings.returnWindowDays;
}

/**
 * Resolves the effective global low-stock threshold.
 */
export async function getEffectiveLowStockThreshold(): Promise<number> {
  const { settings } = await getInventoryReturnSettings();
  return settings.lowStockThreshold;
}

/**
 * Checks whether a given product category is returnable under active store policy.
 */
export function isCategoryReturnable(
  categoryName: string | null | undefined,
  settings: InventoryReturnSettings
): boolean {
  if (!categoryName) return true;
  const normalizedCategory = categoryName.trim().toLowerCase();
  const prohibitedList = settings.nonReturnableCategories.map((c) => c.trim().toLowerCase());
  return !prohibitedList.includes(normalizedCategory);
}

/**
 * Calculates net return refund amount deducting courier shipping and processing fee if configured.
 */
export function calculateReturnRefundAmount(params: {
  itemTotal: number;
  originalShippingCost: number;
  settings: InventoryReturnSettings;
}): {
  netRefundAmount: number;
  deductedShippingFee: number;
  deductedProcessingFee: number;
  originalTotal: number;
} {
  const { itemTotal, originalShippingCost, settings } = params;
  let deductedShipping = 0;
  let deductedProcessing = 0;

  if (settings.deductShippingFeeFromRefund && originalShippingCost > 0) {
    deductedShipping = originalShippingCost;
  }

  if (settings.returnProcessingFee > 0) {
    deductedProcessing = settings.returnProcessingFee;
  }

  const totalDeductions = deductedShipping + deductedProcessing;
  const netRefundAmount = Math.max(0, itemTotal - totalDeductions);

  return {
    netRefundAmount,
    deductedShippingFee: deductedShipping,
    deductedProcessingFee: deductedProcessing,
    originalTotal: itemTotal,
  };
}
