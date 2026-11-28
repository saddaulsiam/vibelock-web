import { InventoryReturnForm } from "@/components/admin/settings/inventory-return-form";
import { requireRole } from "@/lib/auth/authorization";
import { getInventoryReturnSettings } from "@/lib/settings/inventory-return-settings";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPoliciesSettingsPage() {
  // Enforce ADMIN role
  await requireRole("ADMIN");

  const { settings } = await getInventoryReturnSettings();

  return <InventoryReturnForm initialSettings={settings} />;
}
