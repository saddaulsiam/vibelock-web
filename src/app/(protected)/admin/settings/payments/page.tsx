import { requireRole } from "@/lib/auth/authorization";
import { getPaymentSettingsOverview, type PaymentMethodStatus } from "@/lib/settings/payment-settings";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TogglePaymentMethodForm } from "@/components/admin/payment-settings-forms";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Info,
} from "lucide-react";

export const dynamic = "force-dynamic";

function getMethodIcon(code: PaymentMethodStatus["code"]) {
  switch (code) {
    case "COD":
      return Banknote;
    case "SSLCOMMERZ":
      return CreditCard;
    case "BKASH":
    case "NAGAD":
      return Smartphone;
  }
}

function getStatusBadge(method: PaymentMethodStatus) {
  if (method.isEnabled) {
    return (
      <Badge variant="outline" className="border-emerald-400 bg-emerald-50 text-emerald-800 font-semibold">
        <CheckCircle2 className="mr-1 size-3 text-emerald-600" />
        ACTIVE
      </Badge>
    );
  }

  if ((method.code === "SSLCOMMERZ" || method.code === "BKASH" || method.code === "NAGAD") && !method.isConfigured) {
    return (
      <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-800 font-medium">
        <AlertCircle className="mr-1 size-3 text-amber-600" />
        CREDENTIALS MISSING
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-zinc-300 bg-zinc-100 text-zinc-600 font-medium">
      <Clock className="mr-1 size-3 text-zinc-500" />
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
      {/* Header Description */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[#101114]">
          Payment Gateways & Checkout Controls
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          View operational payment channels, server-side enforcement status, and checkout lifecycle rules.
        </p>
      </div>

      {/* Persistence & Strategy A Status Notice */}
      <div
        className={`rounded-lg border p-4 text-sm ${
          overview.hasPersistenceStore
            ? "border-emerald-300 bg-emerald-50/70 text-emerald-900"
            : "border-amber-300 bg-amber-50/70 text-amber-900"
        }`}
      >
        <div className="flex items-start gap-3">
          {overview.hasPersistenceStore ? (
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-700" />
          ) : (
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-700" />
          )}
          <div className="space-y-1">
            <p className="font-semibold">
              {overview.hasPersistenceStore
                ? "Database Persistence Active"
                : "Phase 2B Safe Runtime Foundation (Strategy A Fallback)"}
            </p>
            <p className="leading-relaxed opacity-90">
              {overview.hasPersistenceStore
                ? "Payment settings are actively loaded and saved to the PaymentMethodSetting database table with AuditLog records."
                : overview.persistenceBlocker ||
                  "Settings are safeguarded by the Strategy A bootstrap matrix. COD defaults to enabled, and SSLCOMMERZ respects environment credentials."}
            </p>
            <p className="text-xs opacity-80">
              Authoritative server-side enforcement is active in createOrderAction. Toggling methods updates checkout availability instantly.
            </p>
          </div>
        </div>
      </div>

      {/* Payment Method Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {overview.methods.map((method) => {
          const Icon = getMethodIcon(method.code);
          const canToggle =
            method.code === "COD" ||
            method.code === "SSLCOMMERZ" ||
            method.code === "BKASH" ||
            method.code === "NAGAD";

          return (
            <Card key={method.code} className="border-[#101114]/10 bg-white shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-[#101114]/10 bg-[#F3F0E8]">
                      <Icon className="size-5 text-[#101114]" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold text-[#101114]">
                        {method.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        {method.type.replace("_", " ")} · Code: <code className="font-mono text-[#101114]">{method.code}</code>
                      </CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(method)}
                </div>
              </CardHeader>

              <CardContent className="space-y-4 text-sm">
                <p className="text-muted-foreground leading-relaxed">
                  {method.description}
                </p>

                {/* Environment & Configuration Details */}
                <div className="rounded-md border border-[#101114]/5 bg-[#F3F0E8]/40 p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-muted-foreground">Runtime State:</span>
                    <span className="font-semibold text-[#101114]">
                      {method.isEnabled ? "Available in Checkout" : "Unavailable / Disabled"}
                    </span>
                  </div>

                  {method.environmentMode && (
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-muted-foreground">Environment:</span>
                      <span className="font-mono uppercase text-[#101114]">
                        {method.environmentMode}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="font-medium text-muted-foreground">Credentials Security:</span>
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                      <Lock className="size-3" />
                      Server-only (Never exposed)
                    </span>
                  </div>
                </div>

                {/* Checkout Impact */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Info className="size-3" /> Checkout Impact
                  </p>
                  <p className="text-xs leading-relaxed text-[#101114]/80 bg-[#101114]/[0.02] p-2.5 rounded border border-[#101114]/5">
                    {method.checkoutImpact}
                  </p>
                </div>

                {/* Admin Toggle Control */}
                <div className="pt-3 border-t border-[#101114]/10">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Admin Control:</span>
                    {canToggle ? (
                      <TogglePaymentMethodForm
                        code={method.code as "COD" | "SSLCOMMERZ" | "BKASH" | "NAGAD"}
                        isEnabled={method.isEnabled}
                        isConfigured={method.isConfigured}
                      />
                    ) : (
                      <span className="font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                        Planned in Phase 2 / Future
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Security & Enforcement Summary */}
      <Card className="border-[#101114]/10 bg-[#101114] text-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Lock className="size-4 text-[#00D9FF]" />
            Server-Side Enforcement Guarantees
          </CardTitle>
          <CardDescription className="text-xs text-white/70">
            Payment channel authorization and security policies in VibeLock
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-xs leading-relaxed text-white/80">
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Server-Authoritative:</strong> Checkout methods are enforced by <code className="text-[#00D9FF]">createOrderAction</code>. Bypassing client UI forms will not allow unconfigured or disabled payment methods.
            </li>
            <li>
              <strong>Credential Gating:</strong> Enabling an online gateway in the database requires active credentials in environment variables; missing keys prevent enablement.
            </li>
            <li>
              <strong>In-Flight Safety:</strong> Disabling an online provider prevents new checkout sessions, but callbacks and IPN reconciliation for already-created orders remain active.
            </li>
            <li>
              <strong>Auditability:</strong> All payment setting modifications generate atomic records in the <code className="text-[#00D9FF]">AuditLog</code> table with actor ID and state transitions.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
