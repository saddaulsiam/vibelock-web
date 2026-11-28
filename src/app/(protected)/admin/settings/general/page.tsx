import { GeneralSettingsForm } from "@/components/admin/settings/general-settings-form";
import { requireRole } from "@/lib/auth/authorization";
import { getGeneralStoreSettings } from "@/lib/settings/store-settings-service";

export const dynamic = "force-dynamic";

export default async function AdminGeneralSettingsPage() {
  // Enforce ADMIN role
  await requireRole("ADMIN");

  const { settings } = await getGeneralStoreSettings();

  return <GeneralSettingsForm initialSettings={settings} />;
}
