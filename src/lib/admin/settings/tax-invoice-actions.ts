"use server";

import { requireRole } from "@/lib/auth/authorization";
import {
  TaxInvoiceSettingsSchema,
  updateTaxInvoiceSettings,
  getTaxInvoiceSettings,
} from "@/lib/settings/tax-invoice-settings";
import { revalidatePath } from "next/cache";

export interface TaxInvoiceActionState {
  error: string | null;
  message?: string | null;
  fieldErrors?: Record<string, string[]>;
}

export async function updateTaxInvoiceSettingsAction(
  _prevState: TaxInvoiceActionState,
  formData: FormData
): Promise<TaxInvoiceActionState> {
  const admin = await requireRole("ADMIN", { throw: true });
  const { settings: current } = await getTaxInvoiceSettings();

  const raw = {
    enableTax: formData.has("enableTax") ? formData.get("enableTax") === "true" : current.enableTax,
    vatRatePercent: formData.has("vatRatePercent") ? formData.get("vatRatePercent") : current.vatRatePercent,
    taxCalculationMode: formData.has("taxCalculationMode")
      ? formData.get("taxCalculationMode")?.toString()?.trim() || "INCLUSIVE"
      : current.taxCalculationMode,
    applyTaxToShipping: formData.has("applyTaxToShipping")
      ? formData.get("applyTaxToShipping") === "true"
      : current.applyTaxToShipping,
    binNumber: formData.has("binNumber") ? formData.get("binNumber")?.toString()?.trim() || "" : current.binNumber,
    taxCircle: formData.has("taxCircle") ? formData.get("taxCircle")?.toString()?.trim() || "" : current.taxCircle,
    taxZone: formData.has("taxZone") ? formData.get("taxZone")?.toString()?.trim() || "" : current.taxZone,
    registeredBusinessName: formData.has("registeredBusinessName")
      ? formData.get("registeredBusinessName")?.toString()?.trim() || "VibeLock Apparel Ltd."
      : current.registeredBusinessName,
    registeredOfficeAddress: formData.has("registeredOfficeAddress")
      ? formData.get("registeredOfficeAddress")?.toString()?.trim() || ""
      : current.registeredOfficeAddress,
    enableMushak63Format: formData.has("enableMushak63Format")
      ? formData.get("enableMushak63Format") === "true"
      : current.enableMushak63Format,
    invoicePrefix: formData.has("invoicePrefix")
      ? formData.get("invoicePrefix")?.toString()?.trim() || "VL-INV-"
      : current.invoicePrefix,
    invoiceFooterNote: formData.has("invoiceFooterNote")
      ? formData.get("invoiceFooterNote")?.toString()?.trim() || ""
      : current.invoiceFooterNote,
    customerCareContact: formData.has("customerCareContact")
      ? formData.get("customerCareContact")?.toString()?.trim() || ""
      : current.customerCareContact,
    showDigitalSeal: formData.has("showDigitalSeal")
      ? formData.get("showDigitalSeal") === "true"
      : current.showDigitalSeal,
  };

  const parsed = TaxInvoiceSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(issue.message);
    }
    return {
      error: "Please correct the invalid tax and invoicing configuration fields below.",
      fieldErrors,
    };
  }

  const result = await updateTaxInvoiceSettings(parsed.data, admin.id);
  if (!result.success) {
    return {
      error: result.error || "Failed to update tax and invoicing configuration.",
    };
  }

  revalidatePath("/admin/settings/invoicing");
  revalidatePath("/checkout");
  revalidatePath("/cart");

  return {
    error: null,
    message: "VAT calculation rules, NBR BIN information, and Mushak 6.3 invoice settings updated successfully.",
  };
}
