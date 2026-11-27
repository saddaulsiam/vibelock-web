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
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Hourglass,
  Loader2,
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
    <form action={action} className="space-y-4">
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

      {/* ── SECTION 1: COD RISK & FRAUD GOVERNANCE ── */}
      <Card className="border-neutral-200/80 bg-white shadow-2xs rounded-xl overflow-hidden">
        <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
              <ShieldAlert className="size-4 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-neutral-900">
                Cash on Delivery (COD) Rules
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Order limits and fraud protection for cash on delivery purchases
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          {/* Max COD Order Ceiling */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700 tracking-wide uppercase">
              Maximum COD Order Ceiling (৳) <span className="text-rose-500">*</span>
            </label>
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
          </div>

          {/* First-Time Buyer OTP Verification */}
          <div className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3">
            <div>
              <span className="text-xs font-semibold text-neutral-900">
                Verify First-Time Buyers via Phone OTP
              </span>
              <p className="text-[11px] text-neutral-500">
                Requires shoppers without delivery history to verify via SMS OTP
              </p>
            </div>
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

          {/* Upfront Delivery Charge for COD Orders */}
          <div className="space-y-3 rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-3.5 sm:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7.5 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700">
                  <Banknote className="size-3.5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-neutral-900 tracking-wide uppercase">
                    Require Upfront Delivery Fee for COD
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    Charges courier fee upfront via online payment to confirm cash on delivery orders
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
              <div className="grid gap-3 pt-2.5 sm:grid-cols-2 border-t border-neutral-200/60 animate-in fade-in">
                <div className="space-y-1">
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

                <div className="space-y-1">
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
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-semibold text-neutral-700 tracking-wide uppercase">
              Storefront COD Verification Notice
            </label>
            <Input
              name="codOrderNotice"
              defaultValue={initialSettings.codOrderNotice}
              placeholder="Cash on Delivery orders are subject to verification before shipment."
              className="bg-white text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 2: BASKET LIMITS & GUEST CHECKOUT ── */}
      <Card className="border-neutral-200/80 bg-white shadow-2xs rounded-xl overflow-hidden">
        <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
              <ShoppingBag className="size-4 text-vl-cyan-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-neutral-900">
                Order Value & Guest Checkout
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Minimum purchase threshold and customer account requirements
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          {/* Minimum Order Value */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700 tracking-wide uppercase">
              Minimum Checkout Order Value (৳)
            </label>
            <Input
              type="number"
              name="minOrderValue"
              defaultValue={initialSettings.minOrderValue}
              min={0}
              step={50}
              placeholder="0 (no minimum)"
              className="bg-white font-mono"
            />
            {state.fieldErrors?.minOrderValue && (
              <p className="text-[11px] font-semibold text-rose-600">{state.fieldErrors.minOrderValue[0]}</p>
            )}
          </div>

          {/* Allow Guest Checkout */}
          <div className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3">
            <div>
              <span className="text-xs font-semibold text-neutral-900">Allow Guest Checkout</span>
              <p className="text-[11px] text-neutral-500">
                Allow customers to place orders without creating an account
              </p>
            </div>
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
        </CardContent>
      </Card>

      {/* ── SECTION 3: INVENTORY RESERVATION HOLD TTL ── */}
      <Card className="border-neutral-200/80 bg-white shadow-2xs rounded-xl overflow-hidden">
        <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
              <Hourglass className="size-4 text-vl-cyan-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-neutral-900">
                Online Payment Stock Hold Duration
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Duration to hold reserved inventory while customers complete online checkout
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          <div className="max-w-md space-y-1">
            <label className="text-xs font-semibold text-neutral-700 tracking-wide uppercase">
              Reservation Duration (Minutes) <span className="text-rose-500">*</span>
            </label>
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
          </div>
        </CardContent>
      </Card>

      {/* ── BOTTOM ACTION FOOTER (NATURAL FLOW, NO FLOATING) ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-neutral-200/80 bg-white p-3.5 sm:px-4 shadow-2xs">
        <div className="text-xs text-neutral-500">
          <span>Checkout rules apply immediately to new customer checkout sessions.</span>
        </div>
        <div className="flex items-center justify-end">
          <SubmitButton />
        </div>
      </div>
    </form>
  );
}
