"use server";

import { requireRole } from "@/lib/auth/authorization";
import {
  TaxInvoiceSettingsSchema,
  updateTaxInvoiceSettings,
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

  const raw = {
    enableTax: formData.get("enableTax") === "true",
    vatRatePercent: formData.get("vatRatePercent"),
    taxCalculationMode: formData.get("taxCalculationMode")?.toString()?.trim() || "INCLUSIVE",
    applyTaxToShipping: formData.get("applyTaxToShipping") === "true",
    binNumber: formData.get("binNumber")?.toString()?.trim() || "",
    taxCircle: formData.get("taxCircle")?.toString()?.trim() || "",
    taxZone: formData.get("taxZone")?.toString()?.trim() || "",
    registeredBusinessName: formData.get("registeredBusinessName")?.toString()?.trim() || "VibeLock Apparel Ltd.",
    registeredOfficeAddress: formData.get("registeredOfficeAddress")?.toString()?.trim() || "",
    enableMushak63Format: formData.get("enableMushak63Format") === "true",
    invoicePrefix: formData.get("invoicePrefix")?.toString()?.trim() || "VL-INV-",
    invoiceFooterNote: formData.get("invoiceFooterNote")?.toString()?.trim() || "",
    customerCareContact: formData.get("customerCareContact")?.toString()?.trim() || "",
    showDigitalSeal: formData.get("showDigitalSeal") === "true",
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
