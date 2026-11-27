import { requireRole } from "@/lib/auth/authorization";
import { getShippingRulesSettings } from "@/lib/settings/shipping-rules-settings";
import { ShippingRulesForm } from "@/components/admin/settings/shipping-rules-form";

export const dynamic = "force-dynamic";

export default async function AdminShippingRulesPage() {
  // Enforce ADMIN role
  await requireRole("ADMIN");

  const { settings } = await getShippingRulesSettings();

  return <ShippingRulesForm initialSettings={settings} />;
}
