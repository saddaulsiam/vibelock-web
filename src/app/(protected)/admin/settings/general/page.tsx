import { requireRole } from "@/lib/auth/authorization";
import { getGeneralStoreSettings } from "@/lib/settings/store-settings-service";
import { GeneralSettingsForm } from "@/components/admin/settings/general-settings-form";
import {
  Building2,
  Database,
  Globe,
  Headphones,
  Lock,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminGeneralSettingsPage() {
  // Enforce ADMIN role
  await requireRole("ADMIN");

  const { settings, isPersisted, hasStore } = await getGeneralStoreSettings();

  const isMaintenance = settings.maintenanceMode.enabled;
  const isHoliday = settings.holidayMode.enabled;

  return (
    <div className="space-y-8">
      {/* ── 1. EXECUTIVE TELEMETRY COCKPIT ── */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 sm:gap-4">
        {/* Metric 1: Store Operational State */}
        <div className="rounded-xl border border-vl-dark-900/10 bg-white p-4 shadow-2xs transition-all hover:border-vl-dark-900/20 sm:p-5">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[11px] font-bold tracking-wider uppercase">Store Status</span>
            <div
              className={cn(
                "flex size-7 items-center justify-center rounded-lg border",
                isMaintenance
                  ? "border-amber-300 bg-amber-50 text-amber-600"
                  : "border-emerald-200 bg-emerald-50 text-emerald-600"
              )}
            >
              <Radio className="size-3.5 animate-pulse" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-vl-dark-900 text-lg font-bold tracking-tight sm:text-xl">
              {isMaintenance ? "Maintenance Active" : isHoliday ? "Holiday Dispatch" : "Live & Public"}
            </span>
          </div>
          <p
            className={cn(
              "mt-1.5 flex items-center gap-1.5 text-[11px] font-medium",
              isMaintenance ? "text-amber-700" : "text-emerald-700"
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                isMaintenance ? "bg-amber-500" : "bg-emerald-500"
              )}
            />
            {isMaintenance ? "Checkout Paused" : "Accepting Orders"}
          </p>
        </div>

        {/* Metric 2: Persistence Engine */}
        <div className="rounded-xl border border-vl-dark-900/10 bg-white p-4 shadow-2xs transition-all hover:border-vl-dark-900/20 sm:p-5">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[11px] font-bold tracking-wider uppercase">Persistence</span>
            <div className="flex size-7 items-center justify-center rounded-lg border border-vl-cyan-200 bg-vl-cyan-50 text-vl-cyan-700">
              <Database className="size-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-vl-dark-900 text-lg font-bold tracking-tight sm:text-xl">
              {hasStore ? "PostgreSQL Sync" : "Runtime Fallback"}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] font-medium text-neutral-500 truncate">
            {isPersisted ? "Active in StoreSetting" : "Strategy A Defaults"}
          </p>
        </div>

        {/* Metric 3: Legal Compliance */}
        <div className="rounded-xl border border-vl-dark-900/10 bg-white p-4 shadow-2xs transition-all hover:border-vl-dark-900/20 sm:p-5">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[11px] font-bold tracking-wider uppercase">Legal Compliance</span>
            <div className="flex size-7 items-center justify-center rounded-lg border border-purple-200 bg-purple-50 text-purple-700">
              <Building2 className="size-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-vl-dark-900 text-lg font-bold tracking-tight sm:text-xl truncate block">
              {settings.dbidNumber ? "DBID Verified" : "Pending DBID"}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] font-medium text-neutral-500 truncate">
            {settings.tradeLicenseNumber ? "Trade License Configured" : "MOC Registration Required"}
          </p>
        </div>

        {/* Metric 4: Omnichannel Contact */}
        <div className="rounded-xl border border-vl-dark-900/10 bg-white p-4 shadow-2xs transition-all hover:border-vl-dark-900/20 sm:p-5">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[11px] font-bold tracking-wider uppercase">Support Hotline</span>
            <div className="flex size-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">
              <Headphones className="size-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-vl-dark-900 text-lg font-bold tracking-tight sm:text-xl truncate block">
              +{settings.whatsappNumber}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] font-medium text-neutral-500 truncate">
            WhatsApp & Phone Live
          </p>
        </div>
      </div>

      {/* ── 2. PERSISTENCE TELEMETRY BANNER ── */}
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border p-5 shadow-2xs transition-all",
          hasStore
            ? "border-emerald-200/90 bg-gradient-to-r from-emerald-50/80 via-white to-emerald-50/30 text-emerald-950"
            : "border-amber-200/90 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/30 text-amber-950"
        )}
      >
        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border shadow-2xs",
                hasStore
                  ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                  : "border-amber-300 bg-amber-100 text-amber-800"
              )}
            >
              {hasStore ? (
                <ShieldCheck className="size-5" />
              ) : (
                <ShieldAlert className="size-5" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight">
                  {hasStore
                    ? "Store Configuration Engine: Synchronized"
                    : "Phase 2B Safe Runtime Foundation: Strategy A Fallback Active"}
                </h3>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase border",
                    hasStore
                      ? "border-emerald-300 bg-emerald-100/70 text-emerald-800"
                      : "border-amber-300 bg-amber-100/70 text-amber-800"
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      hasStore ? "bg-emerald-600" : "bg-amber-600"
                    )}
                  />
                  {hasStore ? "Audit Log Active" : "Bootstrap Fallback"}
                </span>
              </div>
              <p className="text-xs leading-relaxed opacity-90 max-w-3xl">
                {hasStore
                  ? "Store identity, legal information, and operational modes are persistently loaded from the StoreSetting table with atomic AuditLog recording."
                  : "Settings operate safely via Strategy A fallback constants. All updates gracefully degrade without interrupting storefront operations."}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 text-xs font-mono">
            <span className="rounded-md border border-neutral-200 bg-white/80 px-2.5 py-1 text-neutral-600 shadow-2xs">
              KEY: GENERAL_STORE_SETTINGS
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. FORM COMPONENT ── */}
      <GeneralSettingsForm initialSettings={settings} />

      {/* ── 4. ARCHITECTURAL & AUDIT TRAIL CONSOLE ── */}
      <div className="overflow-hidden rounded-xl border border-vl-dark-800 bg-vl-dark-900 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-vl-dark-800 bg-vl-dark-900/80 px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-rose-500/80" />
              <span className="size-2.5 rounded-full bg-amber-500/80" />
              <span className="size-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-neutral-400">|</span>
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-neutral-300 uppercase">
              <Terminal className="size-3.5 text-vl-cyan" />
              VibeLock Store Settings Operating Principles
            </div>
          </div>
          <span className="rounded border border-vl-dark-700 bg-vl-dark-800/90 px-2.5 py-0.5 font-mono text-[11px] font-bold text-vl-cyan uppercase">
            POLICY: ZERO_DEPLOYMENT_RECONFIG
          </span>
        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3 sm:p-7 text-xs">
          <div className="space-y-1.5 border-b border-vl-dark-800 pb-4 sm:border-b-0 sm:border-r sm:pr-4 sm:pb-0">
            <div className="flex items-center gap-2 font-bold text-vl-cyan">
              <Lock className="size-3.5" />
              <span>Zero-Code Business Operations</span>
            </div>
            <p className="leading-relaxed text-neutral-400">
              Store managers can update support hotlines, trade licenses, and dispatch notices instantly without requiring code commits or production redeployment.
            </p>
          </div>

          <div className="space-y-1.5 border-b border-vl-dark-800 pb-4 sm:border-b-0 sm:border-r sm:pr-4 sm:pb-0">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <ShieldCheck className="size-3.5" />
              <span>Full Audit Traceability</span>
            </div>
            <p className="leading-relaxed text-neutral-400">
              Every setting save executes in an atomic transaction logging the updating admin ID, previous JSON state, and new state into <code className="text-vl-cyan">AuditLog</code>.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-purple-400">
              <Globe className="size-3.5" />
              <span>Universal Storefront Sync</span>
            </div>
            <p className="leading-relaxed text-neutral-400">
              Updates to the warehouse address, WhatsApp hotline, and legal BIN automatically sync across all public pages, floating widgets, and printed invoice footers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
