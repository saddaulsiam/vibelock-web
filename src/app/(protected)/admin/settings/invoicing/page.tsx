import { requireRole } from "@/lib/auth/authorization";
import { getTaxInvoiceSettings } from "@/lib/settings/tax-invoice-settings";
import { TaxInvoiceForm } from "@/components/admin/settings/tax-invoice-form";

export const dynamic = "force-dynamic";

export default async function AdminTaxInvoicingSettingsPage() {
  // Enforce ADMIN role
  await requireRole("ADMIN");

  const { settings } = await getTaxInvoiceSettings();

  return (
    <div className="space-y-6">
      <TaxInvoiceForm initialSettings={settings} />
    </div>
  );
}
