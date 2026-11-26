import { requireRole } from "@/lib/auth/authorization";
import { getInventoryReturnSettings } from "@/lib/settings/inventory-return-settings";
import { InventoryReturnForm } from "@/components/admin/settings/inventory-return-form";
import {
  Boxes,
  Lock,
  RotateCcw,
  ShieldCheck,
  Warehouse,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPoliciesSettingsPage() {
  // Enforce ADMIN role
  await requireRole("ADMIN");

  const { settings, hasStore } = await getInventoryReturnSettings();

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary KPI Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Low Stock Trigger */}
        <div className="flex items-center gap-4 rounded-xl border border-vl-dark-900/10 bg-vl-white p-4 shadow-sm dark:border-vl-dark-800 dark:bg-vl-dark-900">
          <div className="flex size-11 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
            <Boxes className="size-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-vl-dark-500 dark:text-vl-dark-400">Low Stock Trigger</p>
            <p className="text-xl font-bold tracking-tight text-vl-dark-950 dark:text-vl-white">
              &le; {settings.lowStockThreshold} Units
            </p>
            <p className="text-[11px] text-vl-dark-400">
              Emergency at {settings.criticalStockThreshold} units
            </p>
          </div>
        </div>

        {/* Metric 2: Return Window */}
        <div className="flex items-center gap-4 rounded-xl border border-vl-dark-900/10 bg-vl-white p-4 shadow-sm dark:border-vl-dark-800 dark:bg-vl-dark-900">
          <div className="flex size-11 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
            <RotateCcw className="size-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-vl-dark-500 dark:text-vl-dark-400">Return Window</p>
            <p className="text-xl font-bold tracking-tight text-vl-dark-950 dark:text-vl-white">
              {settings.returnWindowDays > 0 ? `${settings.returnWindowDays} Days` : "Disabled"}
            </p>
            <p className="text-[11px] text-vl-dark-400">
              {settings.allowPartialReturns ? "Partial returns allowed" : "Full orders only"}
            </p>
          </div>
        </div>

        {/* Metric 3: Return Deductions */}
        <div className="flex items-center gap-4 rounded-xl border border-vl-dark-900/10 bg-vl-white p-4 shadow-sm dark:border-vl-dark-800 dark:bg-vl-dark-900">
          <div className="flex size-11 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-vl-dark-500 dark:text-vl-dark-400">Courier Deduction</p>
            <p className="text-xl font-bold tracking-tight text-vl-dark-950 dark:text-vl-white">
              {settings.deductShippingFeeFromRefund ? "Active (Deducted)" : "Waived"}
            </p>
            <p className="text-[11px] text-vl-dark-400">
              {settings.returnProcessingFee > 0 ? `+৳${settings.returnProcessingFee} flat fee` : "No extra fee"}
            </p>
          </div>
        </div>

        {/* Metric 4: Restocking Location */}
        <div className="flex items-center gap-4 rounded-xl border border-vl-dark-900/10 bg-vl-white p-4 shadow-sm dark:border-vl-dark-800 dark:bg-vl-dark-900">
          <div className="flex size-11 items-center justify-center rounded-lg bg-vl-cyan-500/10 text-vl-cyan-600 dark:bg-vl-cyan-500/20 dark:text-vl-cyan-400">
            <Warehouse className="size-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-vl-dark-500 dark:text-vl-dark-400">Restock Policy</p>
            <p className="text-sm font-bold tracking-tight text-vl-dark-950 dark:text-vl-white truncate max-w-[160px]">
              {settings.autoRestockCompletedReturns ? "Auto-Restocked" : "QC Inspection"}
            </p>
            <p className="text-[11px] text-vl-dark-400 truncate max-w-[160px]">
              {settings.restockLocation}
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
              ? "Active database policy record (StoreSetting: INVENTORY_RETURN_POLICIES)"
              : "Running on Strategy A fallback defaults (Unmigrated fallback resilient)"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-vl-dark-400">
          <Lock className="size-3.5" />
          <span>Admin Access Protected</span>
        </div>
      </div>

      {/* Main Settings Form */}
      <InventoryReturnForm initialSettings={settings} />
    </div>
  );
}
