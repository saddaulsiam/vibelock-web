"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  updateCheckoutSettingsAction,
  type CheckoutSettingsActionState,
} from "@/lib/admin/settings/checkout-settings-actions";
import type { CheckoutSettings } from "@/lib/settings/checkout-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Hourglass,
  Loader2,
  Lock,
  Save,
  ShieldAlert,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";

const initialState: CheckoutSettingsActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      variant="primary"
      size="default"
      className="gap-2 px-6 shadow-sm"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin text-white" />
          <span>Saving Policies...</span>
        </>
      ) : (
        <>
          <Save className="size-4" />
          <span>Save Checkout Policies</span>
        </>
      )}
    </Button>
  );
}

export function CheckoutSettingsForm({ initialSettings }: { initialSettings: CheckoutSettings }) {
  const [state, action] = useActionState(updateCheckoutSettingsAction, initialState);

  // Local state for switches
  const [requireAdvance, setRequireAdvance] = useState(initialSettings.requireCodAdvanceDeliveryCharge);
  const [enforceOtp, setEnforceOtp] = useState(initialSettings.enforceFirstTimeCodOtp);
  const [allowGuest, setAllowGuest] = useState(initialSettings.allowGuestCheckout);
  const [ttlMinutes, setTtlMinutes] = useState(initialSettings.onlineReservationTtlMinutes);

  return (
    <form action={action} className="space-y-6">
      {/* ── ALERTS (ERROR & SUCCESS) ── */}
      {state.error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-900 shadow-2xs">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-600" />
          <div>
            <h4 className="font-bold">Failed to update checkout policies</h4>
            <p className="mt-0.5 text-xs text-rose-700">{state.error}</p>
          </div>
        </div>
      )}

      {state.message && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm text-emerald-900 shadow-2xs">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div>
            <h4 className="font-bold">Policies updated successfully</h4>
            <p className="mt-0.5 text-xs text-emerald-700">{state.message}</p>
          </div>
        </div>
      )}

      {/* ── SECTION HEADER ── */}
      <div className="border-b border-neutral-200/80 pb-4">
        <h3 className="text-base font-bold text-neutral-900 tracking-tight">
          Checkout & COD Governance
        </h3>
        <p className="text-xs text-neutral-500">
          Cash on delivery limits, upfront courier fee collection, and stock reservation duration
        </p>
      </div>

      {/* ── SECTION 1: COD RISK & FRAUD GOVERNANCE ── */}
      <Card className="border-neutral-200/80 bg-white shadow-2xs rounded-xl overflow-hidden">
        <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
              <ShieldAlert className="size-4.5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base font-bold text-neutral-900">
                Cash on Delivery (COD) Risk Controls
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Mitigate courier return liabilities, fraudulent consignments, and uncollected parcels
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-6 p-6 sm:grid-cols-2">
          {/* Max COD Order Ceiling */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-700 tracking-wide uppercase">
                Maximum COD Order Ceiling (৳) <span className="text-rose-500">*</span>
              </label>
              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] text-amber-800 font-medium">
                Risk Cap
              </Badge>
            </div>
            <Input
              type="number"
              name="maxCodOrderValue"
              defaultValue={initialSettings.maxCodOrderValue}
              min={500}
              step={500}
              className="bg-white font-mono"
            />
            {state.fieldErrors?.maxCodOrderValue && (
              <p className="text-[11px] font-semibold text-rose-600">{state.fieldErrors.maxCodOrderValue[0]}</p>
            )}
            <p className="text-[11px] text-neutral-500">
              Orders exceeding this amount automatically hide COD and mandate online payment (bKash or Cards).
            </p>
          </div>

          {/* First-Time Buyer OTP Verification */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-700 tracking-wide uppercase">
                First-Time Buyer Phone OTP Gate
              </label>
              <div className="flex items-center">
                <input
                  type="hidden"
                  name="enforceFirstTimeCodOtp"
                  value={enforceOtp ? "true" : "false"}
                />
                <button
                  type="button"
                  role="switch"
                  aria-checked={enforceOtp}
                  onClick={() => setEnforceOtp(!enforceOtp)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-vl-cyan-500",
                    enforceOtp ? "bg-vl-cyan-600" : "bg-neutral-300"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                      enforceOtp ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </div>
            <div className="rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3 text-xs">
              <p className="font-semibold text-neutral-800">
                {enforceOtp ? "Mandatory OTP verification for new accounts" : "Standard verification active"}
              </p>
              <p className="mt-0.5 text-[11px] text-neutral-500">
                Requires shoppers without delivery history to verify via SMS OTP before order confirmation.
              </p>
            </div>
          </div>

          {/* Upfront Delivery Charge for COD Orders */}
          <div className="space-y-4 rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-4 sm:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700">
                  <Banknote className="size-4 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-neutral-900 tracking-wide uppercase">
                    Require Upfront Delivery Fee for COD Orders
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    Charges the courier delivery fee upfront via bKash to eliminate fake orders and delivery losses.
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="hidden"
                  name="requireCodAdvanceDeliveryCharge"
                  value={requireAdvance ? "true" : "false"}
                />
                <button
                  type="button"
                  role="switch"
                  aria-checked={requireAdvance}
                  onClick={() => setRequireAdvance(!requireAdvance)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-vl-cyan-500",
                    requireAdvance ? "bg-emerald-600" : "bg-neutral-300"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                      requireAdvance ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </div>

            {requireAdvance && (
              <div className="grid gap-4 pt-3 sm:grid-cols-2 border-t border-neutral-200/60 animate-in fade-in">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700">
                    Advance Fee Inside Dhaka (৳)
                  </label>
                  <Input
                    type="number"
                    name="codAdvanceInsideDhaka"
                    defaultValue={initialSettings.codAdvanceInsideDhaka}
                    min={0}
                    step={10}
                    className="bg-white font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700">
                    Advance Fee Outside Dhaka (৳)
                  </label>
                  <Input
                    type="number"
                    name="codAdvanceOutsideDhaka"
                    defaultValue={initialSettings.codAdvanceOutsideDhaka}
                    min={0}
                    step={10}
                    className="bg-white font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* COD Notice Text */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-semibold text-neutral-700 tracking-wide uppercase">
              Storefront COD Verification Notice
            </label>
            <Input
              name="codOrderNotice"
              defaultValue={initialSettings.codOrderNotice}
              placeholder="e.g. Cash on Delivery orders are subject to telephonic verification before shipment."
              className="bg-white text-xs"
            />
            <p className="text-[11px] text-neutral-500">
              Disclaimer displayed on the checkout review step when COD is selected.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 2: BASKET LIMITS & GUEST CHECKOUT ── */}
      <Card className="border-neutral-200/80 bg-white shadow-2xs rounded-xl overflow-hidden">
        <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
              <ShoppingBag className="size-4.5 text-vl-cyan-600" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base font-bold text-neutral-900">
                Order Value Thresholds & Guest Checkout
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Minimum order limits and customer account requirements
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-6 p-6 sm:grid-cols-2">
          {/* Minimum Order Value */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700 tracking-wide uppercase">
              Minimum Checkout Order Value (৳)
            </label>
            <Input
              type="number"
              name="minOrderValue"
              defaultValue={initialSettings.minOrderValue}
              min={0}
              step={50}
              className="bg-white font-mono"
            />
            {state.fieldErrors?.minOrderValue && (
              <p className="text-[11px] font-semibold text-rose-600">{state.fieldErrors.minOrderValue[0]}</p>
            )}
            <p className="text-[11px] text-neutral-500">
              Set to 0 for no minimum limit. Subtotals below this amount will block checkout submission.
            </p>
          </div>

          {/* Allow Guest Checkout */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-700 tracking-wide uppercase">
                Allow Guest Checkout
              </label>
              <div className="flex items-center">
                <input
                  type="hidden"
                  name="allowGuestCheckout"
                  value={allowGuest ? "true" : "false"}
                />
                <button
                  type="button"
                  role="switch"
                  aria-checked={allowGuest}
                  onClick={() => setAllowGuest(!allowGuest)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-vl-cyan-500",
                    allowGuest ? "bg-emerald-600" : "bg-neutral-300"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                      allowGuest ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </div>
            <div className="rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3 text-xs">
              <p className="font-semibold text-neutral-800">
                {allowGuest ? "Guest checkout enabled" : "Account required for checkout"}
              </p>
              <p className="mt-0.5 text-[11px] text-neutral-500">
                {allowGuest
                  ? "Customers can complete purchases without creating an account or signing in."
                  : "Customers must register or sign in before reaching the final checkout page."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 3: INVENTORY RESERVATION HOLD TTL ── */}
      <Card className="border-neutral-200/80 bg-white shadow-2xs rounded-xl overflow-hidden">
        <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
              <Hourglass className="size-4.5 text-vl-cyan-600" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base font-bold text-neutral-900">
                Online Payment Stock Lock Duration
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Automated stock lock TTL while customer completes payment on hosted gateway sessions
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-6 p-6 sm:grid-cols-2">
          {/* Reservation TTL Minutes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-700 tracking-wide uppercase">
                Reservation Duration (Minutes) <span className="text-rose-500">*</span>
              </label>
              <Badge variant="outline" className="border-neutral-200 bg-neutral-50 text-[10px] text-neutral-700 font-mono">
                {ttlMinutes * 60} Seconds
              </Badge>
            </div>
            <Input
              type="number"
              name="onlineReservationTtlMinutes"
              value={ttlMinutes}
              onChange={(e) => setTtlMinutes(Number(e.target.value))}
              min={5}
              max={120}
              step={5}
              className="bg-white font-mono"
            />
            {state.fieldErrors?.onlineReservationTtlMinutes && (
              <p className="text-[11px] font-semibold text-rose-600">
                {state.fieldErrors.onlineReservationTtlMinutes[0]}
              </p>
            )}
            <p className="text-[11px] text-neutral-500">
              Standard: 15 minutes. High-demand flash sales can use 10 minutes to minimize locked inventory.
            </p>
          </div>

          {/* Explanation Callout */}
          <div className="rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-neutral-800">
              <Lock className="size-3.5 text-emerald-600" />
              <span>Transactional Stock Lock Guarantee</span>
            </div>
            <p className="text-neutral-600 leading-relaxed text-[11px]">
              When a customer enters an online gateway, stock is moved to an{" "}
              <code className="text-neutral-900 font-mono font-bold">InventoryReservation</code> row.
              If the session is abandoned or expires after {ttlMinutes} minutes, the automated background worker
              releases the lock, returning stock to the public storefront immediately.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── BOTTOM ACTION FOOTER (NATURAL FLOW, NO FLOATING) ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-neutral-200/80 bg-white p-4 shadow-2xs">
        <div className="text-xs text-neutral-500">
          <span>Checkout policy changes apply to new checkout sessions and are recorded in </span>
          <code className="font-mono text-neutral-900 font-semibold">AuditLog</code>.
        </div>
        <div className="flex items-center justify-end">
          <SubmitButton />
        </div>
      </div>
    </form>
  );
}
