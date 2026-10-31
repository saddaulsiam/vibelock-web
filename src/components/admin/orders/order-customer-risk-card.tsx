"use client";

import * as React from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  UserCheck,
  RotateCw,
  Truck,
  ShoppingBag,
  ExternalLink,
  Copy,
  Check,
  MessageSquare,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { checkCustomerRiskAction } from "@/lib/admin/order-actions";
import type { CombinedCustomerRiskProfile } from "@/lib/admin/customer-risk";
import { generateWhatsAppUrl } from "@/components/admin/orders/admin-order-badges";

function formatBdt(value: unknown): string {
  const num = typeof value === "number" ? value : Number(value || 0);
  const [integerPart, fractionPart] = (Number.isFinite(num) ? num : 0).toFixed(2).split(".");
  const sign = integerPart.startsWith("-") ? "-" : "";
  const unsignedInteger = sign ? integerPart.slice(1) : integerPart;
  const groupedInteger = unsignedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `৳${sign}${groupedInteger}.${fractionPart ?? "00"}`;
}

interface OrderCustomerRiskCardProps {
  initialProfile: CombinedCustomerRiskProfile;
  orderNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  userId?: string | null;
  orderId: string;
}

export function OrderCustomerRiskCard({
  initialProfile,
  orderNumber,
  customerName,
  customerPhone,
  customerEmail,
  userId,
  orderId,
}: OrderCustomerRiskCardProps) {
  const [profile, setProfile] = React.useState<CombinedCustomerRiskProfile>(initialProfile);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [copiedPhone, setCopiedPhone] = React.useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await checkCustomerRiskAction({
        phone: customerPhone,
        email: customerEmail,
        userId,
        currentOrderId: orderId,
      });
      if (res.success && res.profile) {
        setProfile(res.profile);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const copyPhoneNumber = () => {
    if (!customerPhone) return;
    navigator.clipboard.writeText(customerPhone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const isLowRisk = profile.riskScore === "LOW_RISK";
  const isHighRisk = profile.riskScore === "HIGH_RISK";
  const isModerateRisk = profile.riskScore === "MODERATE_RISK";
  const isNewCustomer = profile.riskScore === "NEW_CUSTOMER";

  const st = profile.steadfastStats;
  const store = profile.storeStats;

  // Header Theme Styles
  let cardBorder = "border-neutral-200/90";
  let bannerBg = "bg-neutral-50/80 border-neutral-100";
  let badgeClass = "bg-neutral-100 text-neutral-800 border-neutral-300";
  let IconComponent = Info;
  let iconClass = "text-neutral-600";

  if (isHighRisk) {
    cardBorder = "border-red-200";
    bannerBg = "bg-red-50/70 border-red-200/80";
    badgeClass = "bg-red-100 text-red-900 border-red-300";
    IconComponent = ShieldAlert;
    iconClass = "text-red-600";
  } else if (isLowRisk) {
    cardBorder = "border-emerald-200";
    bannerBg = "bg-emerald-50/60 border-emerald-200/80";
    badgeClass = "bg-emerald-100 text-emerald-900 border-emerald-300";
    IconComponent = ShieldCheck;
    iconClass = "text-emerald-600";
  } else if (isModerateRisk) {
    cardBorder = "border-amber-200";
    bannerBg = "bg-amber-50/60 border-amber-200/80";
    badgeClass = "bg-amber-100 text-amber-900 border-amber-300";
    IconComponent = AlertTriangle;
    iconClass = "text-amber-600";
  } else if (isNewCustomer) {
    cardBorder = "border-blue-200";
    bannerBg = "bg-blue-50/60 border-blue-200/80";
    badgeClass = "bg-blue-100 text-blue-900 border-blue-300";
    IconComponent = UserCheck;
    iconClass = "text-blue-600";
  }

  return (
    <div className={`overflow-hidden rounded-xl border ${cardBorder} bg-white shadow-2xs`}>
      {/* ── Intelligence Header & Status Banner ── */}
      <div className={`border-b ${bannerBg} p-4 sm:p-5`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-2xs">
              <IconComponent className={`size-5 ${iconClass}`} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold tracking-wider text-neutral-500 uppercase">
                  Customer Trust &amp; Fraud Intelligence
                </span>
                <Badge variant="outline" className={`font-bold ${badgeClass}`}>
                  {profile.riskLabel}
                </Badge>
              </div>
              <h4 className="mt-1 text-sm font-black text-neutral-900 sm:text-base">
                {profile.headline}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-semibold text-neutral-700 shadow-2xs transition hover:bg-neutral-50 disabled:opacity-50"
              title="Refresh live fraud check from Steadfast API"
            >
              <RotateCw className={`size-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
              <span className="hidden md:inline">Check API</span>
            </button>
          </div>
        </div>

        {/* Actionable Advice Pill */}
        <div className="mt-3.5 flex items-center gap-2 rounded-lg bg-white/90 p-2.5 text-xs font-medium text-neutral-800 shadow-2xs">
          <span className="font-bold text-neutral-900">Advice:</span>
          <span>{profile.recommendation}</span>
        </div>
      </div>

      {/* ── Content Grid: Steadfast Courier Network vs VibeLock Store History ── */}
      <div className="grid grid-cols-1 divide-y divide-neutral-100 p-5 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {/* Left: Steadfast Courier Nationwide Network Stats */}
        <div className="space-y-3.5 sm:pr-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="size-4 text-purple-600" />
              <h5 className="text-xs font-bold tracking-wider text-neutral-900 uppercase">
                Steadfast Network History
              </h5>
            </div>
            {st?.success ? (
              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                Live Data
              </span>
            ) : (
              <span className="text-[10px] font-medium text-neutral-400">
                {st?.error || "No Phone"}
              </span>
            )}
          </div>

          {st && st.totalParcels > 0 ? (
            <div className="space-y-2.5 text-xs">
              {/* Delivery Ratio Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-neutral-600">Nationwide Success Rate</span>
                  <span className={st.deliveryRatio >= 80 ? "text-emerald-700" : st.deliveryRatio < 60 ? "text-red-600" : "text-amber-700"}>
                    {st.deliveryRatio}% Delivered
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className={`h-full transition-all duration-500 ${
                      st.deliveryRatio >= 80
                        ? "bg-emerald-500"
                        : st.deliveryRatio < 60
                        ? "bg-red-500"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, st.deliveryRatio))}%` }}
                  />
                </div>
              </div>

              {/* Numerical Counts Breakdown */}
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-neutral-50 p-2.5 text-center">
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">Total</span>
                  <p className="mt-0.5 text-sm font-black text-neutral-900">{st.totalParcels}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">Delivered</span>
                  <p className="mt-0.5 text-sm font-black text-emerald-700">{st.totalDelivered}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-red-700 uppercase">Cancelled</span>
                  <p className="mt-0.5 text-sm font-black text-red-700">{st.totalCancelled}</p>
                </div>
              </div>

              {/* Fraud Report Alert Tag if any */}
              {st.fraudReportsCount > 0 ? (
                <div className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 p-2 text-xs font-bold text-red-800">
                  <ShieldAlert className="size-4 shrink-0 text-red-600" />
                  <span>Flagged: {st.fraudReportsCount} fraud report(s) on Steadfast!</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[11px] text-neutral-500">
                  <ShieldCheck className="size-3.5 text-emerald-600" />
                  <span>0 fraud reports recorded across merchants</span>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg bg-neutral-50 p-3 text-center text-xs text-neutral-500">
              <p className="font-semibold text-neutral-700">No Steadfast History</p>
              <p className="mt-0.5 text-[11px] text-neutral-400">
                Customer hasn&apos;t received parcels via Steadfast with this number yet.
              </p>
            </div>
          )}
        </div>

        {/* Right: VibeLock Internal Store Purchases */}
        <div className="space-y-3.5 pt-4 sm:pt-0 sm:pl-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="size-4 text-blue-600" />
              <h5 className="text-xs font-bold tracking-wider text-neutral-900 uppercase">
                VibeLock Store History
              </h5>
            </div>
            {store.isRepeatCustomer ? (
              <Badge variant="outline" className="border-blue-300 bg-blue-50 text-[10px] font-bold text-blue-800">
                Repeat Customer
              </Badge>
            ) : (
              <span className="text-[10px] font-medium text-neutral-400">1st Order</span>
            )}
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-neutral-50 p-2.5">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Past Orders</span>
                <p className="mt-0.5 text-sm font-black text-neutral-900">
                  {store.totalOrders}{" "}
                  <span className="text-xs font-normal text-neutral-500">
                    ({store.deliveredOrders} delivered)
                  </span>
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Lifetime Spent (LTV)</span>
                <p className="mt-0.5 text-sm font-black text-neutral-900">
                  {formatBdt(store.totalSpent)}
                </p>
              </div>
            </div>

            {/* Quick Contact & Copy Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-neutral-100">
              {customerPhone ? (
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-neutral-800">
                    {customerPhone}
                  </span>
                  <button
                    onClick={copyPhoneNumber}
                    className="inline-flex size-6 items-center justify-center rounded border border-neutral-200 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
                    title="Copy phone number"
                  >
                    {copiedPhone ? (
                      <Check className="size-3 text-emerald-600" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                </div>
              ) : (
                <span className="text-xs text-neutral-400">No phone provided</span>
              )}

              {customerPhone ? (
                <a
                  href={generateWhatsAppUrl(customerPhone, orderNumber, customerName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
                >
                  <MessageSquare className="size-3 text-emerald-600" />
                  <span>WhatsApp Check</span>
                  <ExternalLink className="size-2.5 opacity-60" />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
