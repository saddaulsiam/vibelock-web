"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { CombinedCustomerRiskProfile } from "@/lib/admin/customer-risk";
import {
  AlertTriangle,
  Info,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  Truck,
  UserCheck,
  Ban,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toggleCustomerCodBlockAction } from "@/lib/admin/customer-actions";

interface CustomerRiskWidgetProps {
  initialProfile: CombinedCustomerRiskProfile | null;
  customerPhone?: string | null;
  customerId?: string;
  isCodBlocked?: boolean;
  codBlockReason?: string | null;
}

export function CustomerRiskWidget({
  initialProfile,
  customerPhone,
  customerId,
  isCodBlocked = false,
  codBlockReason = null,
}: CustomerRiskWidgetProps) {
  const router = useRouter();
  const profile = initialProfile;
  const [isBlocked, setIsBlocked] = React.useState(isCodBlocked);
  const [prevCodBlockedProp, setPrevCodBlockedProp] = React.useState(isCodBlocked);
  const [isTogglingCod, setIsTogglingCod] = React.useState(false);

  if (isCodBlocked !== prevCodBlockedProp) {
    setPrevCodBlockedProp(isCodBlocked);
    setIsBlocked(isCodBlocked);
  }

  const handleToggleCod = async () => {
    if (!customerId) return;
    const nextState = !isBlocked;

    const confirmMsg = nextState
      ? "Are you sure you want to restrict Cash on Delivery (COD) for this customer? They will be required to pay online."
      : "Restore Cash on Delivery privileges for this customer?";

    if (!window.confirm(confirmMsg)) return;

    setIsTogglingCod(true);
    try {
      const res = await toggleCustomerCodBlockAction(customerId, nextState);
      if (res.success) {
        setIsBlocked(nextState);
        router.refresh();
      } else {
        alert(res.error || "Failed to update COD privileges.");
      }
    } catch {
      alert("Something went wrong updating COD privileges.");
    } finally {
      setIsTogglingCod(false);
    }
  };

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

        {/* COD Privilege Control */}
        {customerId && (
          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-neutral-200 bg-neutral-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                <Ban className="size-3.5 text-neutral-600" />
                <span>Cash on Delivery (COD) Privilege</span>
                {isBlocked ? (
                  <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                    RESTRICTED
                  </span>
                ) : (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    ALLOWED
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-neutral-500">
                {isBlocked
                  ? `Customer is restricted from COD. Advance online payment required.`
                  : "Customer is allowed to place Cash on Delivery orders."}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleCod}
              disabled={isTogglingCod}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-2xs transition disabled:opacity-50 ${
                isBlocked
                  ? "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                  : "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
              }`}
            >
              {isTogglingCod ? (
                <Loader2 className="size-3 animate-spin" />
              ) : isBlocked ? (
                <CheckCircle2 className="size-3 text-emerald-600" />
              ) : (
                <Ban className="size-3 text-rose-600" />
              )}
              <span>{isBlocked ? "Restore COD Access" : "Restrict COD Orders"}</span>
            </button>
          </div>
        )}
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
          <div className="flex size-9 items-center justify-center rounded-lg bg-white shadow-2xs ring-1 ring-black/5">
            <IconComponent className={`size-5 ${iconClass}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                Courier Risk Assessment
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${badgeClass}`}
              >
                {profile.riskScore.replace("_", " ")}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-neutral-600">{profile.recommendation}</p>
          </div>
        </div>

        {customerPhone && (
          <a
            href={`https://wa.me/${customerPhone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300/80 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50"
          >
            <MessageCircle className="size-3.5 text-emerald-600" />
            <span>Verify on WhatsApp</span>
          </a>
        )}
      </div>

      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Steadfast Courier Stats */}
          <div className="rounded-lg border border-neutral-200/90 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                <Truck className="size-3.5 text-neutral-500" />
                <span>Steadfast Nationwide Network</span>
              </div>
              {st && (
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold text-neutral-700">
                  {st.deliveryRatio}% Success Rate
                </span>
              )}
            </div>

            {st ? (
              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                <div className="rounded border border-neutral-100 bg-neutral-50/70 p-2">
                  <div className="text-[10px] font-medium text-neutral-500 uppercase">Parcels</div>
                  <div className="mt-0.5 font-bold text-neutral-900">{st.totalParcels}</div>
                </div>
                <div className="rounded border border-emerald-100 bg-emerald-50/40 p-2">
                  <div className="text-[10px] font-medium text-emerald-600 uppercase">Delivered</div>
                  <div className="mt-0.5 font-bold text-emerald-800">{st.totalDelivered}</div>
                </div>
                <div className="rounded border border-amber-100 bg-amber-50/40 p-2">
                  <div className="text-[10px] font-medium text-amber-600 uppercase">Cancelled</div>
                  <div className="mt-0.5 font-bold text-amber-800">{st.totalCancelled}</div>
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

        {/* COD Privilege Control */}
        {customerId && (
          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-neutral-200 bg-neutral-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                <Ban className="size-3.5 text-neutral-600" />
                <span>Cash on Delivery (COD) Privilege</span>
                {isBlocked ? (
                  <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                    RESTRICTED
                  </span>
                ) : (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    ALLOWED
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-neutral-500">
                {isBlocked
                  ? `Customer is restricted from COD. Advance online payment required. (${codBlockReason || "Flagged by admin"})`
                  : "Customer is allowed to place Cash on Delivery orders."}
              </p>
            </div>
            <div className="shrink-0">
              <button
                type="button"
                onClick={handleToggleCod}
                disabled={isTogglingCod}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-2xs transition disabled:opacity-50 ${
                  isBlocked
                    ? "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                    : "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                }`}
              >
                {isTogglingCod ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : isBlocked ? (
                  <CheckCircle2 className="size-3 text-emerald-600" />
                ) : (
                  <Ban className="size-3 text-rose-600" />
                )}
                <span>{isBlocked ? "Restore COD Access" : "Restrict COD Orders"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
