import { requireRole } from "@/lib/auth/authorization";
import { getCheckoutSettings } from "@/lib/settings/checkout-settings";
import { CheckoutSettingsForm } from "@/components/admin/settings/checkout-settings-form";
import {
  Banknote,
  Hourglass,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminCheckoutSettingsPage() {
  // Enforce ADMIN role
  await requireRole("ADMIN");

  const { settings, hasStore } = await getCheckoutSettings();

  const isAdvanceRequired = settings.requireCodAdvanceDeliveryCharge;

  return (
    <div className="space-y-8">
      {/* ── 1. EXECUTIVE TELEMETRY COCKPIT ── */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 sm:gap-4">
        {/* Metric 1: Max COD Exposure */}
        <div className="rounded-xl border border-vl-dark-900/10 bg-white p-4 shadow-2xs transition-all hover:border-vl-dark-900/20 sm:p-5">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[11px] font-bold tracking-wider uppercase">COD Ceiling</span>
            <div className="flex size-7 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 text-amber-700">
              <Banknote className="size-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-vl-dark-900 text-lg font-bold tracking-tight sm:text-xl">
              ৳{settings.maxCodOrderValue.toLocaleString()}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] font-medium text-amber-700 truncate">
            Max Risk Exposure / Order
          </p>
        </div>

        {/* Metric 2: Advance COD Gate */}
        <div className="rounded-xl border border-vl-dark-900/10 bg-white p-4 shadow-2xs transition-all hover:border-vl-dark-900/20 sm:p-5">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[11px] font-bold tracking-wider uppercase">Advance Gate</span>
            <div
              className={cn(
                "flex size-7 items-center justify-center rounded-lg border",
                isAdvanceRequired
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-neutral-200 bg-neutral-100 text-neutral-500"
              )}
            >
              <ShieldCheck className="size-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-vl-dark-900 text-lg font-bold tracking-tight sm:text-xl">
              {isAdvanceRequired ? "Advance Active" : "Full COD Open"}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] font-medium text-neutral-500 truncate">
            {isAdvanceRequired
              ? `৳${settings.codAdvanceInsideDhaka} / ৳${settings.codAdvanceOutsideDhaka}`
              : "Zero Courier Pre-payment"}
          </p>
        </div>

        {/* Metric 3: Online Reservation TTL */}
        <div className="rounded-xl border border-vl-dark-900/10 bg-white p-4 shadow-2xs transition-all hover:border-vl-dark-900/20 sm:p-5">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[11px] font-bold tracking-wider uppercase">Stock Lock TTL</span>
            <div className="flex size-7 items-center justify-center rounded-lg border border-vl-cyan-200 bg-vl-cyan-50 text-vl-cyan-700">
              <Hourglass className="size-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-vl-dark-900 text-lg font-bold tracking-tight sm:text-xl">
              {settings.onlineReservationTtlMinutes} Minutes
            </span>
          </div>
          <p className="mt-1.5 text-[11px] font-medium text-neutral-500 truncate">
            Auto-Release Abandoned Holds
          </p>
        </div>

        {/* Metric 4: First-Time Buyer Gate */}
        <div className="rounded-xl border border-vl-dark-900/10 bg-white p-4 shadow-2xs transition-all hover:border-vl-dark-900/20 sm:p-5">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[11px] font-bold tracking-wider uppercase">Buyer OTP Gate</span>
            <div className="flex size-7 items-center justify-center rounded-lg border border-purple-200 bg-purple-50 text-purple-700">
              <UserCheck className="size-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-vl-dark-900 text-lg font-bold tracking-tight sm:text-xl">
              {settings.enforceFirstTimeCodOtp ? "OTP Required" : "Open Verification"}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] font-medium text-neutral-500 truncate">
            {settings.enforceFirstTimeCodOtp ? "First-Time Customers" : "Standard Policy"}
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
                    ? "Checkout Policy Engine: Synchronized"
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
                  ? "Checkout limits, COD fraud ceilings, and inventory reservation timeouts are persistently loaded from the StoreSetting table."
                  : "Checkout operates safely via Strategy A fallback constants. All updates gracefully degrade without interrupting customer orders."}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 text-xs font-mono">
            <span className="rounded-md border border-neutral-200 bg-white/80 px-2.5 py-1 text-neutral-600 shadow-2xs">
              KEY: CHECKOUT_COD_POLICY
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. FORM COMPONENT ── */}
      <CheckoutSettingsForm initialSettings={settings} />

      {/* ── 4. ARCHITECTURAL & FRAUD CONTROL CONSOLE ── */}
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
              VibeLock Checkout & COD Risk Governance Principles
            </div>
          </div>
          <span className="rounded border border-vl-dark-700 bg-vl-dark-800/90 px-2.5 py-0.5 font-mono text-[11px] font-bold text-vl-cyan uppercase">
            POLICY: SERVER_AUTHORITATIVE_ENFORCEMENT
          </span>
        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3 sm:p-7 text-xs">
          <div className="space-y-1.5 border-b border-vl-dark-800 pb-4 sm:border-b-0 sm:border-r sm:pr-4 sm:pb-0">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <ShieldAlert className="size-3.5" />
              <span>Courier Return Liability Defense</span>
            </div>
            <p className="leading-relaxed text-neutral-400">
              Capping COD order values and charging advance delivery fees eliminates prank orders, saving up to ৳150 in lost courier return charges per consignment.
            </p>
          </div>

          <div className="space-y-1.5 border-b border-vl-dark-800 pb-4 sm:border-b-0 sm:border-r sm:pr-4 sm:pb-0">
            <div className="flex items-center gap-2 font-bold text-vl-cyan">
              <Hourglass className="size-3.5" />
              <span>Ghost Stock Prevention</span>
            </div>
            <p className="leading-relaxed text-neutral-400">
              Unpaid online checkout sessions hold stock only for the configured TTL minutes. Abandoned carts automatically unlock stock for other paying customers.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <Lock className="size-3.5" />
              <span>Tamper-Proof Server Enforced</span>
            </div>
            <p className="leading-relaxed text-neutral-400">
              Policies are strictly evaluated server-side in <code className="text-vl-cyan">createOrderAction</code>. Manipulating browser JavaScript cannot bypass checkout ceilings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
