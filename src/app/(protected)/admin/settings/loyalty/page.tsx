import { LoyaltySettingsForm } from "@/components/admin/settings/loyalty-settings-form";
import { requireRole } from "@/lib/auth/authorization";
import { getLoyaltySettings } from "@/lib/settings/loyalty-settings";

export const dynamic = "force-dynamic";

export default async function AdminLoyaltySettingsPage() {
  // Enforce ADMIN role at page level
  await requireRole("ADMIN");

  const { settings } = await getLoyaltySettings();

  return <LoyaltySettingsForm initialSettings={settings} />;
}
