"use server";

import { requireRole } from "@/lib/auth/authorization";
import {
  getNotificationSettings,
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
  const { settings: current } = await getNotificationSettings();

  const raw = {
    smsProvider: formData.has("smsProvider")
      ? formData.get("smsProvider")?.toString()?.trim() || "BULKSMSBD"
      : current.smsProvider,
    senderId: formData.has("senderId")
      ? formData.get("senderId")?.toString()?.trim() || "VibeLock"
      : current.senderId,
    smsApiKey: formData.has("smsApiKey")
      ? formData.get("smsApiKey")?.toString()?.trim() || ""
      : current.smsApiKey,
    smsApiUrl: formData.has("smsApiUrl")
      ? formData.get("smsApiUrl")?.toString()?.trim() || ""
      : current.smsApiUrl,
    notifyOnOrderPlaced: formData.has("notifyOnOrderPlaced")
      ? formData.get("notifyOnOrderPlaced") === "true"
      : current.notifyOnOrderPlaced,
    notifyOnOrderDispatched: formData.has("notifyOnOrderDispatched")
      ? formData.get("notifyOnOrderDispatched") === "true"
      : current.notifyOnOrderDispatched,
    notifyOnOutForDelivery: formData.has("notifyOnOutForDelivery")
      ? formData.get("notifyOnOutForDelivery") === "true"
      : current.notifyOnOutForDelivery,
    notifyOnReturnApproved: formData.has("notifyOnReturnApproved")
      ? formData.get("notifyOnReturnApproved") === "true"
      : current.notifyOnReturnApproved,
    adminAlertsEnabled: formData.has("adminAlertsEnabled")
      ? formData.get("adminAlertsEnabled") === "true"
      : current.adminAlertsEnabled,
    adminAlertRecipientPhone: formData.has("adminAlertRecipientPhone")
      ? formData.get("adminAlertRecipientPhone")?.toString()?.trim() || "8801311333277"
      : current.adminAlertRecipientPhone,
    adminAlertHighValueThreshold: formData.has("adminAlertHighValueThreshold")
      ? formData.get("adminAlertHighValueThreshold")
      : current.adminAlertHighValueThreshold,
    adminAlertLowSmsBalanceWarning: formData.has("adminAlertLowSmsBalanceWarning")
      ? formData.get("adminAlertLowSmsBalanceWarning") === "true"
      : current.adminAlertLowSmsBalanceWarning,
    enableCustomerOrderEmail: formData.has("enableCustomerOrderEmail")
      ? formData.get("enableCustomerOrderEmail") === "true"
      : current.enableCustomerOrderEmail,
    enableAdminOrderAlertEmail: formData.has("enableAdminOrderAlertEmail")
      ? formData.get("enableAdminOrderAlertEmail") === "true"
      : current.enableAdminOrderAlertEmail,
    adminNotificationEmail: formData.has("adminNotificationEmail")
      ? formData.get("adminNotificationEmail")?.toString()?.trim() || "orders@vibelock.com"
      : current.adminNotificationEmail,
    supportReplyToEmail: formData.has("supportReplyToEmail")
      ? formData.get("supportReplyToEmail")?.toString()?.trim() || "support@vibelock.com"
      : current.supportReplyToEmail,
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
    message:
      "SMS gateway routing, transactional event switches, and store alerts updated successfully.",
  };
}
