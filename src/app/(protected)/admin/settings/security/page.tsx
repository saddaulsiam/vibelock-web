import { SecurityPixelForm } from "@/components/admin/settings/security-pixel-form";
import { requireRole } from "@/lib/auth/authorization";
import { getSecurityPixelSettings } from "@/lib/settings/security-pixel-settings";

export const dynamic = "force-dynamic";

export default async function AdminSecuritySettingsPage() {
  // Enforce ADMIN role
  await requireRole("ADMIN");

  const { settings } = await getSecurityPixelSettings();

  return <SecurityPixelForm initialSettings={settings} />;
}
