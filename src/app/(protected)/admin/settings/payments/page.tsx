import { requireRole } from "@/lib/auth/authorization";
import {
  getPaymentSettingsOverview,
  type PaymentMethodStatus,
} from "@/lib/settings/payment-settings";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TogglePaymentMethodForm } from "@/components/admin/payments";
import {
  AlertCircle,
  Banknote,
  Clock,
  CreditCard,
  Database,
  Layers,
  Lock,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Terminal,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function getMethodVisualConfig(code: PaymentMethodStatus["code"]) {
  switch (code) {
    case "COD":
      return {
        icon: Banknote,
        avatarBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        railLabel: "Offline Logistics Rail",
        protocol: "National Courier Settlement",
        accentBorder: "border-emerald-500",
      };
    case "PAYSTATION":
      return {
        icon: CreditCard,
        avatarBg: "bg-vl-cyan-50 text-vl-cyan-700 border-vl-cyan-200",
        railLabel: "Multi-Gateway Rail",
        protocol: "Hosted Checkout (Cards & MFS)",
        accentBorder: "border-vl-cyan-500",
      };
    case "BKASH":
      return {
        icon: Smartphone,
        avatarBg: "bg-pink-50 text-pink-600 border-pink-200",
        railLabel: "MFS Direct Rail",
        protocol: "Tokenized API v1.2.0 (1-Click)",
        accentBorder: "border-pink-500",
      };
  }
}

function getStatusBadge(method: PaymentMethodStatus) {
  if (method.isEnabled) {
    return (
      <Badge
        variant="outline"
        className="border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold tracking-wide text-emerald-800"
      >
        <span className="mr-1.5 size-1.5 animate-pulse rounded-full bg-emerald-600" />
        ACTIVE
      </Badge>
    );
  }

  if ((method.code === "BKASH" || method.code === "PAYSTATION") && !method.isConfigured) {
    return (
      <Badge
        variant="outline"
        className="border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800"
      >
        <AlertCircle className="mr-1 size-3 text-amber-600" />
        CREDENTIALS MISSING
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="border-neutral-200 bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-600"
    >
      <Clock className="mr-1 size-3 text-neutral-500" />
      INACTIVE
    </Badge>
  );
}

export default async function AdminPaymentSettingsPage() {
  // Enforce ADMIN role
  await requireRole("ADMIN");

  const overview = await getPaymentSettingsOverview();

  return (
    <div className="space-y-8">
      {/* ── 1. EXECUTIVE TELEMETRY COCKPIT ── */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 sm:gap-4">
        {/* Metric 1: Live Active Channels */}
        <div className="border-vl-dark-900/10 hover:border-vl-dark-900/20 rounded-xl border bg-white p-4 shadow-2xs transition-all sm:p-5">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[11px] font-bold tracking-wider uppercase">Live Channels</span>
            <div className="flex size-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600">
              <Radio className="size-3.5 animate-pulse" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-vl-dark-900 text-2xl font-black tracking-tight sm:text-3xl">
              {overview.serverEnforcedMethodCount}
            </span>
            <span className="text-xs font-semibold text-neutral-400">
              / {overview.methods.length} Active
            </span>
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Live Checkout Routing
          </p>
        </div>

        {/* Metric 2: Persistence Engine */}
        <div className="border-vl-dark-900/10 hover:border-vl-dark-900/20 rounded-xl border bg-white p-4 shadow-2xs transition-all sm:p-5">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[11px] font-bold tracking-wider uppercase">Persistence</span>
            <div className="bg-vl-cyan-50 text-vl-cyan-700 border-vl-cyan-200 flex size-7 items-center justify-center rounded-lg border">
              <Database className="size-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-vl-dark-900 text-lg font-bold tracking-tight sm:text-xl">
              {overview.hasPersistenceStore ? "PostgreSQL Sync" : "Runtime Fallback"}
            </span>
          </div>
          <p className="mt-1.5 truncate text-[11px] font-medium text-neutral-500">
            {overview.hasPersistenceStore ? "AuditLog Transactional" : "Strategy A In-Memory"}
          </p>
        </div>

        {/* Metric 3: Enforcement Gate */}
        <div className="border-vl-dark-900/10 hover:border-vl-dark-900/20 rounded-xl border bg-white p-4 shadow-2xs transition-all sm:p-5">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[11px] font-bold tracking-wider uppercase">Enforcement</span>
            <div className="flex size-7 items-center justify-center rounded-lg border border-purple-200 bg-purple-50 text-purple-700">
              <ShieldCheck className="size-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-vl-dark-900 text-lg font-bold tracking-tight sm:text-xl">
              Authoritative
            </span>
          </div>
          <p className="mt-1.5 truncate text-[11px] font-medium text-neutral-500">
            createOrderAction Verified
          </p>
        </div>

        {/* Metric 4: Integrated Rails */}
        <div className="border-vl-dark-900/10 hover:border-vl-dark-900/20 rounded-xl border bg-white p-4 shadow-2xs transition-all sm:p-5">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[11px] font-bold tracking-wider uppercase">Coverage Rails</span>
            <div className="flex size-7 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700">
              <Layers className="size-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-vl-dark-900 text-lg font-bold tracking-tight sm:text-xl">
              3 Payment Rails
            </span>
          </div>
          <p className="mt-1.5 truncate text-[11px] font-medium text-neutral-500">
            MFS + Card + Courier COD
          </p>
        </div>
      </div>

      {/* ── 2. PERSISTENCE & STRATEGY A STATUS TELEMETRY BANNER ── */}
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border p-5 shadow-2xs transition-all",
          overview.hasPersistenceStore
            ? "border-emerald-200/90 bg-gradient-to-r from-emerald-50/80 via-white to-emerald-50/30 text-emerald-950"
            : "border-amber-200/90 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/30 text-amber-950"
        )}
      >
        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border shadow-2xs",
                overview.hasPersistenceStore
                  ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                  : "border-amber-300 bg-amber-100 text-amber-800"
              )}
            >
              {overview.hasPersistenceStore ? (
                <ShieldCheck className="size-5" />
              ) : (
                <ShieldAlert className="size-5" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight">
                  {overview.hasPersistenceStore
                    ? "Database Persistence Engine: Online"
                    : "Phase 2B Safe Runtime Foundation: Strategy A Fallback Active"}
                </h3>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase",
                    overview.hasPersistenceStore
                      ? "border-emerald-300 bg-emerald-100/70 text-emerald-800"
                      : "border-amber-300 bg-amber-100/70 text-amber-800"
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      overview.hasPersistenceStore ? "bg-emerald-600" : "bg-amber-600"
                    )}
                  />
                  {overview.hasPersistenceStore ? "Audit Log Active" : "Bootstrap Fallback"}
                </span>
              </div>
              <p className="max-w-3xl text-xs leading-relaxed opacity-90">
                {overview.hasPersistenceStore
                  ? "Payment settings are actively loaded and saved to the PaymentMethodSetting database table with AuditLog records."
                  : overview.persistenceBlocker ||
                    "Settings are safeguarded by the Strategy A bootstrap matrix. COD defaults to enabled, and PayStation/bKash respect environment credentials."}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 font-mono text-xs">
            <span className="rounded-md border border-neutral-200 bg-white/80 px-2.5 py-1 text-neutral-600 shadow-2xs">
              SERVER_GATE: createOrderAction
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. PAYMENT METHOD CARDS (3-COLUMN RESPONSIVE GRID) ── */}
      <div>
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-vl-dark-900 text-base font-bold tracking-tight">
              Configured Payment Channels
            </h3>
            <p className="text-muted-foreground text-xs">
              Live customer routing, credential gating, and inventory ledger consumption rules
            </p>
          </div>
          <span className="text-xs font-medium text-neutral-400">Authoritative Server State</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {overview.methods.map((method) => {
            const visual = getMethodVisualConfig(method.code);
            const Icon = visual.icon;
            const canToggle =
              method.code === "COD" || method.code === "BKASH" || method.code === "PAYSTATION";

            return (
              <Card
                key={method.code}
                className="group border-vl-dark-900/10 hover:border-vl-dark-900/25 flex flex-col justify-between bg-white shadow-sm transition-all duration-200 hover:shadow-md"
              >
                <div>
                  <CardHeader className="p-5 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex size-11 shrink-0 items-center justify-center rounded-xl border shadow-2xs transition-transform duration-200 group-hover:scale-105",
                            visual.avatarBg
                          )}
                        >
                          <Icon className="size-5.5" />
                        </div>
                        <div>
                          <CardTitle className="text-vl-dark-900 text-base font-bold tracking-tight">
                            {method.name}
                          </CardTitle>
                          <CardDescription className="text-muted-foreground flex items-center gap-1.5 text-xs">
                            <span>{visual.railLabel}</span>
                            <span>·</span>
                            <code className="py-0.2 rounded bg-neutral-100 px-1 font-mono text-[10px] font-semibold text-neutral-700">
                              {method.code}
                            </code>
                          </CardDescription>
                        </div>
                      </div>
                      {getStatusBadge(method)}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 p-5 pt-0 text-sm">
                    <p className="min-h-8 text-xs leading-relaxed text-neutral-600">
                      {method.description}
                    </p>

                    {/* Technical Configuration Specs */}
                    <div className="border-vl-dark-900/8 space-y-2 rounded-lg border bg-neutral-50/70 p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-neutral-500">Checkout Availability:</span>
                        <span
                          className={cn(
                            "font-bold",
                            method.isEnabled ? "text-emerald-700" : "text-neutral-500"
                          )}
                        >
                          {method.isEnabled ? "Available in Checkout" : "Disabled / Unavailable"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="font-medium text-neutral-500">Protocol / Rail:</span>
                        <span className="font-semibold text-neutral-800">{visual.protocol}</span>
                      </div>

                      {method.environmentMode && (
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-neutral-500">Environment Mode:</span>
                          <span
                            className={cn(
                              "rounded border px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase",
                              method.environmentMode === "production"
                                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                : method.environmentMode === "sandbox"
                                  ? "border-amber-300 bg-amber-50 text-amber-800"
                                  : "border-neutral-300 bg-neutral-100 text-neutral-600"
                            )}
                          >
                            {method.environmentMode}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="font-medium text-neutral-500">Credential Security:</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                          <Lock className="size-3" />
                          Server-Only (Gated)
                        </span>
                      </div>
                    </div>

                    {/* Order Lifecycle Impact Callout */}
                    <div
                      className={cn(
                        "rounded-r-lg border-l-2 bg-neutral-50 p-3 text-xs",
                        visual.accentBorder
                      )}
                    >
                      <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
                        <Zap className="size-3 text-neutral-600" />
                        Order Lifecycle & Ledger Impact
                      </p>
                      <p className="mt-1 leading-relaxed text-neutral-700">
                        {method.checkoutImpact}
                      </p>
                    </div>
                  </CardContent>
                </div>

                {/* Card Action Control Footer */}
                <div className="border-vl-dark-900/10 rounded-b-xl border-t bg-neutral-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-600">Admin Control</span>
                    {canToggle ? (
                      <TogglePaymentMethodForm
                        code={method.code as "COD" | "BKASH" | "PAYSTATION"}
                        isEnabled={method.isEnabled}
                        isConfigured={method.isConfigured}
                      />
                    ) : (
                      <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
                        Planned in Future Release
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── 4. SECURITY & ENFORCEMENT SPECIFICATION TERMINAL ── */}
      <div className="border-vl-dark-800 bg-vl-dark-900 overflow-hidden rounded-xl border text-white shadow-xl">
        {/* Terminal Header */}
        <div className="border-vl-dark-800 bg-vl-dark-900/80 flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-rose-500/80" />
              <span className="size-2.5 rounded-full bg-amber-500/80" />
              <span className="size-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-neutral-400">|</span>
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-neutral-300 uppercase">
              <Terminal className="text-vl-cyan size-3.5" />
              VibeLock Payment Security Architecture Specification
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="border-vl-dark-700 bg-vl-dark-800/90 text-vl-cyan rounded border px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase">
              POLICY: STRICT_AUTHORITATIVE
            </span>
          </div>
        </div>

        {/* 4 Security Pillars Grid */}
        <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-7 lg:grid-cols-4">
          {/* Pillar 1 */}
          <div className="border-vl-dark-800 space-y-2 border-b pb-4 sm:border-r sm:border-b-0 sm:pr-4 sm:pb-0">
            <div className="text-vl-cyan flex items-center gap-2 text-xs font-bold">
              <Lock className="size-3.5" />
              <span>Zero Client Trust</span>
            </div>
            <p className="text-xs leading-relaxed text-neutral-400">
              Checkout methods are enforced server-side inside{" "}
              <code className="text-vl-cyan">createOrderAction</code>. Direct client API forgery or
              payload tampering is rejected with zero checkout creation.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="border-vl-dark-800 space-y-2 border-b pb-4 sm:border-r sm:border-b-0 sm:pr-4 sm:pb-0">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <ShieldCheck className="size-3.5" />
              <span>Credential Gating</span>
            </div>
            <p className="text-xs leading-relaxed text-neutral-400">
              Activating an online gateway in the database requires validated environment secrets.
              Missing keys strictly block enablement and fail closed.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="border-vl-dark-800 space-y-2 border-b pb-4 sm:border-r sm:border-b-0 sm:pr-4 sm:pb-0">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
              <Radio className="size-3.5" />
              <span>In-Flight Session Safety</span>
            </div>
            <p className="text-xs leading-relaxed text-neutral-400">
              Disabling an online gateway blocks new checkout creation, but existing in-flight
              orders and IPN callbacks continue to settle and reconcile safely.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
              <Database className="size-3.5" />
              <span>Atomic Audit Trail</span>
            </div>
            <p className="text-xs leading-relaxed text-neutral-400">
              All payment setting changes execute in an atomic Prisma transaction generating an
              immutable record in <code className="text-vl-cyan">AuditLog</code> with actor ID and
              state transitions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
