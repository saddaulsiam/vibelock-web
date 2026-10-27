"use client";

import type { CombinedCustomerRiskProfile } from "@/lib/admin/customer-risk";
import {
  AlertTriangle,
  Info,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  Truck,
  UserCheck,
} from "lucide-react";

interface CustomerRiskWidgetProps {
  initialProfile: CombinedCustomerRiskProfile | null;
  customerPhone?: string | null;
}

export function CustomerRiskWidget({ initialProfile, customerPhone }: CustomerRiskWidgetProps) {
  const profile = initialProfile;

  if (!profile) {
    return (
      <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
        <div className="flex items-center gap-2 text-neutral-500">
          <Info className="size-4" />
          <span className="text-xs font-semibold">Courier Fraud Intelligence</span>
        </div>
        <p className="mt-2 text-xs text-neutral-400">
          No courier risk data could be retrieved. Ensure customer has a valid phone number.
        </p>
      </div>
    );
  }

  const isLowRisk = profile.riskScore === "LOW_RISK";
  const isHighRisk = profile.riskScore === "HIGH_RISK";
  const isModerateRisk = profile.riskScore === "MODERATE_RISK";
  const isNewCustomer = profile.riskScore === "NEW_CUSTOMER";

  const st = profile.steadfastStats;
  const store = profile.storeStats;

  let cardBorder = "border-neutral-200/90";
  let bannerBg = "bg-neutral-50/80 border-neutral-200";
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
    bannerBg = "bg-emerald-50/70 border-emerald-200/80";
    badgeClass = "bg-emerald-100 text-emerald-900 border-emerald-300";
    IconComponent = ShieldCheck;
    iconClass = "text-emerald-600";
  } else if (isModerateRisk) {
    cardBorder = "border-amber-200";
    bannerBg = "bg-amber-50/70 border-amber-200/80";
    badgeClass = "bg-amber-100 text-amber-900 border-amber-300";
    IconComponent = AlertTriangle;
    iconClass = "text-amber-600";
  } else if (isNewCustomer) {
    cardBorder = "border-blue-200";
    bannerBg = "bg-blue-50/70 border-blue-200/80";
    badgeClass = "bg-blue-100 text-blue-900 border-blue-300";
    IconComponent = UserCheck;
    iconClass = "text-blue-600";
  }

  return (
    <div className={`overflow-hidden rounded-xl border ${cardBorder} bg-white shadow-2xs`}>
      {/* Risk Banner Header */}
      <div className={`flex flex-wrap items-center justify-between gap-3 border-b p-4 ${bannerBg}`}>
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/90 shadow-2xs">
            <IconComponent className={`size-5 ${iconClass}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-neutral-600 uppercase">
                Courier & COD Fraud Intelligence
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${badgeClass}`}
              >
                {profile.riskLabel}
              </span>
            </div>
            <p className="mt-0.5 text-xs font-semibold text-neutral-900">{profile.headline}</p>
          </div>
        </div>

        {customerPhone && (
          <a
            href={`https://wa.me/${customerPhone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-2xs transition hover:bg-emerald-100"
          >
            <MessageCircle className="size-3.5 text-emerald-600" />
            <span>Verify via WhatsApp</span>
          </a>
        )}
      </div>

      {/* Intelligence Cards Body */}
      <div className="space-y-4 p-4">
        {/* Recommendation Box */}
        <div className="rounded-lg border border-neutral-200/70 bg-neutral-50/70 p-3 text-xs leading-relaxed text-neutral-700">
          <strong className="font-semibold text-neutral-900">COD Recommendation: </strong>
          {profile.recommendation}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Steadfast Courier Stats */}
          <div className="rounded-lg border border-neutral-200/90 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                <Truck className="size-3.5 text-neutral-500" />
                <span>Steadfast Courier Track Record</span>
              </div>
              {st && (
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold text-neutral-700">
                  {st.deliveryRatio}% Delivered
                </span>
              )}
            </div>

            {st ? (
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded border border-neutral-100 bg-neutral-50/60 p-2">
                  <div className="text-[10px] font-medium text-neutral-400 uppercase">Parcels</div>
                  <div className="mt-0.5 font-bold text-neutral-800">{st.totalParcels}</div>
                </div>
                <div className="rounded border border-emerald-100 bg-emerald-50/40 p-2">
                  <div className="text-[10px] font-medium text-emerald-600 uppercase">
                    Delivered
                  </div>
                  <div className="mt-0.5 font-bold text-emerald-800">{st.totalDelivered}</div>
                </div>
                <div className="rounded border border-red-100 bg-red-50/40 p-2">
                  <div className="text-[10px] font-medium text-red-600 uppercase">
                    Fraud Reports
                  </div>
                  <div className="mt-0.5 font-bold text-red-800">{st.fraudReportsCount}</div>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-neutral-400 italic">
                No external courier data available for this phone number.
              </p>
            )}
          </div>

          {/* VibeLock Store Lifetime Stats */}
          <div className="rounded-lg border border-neutral-200/90 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                <UserCheck className="size-3.5 text-neutral-500" />
                <span>VibeLock Store History</span>
              </div>
              <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold text-neutral-700">
                {store.totalOrders} Total Orders
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded border border-emerald-100 bg-emerald-50/40 p-2">
                <div className="text-[10px] font-medium text-emerald-600 uppercase">Completed</div>
                <div className="mt-0.5 font-bold text-emerald-800">{store.deliveredOrders}</div>
              </div>
              <div className="rounded border border-amber-100 bg-amber-50/40 p-2">
                <div className="text-[10px] font-medium text-amber-600 uppercase">Pending</div>
                <div className="mt-0.5 font-bold text-amber-800">{store.pendingOrders}</div>
              </div>
              <div className="rounded border border-red-100 bg-red-50/40 p-2">
                <div className="text-[10px] font-medium text-red-600 uppercase">Cancelled</div>
                <div className="mt-0.5 font-bold text-red-800">{store.cancelledOrders}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
