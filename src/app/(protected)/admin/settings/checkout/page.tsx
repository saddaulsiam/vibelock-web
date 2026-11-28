import { CheckoutSettingsForm } from "@/components/admin/settings/checkout-settings-form";
import { requireRole } from "@/lib/auth/authorization";
import { getCheckoutSettings } from "@/lib/settings/checkout-settings";

export const dynamic = "force-dynamic";

export default async function AdminCheckoutSettingsPage() {
  // Enforce ADMIN role
  await requireRole("ADMIN");

  const { settings } = await getCheckoutSettings();

  return <CheckoutSettingsForm initialSettings={settings} />;
}
