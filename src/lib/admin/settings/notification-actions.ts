"use server";

import { requireRole } from "@/lib/auth/authorization";
import {
  NotificationSettingsSchema,
  updateNotificationSettings,
} from "@/lib/settings/notification-settings";
import { revalidatePath } from "next/cache";

export interface NotificationActionState {
  error: string | null;
  message?: string | null;
  fieldErrors?: Record<string, string[]>;
}

export async function updateNotificationSettingsAction(
  _prevState: NotificationActionState,
  formData: FormData
): Promise<NotificationActionState> {
  const admin = await requireRole("ADMIN", { throw: true });

  const raw = {
    smsProvider: formData.get("smsProvider")?.toString()?.trim() || "BULKSMSBD",
    senderId: formData.get("senderId")?.toString()?.trim() || "VibeLock",
    smsApiKey: formData.get("smsApiKey")?.toString()?.trim() || "",
    smsApiUrl: formData.get("smsApiUrl")?.toString()?.trim() || "",
    notifyOnOrderPlaced: formData.get("notifyOnOrderPlaced") === "true",
    notifyOnOrderDispatched: formData.get("notifyOnOrderDispatched") === "true",
    notifyOnOutForDelivery: formData.get("notifyOnOutForDelivery") === "true",
    notifyOnReturnApproved: formData.get("notifyOnReturnApproved") === "true",
    adminAlertsEnabled: formData.get("adminAlertsEnabled") === "true",
    adminAlertRecipientPhone: formData.get("adminAlertRecipientPhone")?.toString()?.trim() || "8801311333277",
    adminAlertHighValueThreshold: formData.get("adminAlertHighValueThreshold"),
    adminAlertLowSmsBalanceWarning: formData.get("adminAlertLowSmsBalanceWarning") === "true",
    enableCustomerOrderEmail: formData.get("enableCustomerOrderEmail") === "true",
    enableAdminOrderAlertEmail: formData.get("enableAdminOrderAlertEmail") === "true",
    adminNotificationEmail: formData.get("adminNotificationEmail")?.toString()?.trim() || "orders@vibelock.com",
    supportReplyToEmail: formData.get("supportReplyToEmail")?.toString()?.trim() || "support@vibelock.com",
  };

  const parsed = NotificationSettingsSchema.safeParse(raw);
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
      error: "Please correct the invalid notification settings fields below.",
      fieldErrors,
    };
  }

  const result = await updateNotificationSettings(parsed.data, admin.id);
  if (!result.success) {
    return {
      error: result.error || "Failed to update notification settings.",
    };
  }

  revalidatePath("/admin/settings/notifications");

  return {
    error: null,
    message: "SMS gateway routing, transactional event switches, and store alerts updated successfully.",
  };
}
