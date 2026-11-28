import "server-only";

import { z } from "zod";
import { getStoreSetting, STORE_SETTING_KEYS, updateStoreSetting } from "./store-settings-service";

export const NotificationSettingsSchema = z.object({
  smsProvider: z.enum(["BULKSMSBD", "GREENWEB", "REVE", "CUSTOM"]).default("BULKSMSBD"),
  senderId: z.string().min(1, "Sender ID is required").default("VibeLock"),
  smsApiKey: z.string().optional().default(""),
  smsApiUrl: z.string().optional().default(""),
  notifyOnOrderPlaced: z.boolean().default(true),
  notifyOnOrderDispatched: z.boolean().default(true),
  notifyOnOutForDelivery: z.boolean().default(true),
  notifyOnReturnApproved: z.boolean().default(true),
  adminAlertsEnabled: z.boolean().default(true),
  adminAlertRecipientPhone: z
    .string()
    .min(1, "Admin alert phone is required")
    .default("8801311333277"),
  adminAlertHighValueThreshold: z.coerce
    .number()
    .min(1000, "High-value threshold must be at least ৳1,000")
    .default(10000),
  adminAlertLowSmsBalanceWarning: z.boolean().default(true),
  enableCustomerOrderEmail: z.boolean().default(true),
  enableAdminOrderAlertEmail: z.boolean().default(true),
  adminNotificationEmail: z
    .string()
    .email("Valid admin email is required")
    .default("orders@vibelock.com"),
  supportReplyToEmail: z
    .string()
    .email("Valid reply-to email is required")
    .default("support@vibelock.com"),
});

export type NotificationSettings = z.output<typeof NotificationSettingsSchema>;

/**
 * Strategy A verified runtime defaults for notification settings.
 */
export function getDefaultNotificationSettings(): NotificationSettings {
  return {
    smsProvider: "BULKSMSBD",
    senderId: process.env.SMS_SENDER_ID || "VibeLock",
    smsApiKey: "",
    smsApiUrl: "",
    notifyOnOrderPlaced: true,
    notifyOnOrderDispatched: true,
    notifyOnOutForDelivery: true,
    notifyOnReturnApproved: true,
    adminAlertsEnabled: true,
    adminAlertRecipientPhone: "8801311333277",
    adminAlertHighValueThreshold: 10000,
    adminAlertLowSmsBalanceWarning: true,
    enableCustomerOrderEmail: true,
    enableAdminOrderAlertEmail: true,
    adminNotificationEmail: "orders@vibelock.com",
    supportReplyToEmail: process.env.SUPPORT_EMAIL || "support@vibelock.com",
  };
}

/**
 * Returns current notification settings with Strategy A fallback.
 */
export async function getNotificationSettings(): Promise<{
  settings: NotificationSettings;
  isPersisted: boolean;
  hasStore: boolean;
}> {
  const fallback = getDefaultNotificationSettings();
  const res = await getStoreSetting(
    STORE_SETTING_KEYS.NOTIFICATIONS,
    NotificationSettingsSchema,
    fallback
  );
  return {
    settings: res.data,
    isPersisted: res.isPersisted,
    hasStore: res.hasStore,
  };
}

/**
 * Updates notification settings with atomic audit logging.
 */
export async function updateNotificationSettings(
  settings: NotificationSettings,
  actorId?: string
): Promise<{ success: boolean; data?: NotificationSettings; error?: string }> {
  return updateStoreSetting(
    STORE_SETTING_KEYS.NOTIFICATIONS,
    settings,
    NotificationSettingsSchema,
    actorId,
    "SMS gateway credentials, customer order event switches, and store manager alerts"
  );
}

/**
 * Resolves effective SMS gateway credentials by inspecting database settings first, then env vars.
 */
export async function resolveEffectiveSmsCredentials(): Promise<{
  provider: string;
  senderId: string;
  apiKey: string;
  apiUrl: string;
  isConfigured: boolean;
}> {
  try {
    const { settings } = await getNotificationSettings();

    const apiKey = settings.smsApiKey?.trim() || process.env.SMS_API_KEY?.trim() || "";
    const apiUrl = settings.smsApiUrl?.trim() || process.env.SMS_API_URL?.trim() || "";
    const senderId = settings.senderId?.trim() || process.env.SMS_SENDER_ID?.trim() || "VibeLock";

    return {
      provider: settings.smsProvider,
      senderId,
      apiKey,
      apiUrl,
      isConfigured: Boolean(apiKey && apiUrl),
    };
  } catch {
    const apiKey = process.env.SMS_API_KEY?.trim() || "";
    const apiUrl = process.env.SMS_API_URL?.trim() || "";
    const senderId = process.env.SMS_SENDER_ID?.trim() || "VibeLock";

    return {
      provider: "BULKSMSBD",
      senderId,
      apiKey,
      apiUrl,
      isConfigured: Boolean(apiKey && apiUrl),
    };
  }
}

/**
 * Checks whether a specific transactional SMS event trigger is enabled.
 */
export async function isSmsEventEnabled(
  event: "order_placed" | "order_dispatched" | "out_for_delivery" | "return_approved"
): Promise<boolean> {
  try {
    const { settings } = await getNotificationSettings();
    switch (event) {
      case "order_placed":
        return settings.notifyOnOrderPlaced;
      case "order_dispatched":
        return settings.notifyOnOrderDispatched;
      case "out_for_delivery":
        return settings.notifyOnOutForDelivery;
      case "return_approved":
        return settings.notifyOnReturnApproved;
    }
  } catch {
    return true; // fail open for notifications
  }
}
