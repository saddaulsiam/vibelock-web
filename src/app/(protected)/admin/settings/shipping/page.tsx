import { requireRole } from "@/lib/auth/authorization";
import { getShippingRulesSettings } from "@/lib/settings/shipping-rules-settings";
import { ShippingRulesForm } from "@/components/admin/settings/shipping-rules-form";
import {
  Building2,
  Globe,
  Lock,
  Package,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminShippingRulesPage() {
  // Enforce ADMIN role
  await requireRole("ADMIN");

  const { settings, hasStore } = await getShippingRulesSettings();

  const isFreeActive = settings.enableFreeShipping;

  return (
    <div className="space-y-8">
      {/* ── 1. EXECUTIVE TELEMETRY COCKPIT ── */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 sm:gap-4">
        {/* Metric 1: Free Delivery Trigger */}
        <div className="rounded-xl border border-vl-dark-900/10 bg-white p-4 shadow-2xs transition-all hover:border-vl-dark-900/20 sm:p-5">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[11px] font-bold tracking-wider uppercase">Free Shipping</span>
            <div
              className={cn(
                "flex size-7 items-center justify-center rounded-lg border",
                isFreeActive
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-neutral-200 bg-neutral-100 text-neutral-500"
              )}
            >
              <Sparkles className="size-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-vl-dark-900 text-lg font-bold tracking-tight sm:text-xl">
              {isFreeActive ? `Orders > ৳${settings.freeShippingThreshold.toLocaleString()}` : "Disabled"}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] font-medium text-emerald-700 truncate">
            {isFreeActive ? "AOV Incentive Active" : "Standard Rates Only"}
          </p>
        </div>

        {/* Metric 2: Geographic Scope */}
        <div className="rounded-xl border border-vl-dark-900/10 bg-white p-4 shadow-2xs transition-all hover:border-vl-dark-900/20 sm:p-5">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[11px] font-bold tracking-wider uppercase">Free Scope</span>
            <div className="flex size-7 items-center justify-center rounded-lg border border-vl-cyan-200 bg-vl-cyan-50 text-vl-cyan-700">
              <Globe className="size-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-vl-dark-900 text-lg font-bold tracking-tight sm:text-xl">
              {settings.freeShippingScope === "NATIONWIDE" ? "Nationwide BD" : "Dhaka Metro"}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] font-medium text-neutral-500 truncate">
            {settings.freeShippingScope === "NATIONWIDE" ? "All 64 Districts" : "Inside Dhaka Only"}
          </p>
        </div>

        {/* Metric 3: Primary Courier */}
        <div className="rounded-xl border border-vl-dark-900/10 bg-white p-4 shadow-2xs transition-all hover:border-vl-dark-900/20 sm:p-5">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[11px] font-bold tracking-wider uppercase">Primary Carrier</span>
            <div className="flex size-7 items-center justify-center rounded-lg border border-purple-200 bg-purple-50 text-purple-700">
              <Truck className="size-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-vl-dark-900 text-lg font-bold tracking-tight sm:text-xl">
              {settings.primaryCourier === "STEADFAST"
                ? "Steadfast Courier"
                : settings.primaryCourier === "PATHAO"
                  ? "Pathao Logistics"
                  : "Manual Dispatch"}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] font-medium text-neutral-500 truncate">
            {settings.autoCreateConsignment ? "Instant API Booking" : "Manual Dispatch Gate"}
          </p>
        </div>

        {/* Metric 4: Fulfillment Hub */}
        <div className="rounded-xl border border-vl-dark-900/10 bg-white p-4 shadow-2xs transition-all hover:border-vl-dark-900/20 sm:p-5">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[11px] font-bold tracking-wider uppercase">Fulfillment Hub</span>
            <div className="flex size-7 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700">
              <Building2 className="size-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-vl-dark-900 text-lg font-bold tracking-tight sm:text-xl truncate block">
              {settings.pickupHubName}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] font-medium text-neutral-500 truncate">
            +{settings.contactPhone}
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
                    ? "Logistics & Shipping Engine: Synchronized"
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
                  ? "Free delivery incentive thresholds, default pickup warehouse, and courier routing configurations are persisted to the StoreSetting table."
                  : "Shipping operates safely via Strategy A fallback constants. All updates gracefully degrade without interrupting order fulfillment."}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 text-xs font-mono">
            <span className="rounded-md border border-neutral-200 bg-white/80 px-2.5 py-1 text-neutral-600 shadow-2xs">
              KEY: SHIPPING_DELIVERY_RULES
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. FORM COMPONENT ── */}
      <ShippingRulesForm initialSettings={settings} />

      {/* ── 4. ARCHITECTURAL CONSOLE ── */}
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
              VibeLock Logistics & Delivery Governance
            </div>
          </div>
          <span className="rounded border border-vl-dark-700 bg-vl-dark-800/90 px-2.5 py-0.5 font-mono text-[11px] font-bold text-vl-cyan uppercase">
            POLICY: DYNAMIC_RATE_OPTIMIZATION
          </span>
        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3 sm:p-7 text-xs">
          <div className="space-y-1.5 border-b border-vl-dark-800 pb-4 sm:border-b-0 sm:border-r sm:pr-4 sm:pb-0">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <Sparkles className="size-3.5" />
              <span>Conversion & AOV Growth</span>
            </div>
            <p className="leading-relaxed text-neutral-400">
              Clear free delivery triggers encourage customers to add matching accessories or additional streetwear pieces to cross the ৳2,500 delivery threshold.
            </p>
          </div>

          <div className="space-y-1.5 border-b border-vl-dark-800 pb-4 sm:border-b-0 sm:border-r sm:pr-4 sm:pb-0">
            <div className="flex items-center gap-2 font-bold text-vl-cyan">
              <Package className="size-3.5" />
              <span>Accurate Courier Consignments</span>
            </div>
            <p className="leading-relaxed text-neutral-400">
              Standardized pickup addresses ensure riders navigate directly to the correct fulfillment bay without delivery delays or failed consignment pickups.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-purple-400">
              <Lock className="size-3.5" />
              <span>Zero Tampering Enforcement</span>
            </div>
            <p className="leading-relaxed text-neutral-400">
              Delivery fees and waivers are computed server-side in checkout actions. Client manipulation of shipping pricing or zones is mathematically ignored.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
