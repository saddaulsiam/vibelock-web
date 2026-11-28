import "server-only";

import { z } from "zod";
import { getStoreSetting, STORE_SETTING_KEYS, updateStoreSetting } from "./store-settings-service";

// ============================================================================
// PHASE 6: TAX, VAT & INVOICING COMPLIANCE SCHEMA
// ============================================================================

export const TaxInvoiceSettingsSchema = z.object({
  // Tax / VAT Configuration
  enableTax: z.boolean().default(false),
  vatRatePercent: z.coerce
    .number()
    .min(0, "VAT rate cannot be negative")
    .max(30, "VAT rate cannot exceed 30%")
    .default(0),
  taxCalculationMode: z.enum(["INCLUSIVE", "EXCLUSIVE"]).default("INCLUSIVE"),
  applyTaxToShipping: z.boolean().default(false),

  // Business & Legal Entity Details (NBR Mushak 6.3)
  binNumber: z.string().optional().default("001234567-0101"),
  taxCircle: z.string().optional().default("Circle-15 (Uttara)"),
  taxZone: z.string().optional().default("Taxes Zone-08, Dhaka"),
  registeredBusinessName: z
    .string()
    .min(1, "Registered business name is required")
    .default("VibeLock Apparel Ltd."),
  registeredOfficeAddress: z
    .string()
    .min(1, "Registered office address is required")
    .default("House 12, Road 4, Sector 3, Uttara, Dhaka-1230, Bangladesh"),

  // Mushak 6.3 & Invoice Customization
  enableMushak63Format: z.boolean().default(true),
  invoicePrefix: z.string().min(1, "Invoice prefix is required").default("VL-INV-"),
  invoiceFooterNote: z
    .string()
    .min(1, "Footer note is required")
    .default(
      "Thank you for shopping with VibeLock. Computer-generated tax invoice issued in accordance with Rule 40 of VAT & SD Rules, 2016. No physical signature required."
    ),
  customerCareContact: z.string().default("+880 1311-333277 | support@vibelock.com"),
  showDigitalSeal: z.boolean().default(true),
});

export type TaxInvoiceSettings = z.output<typeof TaxInvoiceSettingsSchema>;

// ============================================================================
// DEFAULTS & STRATEGY A FALLBACK
// ============================================================================

export const DEFAULT_TAX_INVOICE_SETTINGS: TaxInvoiceSettings = {
  enableTax: false,
  vatRatePercent: 0,
  taxCalculationMode: "INCLUSIVE",
  applyTaxToShipping: false,
  binNumber: "001234567-0101",
  taxCircle: "Circle-15 (Uttara)",
  taxZone: "Taxes Zone-08, Dhaka",
  registeredBusinessName: "VibeLock Apparel Ltd.",
  registeredOfficeAddress: "House 12, Road 4, Sector 3, Uttara, Dhaka-1230, Bangladesh",
  enableMushak63Format: true,
  invoicePrefix: "VL-INV-",
  invoiceFooterNote:
    "Thank you for shopping with VibeLock. Computer-generated tax invoice issued in accordance with Rule 40 of VAT & SD Rules, 2016. No physical signature required.",
  customerCareContact: "+880 1311-333277 | support@vibelock.com",
  showDigitalSeal: true,
};

// ============================================================================
// DATA ACCESS & PERSISTENCE
// ============================================================================

/**
 * Retrieves effective tax and invoicing settings with Strategy A fallback.
 */
export async function getTaxInvoiceSettings(): Promise<{
  settings: TaxInvoiceSettings;
  isPersisted: boolean;
  hasStore: boolean;
}> {
  const res = await getStoreSetting<TaxInvoiceSettings>(
    STORE_SETTING_KEYS.TAX_INVOICE,
    TaxInvoiceSettingsSchema,
    DEFAULT_TAX_INVOICE_SETTINGS
  );
  return {
    settings: res.data,
    isPersisted: res.isPersisted,
    hasStore: res.hasStore,
  };
}

/**
 * Atomically updates tax and invoicing settings with AuditLog recording.
 */
export async function updateTaxInvoiceSettings(
  settings: TaxInvoiceSettings,
  actorId?: string
): Promise<{ success: boolean; data?: TaxInvoiceSettings; error?: string }> {
  return updateStoreSetting(
    STORE_SETTING_KEYS.TAX_INVOICE,
    settings,
    TaxInvoiceSettingsSchema,
    actorId,
    "VAT calculation rates, NBR BIN registration, Mushak 6.3 compliance, and invoice customization"
  );
}

// ============================================================================
// RUNTIME BUSINESS HELPERS
// ============================================================================

export interface TaxCalculationResult {
  taxRate: number;
  taxIncluded: boolean;
  taxAmount: number;
  taxableAmount: number;
  finalTotal: number;
}

/**
 * Calculates effective VAT / Tax amount according to store policy.
 */
export async function calculateEffectiveTax(params: {
  subtotal: number;
  shippingCost: number;
  customSettings?: TaxInvoiceSettings;
}): Promise<TaxCalculationResult> {
  const { subtotal, shippingCost, customSettings } = params;

  let settings = customSettings;
  if (!settings) {
    const loaded = await getTaxInvoiceSettings();
    settings = loaded.settings;
  }

  // If tax is disabled or rate is 0
  if (!settings.enableTax || settings.vatRatePercent <= 0) {
    return {
      taxRate: 0,
      taxIncluded: false,
      taxAmount: 0,
      taxableAmount: subtotal,
      finalTotal: subtotal + shippingCost,
    };
  }

  const rate = settings.vatRatePercent;
  const taxableBase = settings.applyTaxToShipping ? subtotal + shippingCost : subtotal;

  if (settings.taxCalculationMode === "INCLUSIVE") {
    // Retail prices already include VAT
    // Formula: tax = base - (base / (1 + rate / 100))
    const rawTax = taxableBase - taxableBase / (1 + rate / 100);
    const taxAmount = Math.round(rawTax * 100) / 100;
    return {
      taxRate: rate,
      taxIncluded: true,
      taxAmount,
      taxableAmount: taxableBase,
      finalTotal: subtotal + shippingCost, // Customer is not charged extra
    };
  } else {
    // EXCLUSIVE: VAT is added on top of the subtotal
    // Formula: tax = base * (rate / 100)
    const rawTax = taxableBase * (rate / 100);
    const taxAmount = Math.round(rawTax * 100) / 100;
    return {
      taxRate: rate,
      taxIncluded: false,
      taxAmount,
      taxableAmount: taxableBase,
      finalTotal: subtotal + shippingCost + taxAmount, // Customer pays subtotal + shipping + tax
    };
  }
}

/**
 * Formats a formatted legal Mushak 6.3 invoice number given an order identifier.
 */
export function formatMushakInvoiceNumber(orderNumber: string, prefix = "VL-INV-"): string {
  const cleanOrder = orderNumber.replace(/^ORD-?/i, "");
  return `${prefix}${cleanOrder}`;
}
