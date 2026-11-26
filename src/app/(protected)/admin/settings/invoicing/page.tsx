import { requireRole } from "@/lib/auth/authorization";
import { getTaxInvoiceSettings } from "@/lib/settings/tax-invoice-settings";
import { TaxInvoiceForm } from "@/components/admin/settings/tax-invoice-form";
import {
  Building2,
  FileCheck2,
  Lock,
  Percent,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminTaxInvoicingSettingsPage() {
  // Enforce ADMIN role
  await requireRole("ADMIN");

  const { settings, hasStore } = await getTaxInvoiceSettings();

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary KPI Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: VAT Collection Status */}
        <div className="flex items-center gap-4 rounded-xl border border-vl-dark-900/10 bg-vl-white p-4 shadow-sm dark:border-vl-dark-800 dark:bg-vl-dark-900">
          <div className="flex size-11 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            <Percent className="size-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-vl-dark-500 dark:text-vl-dark-400">VAT Status</p>
            <p className="text-xl font-bold tracking-tight text-vl-dark-950 dark:text-vl-white">
              {settings.enableTax ? `${settings.vatRatePercent}% VAT` : "Disabled (0%)"}
            </p>
            <p className="text-[11px] text-vl-dark-400">
              {settings.enableTax ? `${settings.taxCalculationMode} Mode` : "No tax added"}
            </p>
          </div>
        </div>

        {/* Metric 2: NBR BIN Status */}
        <div className="flex items-center gap-4 rounded-xl border border-vl-dark-900/10 bg-vl-white p-4 shadow-sm dark:border-vl-dark-800 dark:bg-vl-dark-900">
          <div className="flex size-11 items-center justify-center rounded-lg bg-vl-cyan-500/10 text-vl-cyan-600 dark:bg-vl-cyan-500/20 dark:text-vl-cyan-400">
            <Building2 className="size-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-vl-dark-500 dark:text-vl-dark-400">NBR BIN Number</p>
            <p className="text-sm font-bold tracking-tight text-vl-dark-950 dark:text-vl-white truncate max-w-[160px]">
              {settings.binNumber || "Not Configured"}
            </p>
            <p className="text-[11px] text-vl-dark-400 truncate max-w-[160px]">
              {settings.taxCircle || "Circle Not Set"}
            </p>
          </div>
        </div>

        {/* Metric 3: Mushak 6.3 Compliance */}
        <div className="flex items-center gap-4 rounded-xl border border-vl-dark-900/10 bg-vl-white p-4 shadow-sm dark:border-vl-dark-800 dark:bg-vl-dark-900">
          <div className="flex size-11 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
            <FileCheck2 className="size-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-vl-dark-500 dark:text-vl-dark-400">Mushak 6.3</p>
            <p className="text-xl font-bold tracking-tight text-vl-dark-950 dark:text-vl-white">
              {settings.enableMushak63Format ? "Compliant" : "Standard"}
            </p>
            <p className="text-[11px] text-vl-dark-400">
              Prefix: {settings.invoicePrefix}
            </p>
          </div>
        </div>

        {/* Metric 4: Digital Seal & Verification */}
        <div className="flex items-center gap-4 rounded-xl border border-vl-dark-900/10 bg-vl-white p-4 shadow-sm dark:border-vl-dark-800 dark:bg-vl-dark-900">
          <div className="flex size-11 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
            <Receipt className="size-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-vl-dark-500 dark:text-vl-dark-400">Digital Seal</p>
            <p className="text-xl font-bold tracking-tight text-vl-dark-950 dark:text-vl-white">
              {settings.showDigitalSeal ? "Verified Seal" : "No Stamp"}
            </p>
            <p className="text-[11px] text-vl-dark-400">
              Rule 40 VAT & SD Rules
            </p>
          </div>
        </div>
      </div>

      {/* Storage Strategy A Badge Notice */}
      <div className="flex items-center justify-between rounded-xl border border-vl-dark-900/10 bg-vl-dark-900/[0.02] p-3 text-xs dark:border-vl-dark-800 dark:bg-vl-dark-900/30">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "size-2 rounded-full",
              hasStore ? "bg-emerald-500" : "bg-amber-500"
            )}
          />
          <span className="font-medium text-vl-dark-700 dark:text-vl-dark-300">
            {hasStore
              ? "Active database policy record (StoreSetting: TAX_INVOICE_CONFIG)"
              : "Running on Strategy A fallback defaults (Unmigrated fallback resilient)"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-vl-dark-400">
          <Lock className="size-3.5" />
          <span>Admin Access Protected</span>
        </div>
      </div>

      {/* Main Settings Form */}
      <TaxInvoiceForm initialSettings={settings} />
    </div>
  );
}
