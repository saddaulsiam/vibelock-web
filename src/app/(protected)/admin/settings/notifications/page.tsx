import { requireRole } from "@/lib/auth/authorization";
import { getNotificationSettings } from "@/lib/settings/notification-settings";
import { NotificationSettingsForm } from "@/components/admin/settings/notification-settings-form";

export const dynamic = "force-dynamic";

export default async function AdminNotificationSettingsPage() {
  // Enforce ADMIN role
  await requireRole("ADMIN");

  const { settings } = await getNotificationSettings();

  return <NotificationSettingsForm initialSettings={settings} />;
}
