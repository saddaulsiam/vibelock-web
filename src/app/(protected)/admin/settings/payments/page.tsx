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
  Lock,
  Smartphone,
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
    <div className="space-y-6">
      {/* ── TOP SECTION CONTEXT ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-200/80 pb-4">
        <div>
          <h3 className="text-base font-bold tracking-tight text-neutral-900">
            Configured Payment Channels
          </h3>
          <p className="text-xs text-neutral-500">
            Control customer checkout availability, payment gateway routing, and settlement ledger modes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-neutral-200 bg-neutral-50 text-neutral-600 text-xs font-mono">
            SERVER_GATE: createOrderAction
          </Badge>
        </div>
      </div>

      {/* ── PAYMENT METHOD CARDS (3-COLUMN RESPONSIVE GRID) ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {overview.methods.map((method) => {
          const visual = getMethodVisualConfig(method.code);
          const Icon = visual.icon;
          const canToggle =
            method.code === "COD" || method.code === "BKASH" || method.code === "PAYSTATION";

          return (
            <Card
              key={method.code}
              className="border-neutral-200/80 bg-white shadow-2xs rounded-xl flex flex-col justify-between overflow-hidden transition-all duration-200 hover:shadow-md"
            >
              <div>
                <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 p-5 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex size-11 shrink-0 items-center justify-center rounded-xl border shadow-2xs",
                          visual.avatarBg
                        )}
                      >
                        <Icon className="size-5.5" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold tracking-tight text-neutral-900">
                          {method.name}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1.5 text-xs text-neutral-500">
                          <span>{visual.railLabel}</span>
                          <span>·</span>
                          <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[10px] font-semibold text-neutral-700">
                            {method.code}
                          </code>
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(method)}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 p-5 text-sm">
                  <p className="text-xs leading-relaxed text-neutral-600 min-h-8">
                    {method.description}
                  </p>

                  {/* Technical Configuration Specs */}
                  <div className="space-y-2 rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-neutral-500">Checkout State:</span>
                      <span
                        className={cn(
                          "font-bold",
                          method.isEnabled ? "text-emerald-700" : "text-neutral-500"
                        )}
                      >
                        {method.isEnabled ? "Available in Checkout" : "Disabled"}
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
                      <span className="font-medium text-neutral-500">Credential Guard:</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                        <Lock className="size-3" />
                        Server-Only Gated
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
                    <p className="mt-1 leading-relaxed text-neutral-700 text-[11px]">
                      {method.checkoutImpact}
                    </p>
                  </div>
                </CardContent>
              </div>

              {/* Card Action Control Footer */}
              <div className="border-t border-neutral-200/80 bg-neutral-50/50 p-4">
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
  );
}
