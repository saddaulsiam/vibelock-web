"use server";

import { requireRole } from "@/lib/auth/authorization";
import {
  CheckoutSettingsSchema,
  updateCheckoutSettings,
} from "@/lib/settings/checkout-settings";
import { revalidatePath } from "next/cache";

export interface CheckoutSettingsActionState {
  error: string | null;
  message?: string | null;
  fieldErrors?: Record<string, string[]>;
}

export async function updateCheckoutSettingsAction(
  _prevState: CheckoutSettingsActionState,
  formData: FormData
): Promise<CheckoutSettingsActionState> {
  const admin = await requireRole("ADMIN", { throw: true });

  const raw = {
    minOrderValue: formData.get("minOrderValue"),
    maxCodOrderValue: formData.get("maxCodOrderValue"),
    requireCodAdvanceDeliveryCharge: formData.get("requireCodAdvanceDeliveryCharge") === "true",
    codAdvanceInsideDhaka: formData.get("codAdvanceInsideDhaka"),
    codAdvanceOutsideDhaka: formData.get("codAdvanceOutsideDhaka"),
    onlineReservationTtlMinutes: formData.get("onlineReservationTtlMinutes"),
    enforceFirstTimeCodOtp: formData.get("enforceFirstTimeCodOtp") === "true",
    allowGuestCheckout: formData.get("allowGuestCheckout") === "true",
    codOrderNotice: formData.get("codOrderNotice")?.toString()?.trim() || "",
  };

  const parsed = CheckoutSettingsSchema.safeParse(raw);
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
      error: "Please correct the invalid checkout policy fields below.",
      fieldErrors,
    };
  }

  const result = await updateCheckoutSettings(parsed.data, admin.id);
  if (!result.success) {
    return {
      error: result.error || "Failed to update checkout and COD policy settings.",
    };
  }

  revalidatePath("/admin/settings/checkout");
  revalidatePath("/checkout");

  return {
    error: null,
    message: "Checkout policies, COD fraud ceilings, and inventory reservation TTL updated successfully.",
  };
}
