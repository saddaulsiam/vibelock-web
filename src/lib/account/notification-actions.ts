"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  type NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "./notification-types";

const notificationSchema = z.object({
  orderUpdates: z.boolean(),
  dropAlerts: z.boolean(),
  restockAlerts: z.boolean(),
  promoOffers: z.boolean(),
});

const COOKIE_NAME = "vibelock_notify_pref";

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(COOKIE_NAME)?.value;
    if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;
    const parsed = JSON.parse(raw);
    const valid = notificationSchema.safeParse(parsed);
    if (valid.success) return valid.data;
    return DEFAULT_NOTIFICATION_PREFERENCES;
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export async function updateNotificationPreferencesAction(input: unknown) {
  const parsed = notificationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid notification preferences." };
  }

  try {
    const cookieStore = await cookies();
    cookieStore.set({
      name: COOKIE_NAME,
      value: JSON.stringify(parsed.data),
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });

    revalidatePath("/account/profile");
    return { success: true };
  } catch (error) {
    console.error("[updateNotificationPreferencesAction] Error:", error);
    return { success: false, error: "Failed to save preferences." };
  }
}
