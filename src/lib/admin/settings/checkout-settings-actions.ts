"use server";

import { requireRole } from "@/lib/auth/authorization";
import {
  CheckoutSettingsSchema,
  updateCheckoutSettings,
  getCheckoutSettings,
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
  const { settings: current } = await getCheckoutSettings();

  const raw = {
    minOrderValue: formData.has("minOrderValue") ? formData.get("minOrderValue") : current.minOrderValue,
    maxCodOrderValue: formData.has("maxCodOrderValue") ? formData.get("maxCodOrderValue") : current.maxCodOrderValue,
    requireCodAdvanceDeliveryCharge: formData.has("requireCodAdvanceDeliveryCharge")
      ? formData.get("requireCodAdvanceDeliveryCharge") === "true"
      : current.requireCodAdvanceDeliveryCharge,
    codAdvanceInsideDhaka: formData.has("codAdvanceInsideDhaka")
      ? formData.get("codAdvanceInsideDhaka")
      : current.codAdvanceInsideDhaka,
    codAdvanceOutsideDhaka: formData.has("codAdvanceOutsideDhaka")
      ? formData.get("codAdvanceOutsideDhaka")
      : current.codAdvanceOutsideDhaka,
    onlineReservationTtlMinutes: formData.has("onlineReservationTtlMinutes")
      ? formData.get("onlineReservationTtlMinutes")
      : current.onlineReservationTtlMinutes,
    enforceFirstTimeCodOtp: formData.has("enforceFirstTimeCodOtp")
      ? formData.get("enforceFirstTimeCodOtp") === "true"
      : current.enforceFirstTimeCodOtp,
    allowGuestCheckout: formData.has("allowGuestCheckout")
      ? formData.get("allowGuestCheckout") === "true"
      : current.allowGuestCheckout,
    codOrderNotice: formData.has("codOrderNotice")
      ? formData.get("codOrderNotice")?.toString()?.trim() || ""
      : current.codOrderNotice,
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
