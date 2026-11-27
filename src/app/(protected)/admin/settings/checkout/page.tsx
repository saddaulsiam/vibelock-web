import { requireRole } from "@/lib/auth/authorization";
import { getCheckoutSettings } from "@/lib/settings/checkout-settings";
import { CheckoutSettingsForm } from "@/components/admin/settings/checkout-settings-form";

export const dynamic = "force-dynamic";

export default async function AdminCheckoutSettingsPage() {
  // Enforce ADMIN role
  await requireRole("ADMIN");

  const { settings } = await getCheckoutSettings();

  return (
    <div className="space-y-6">
      <CheckoutSettingsForm initialSettings={settings} />
    </div>
  );
}
