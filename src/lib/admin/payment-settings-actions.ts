"use server";

import { requireRole } from "@/lib/auth/authorization";
import {
  updatePaymentMethodSetting,
  type PaymentMethodCode,
} from "@/lib/settings/payment-settings";

export interface PaymentSettingActionState {
  error: string | null;
  message?: string | null;
}

export async function togglePaymentMethodAction(
  _prevState: PaymentSettingActionState,
  formData: FormData
): Promise<PaymentSettingActionState> {
  const admin = await requireRole("ADMIN", { throw: true });

  const rawCode = formData.get("code")?.toString()?.trim()?.toUpperCase();
  const rawEnabled = formData.get("enabled")?.toString();

  if (!rawCode || (rawCode !== "COD" && rawCode !== "SSLCOMMERZ" && rawCode !== "BKASH" && rawCode !== "NAGAD")) {
    return { error: "Invalid payment method code." };
  }

  const isEnabled = rawEnabled === "true";

  const result = await updatePaymentMethodSetting(
    rawCode as PaymentMethodCode,
    isEnabled,
    admin.id
  );

  if (!result.success) {
    return { error: result.error || "Failed to update payment setting." };
  }

  return {
    error: null,
    message: `Payment method ${rawCode} is now ${isEnabled ? "enabled" : "disabled"}.`,
  };
}
