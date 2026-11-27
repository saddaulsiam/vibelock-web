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
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

function SectionSubmitButton({ label = "Save Changes" }: { label?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      variant="primary"
      size="sm"
      className="gap-2 px-4 font-semibold shadow-2xs"
    >
      {pending ? (
        <>
          <Loader2 className="size-3.5 animate-spin text-white" />
          <span>Saving...</span>
        </>
      ) : (
        <>
          <Save className="size-3.5" />
          <span>{label}</span>
        </>
      )}
    </Button>
  );
}

function SectionAlert({ error, message }: { error?: string | null; message?: string | null }) {
  if (error) {
    return (
      <div className="mx-5 mt-3 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-900 shadow-2xs">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-600" />
        <span className="font-medium">{error}</span>
      </div>
    );
  }
  if (message) {
    return (
      <div className="mx-5 mt-3 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/90 p-3 text-xs text-emerald-900 shadow-2xs">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
        <span className="font-medium">{message}</span>
      </div>
    );
  }
  return null;
}

export function CheckoutSettingsForm({ initialSettings }: { initialSettings: CheckoutSettings }) {
  const [codState, codAction] = useActionState(updateCheckoutSettingsAction, initialState);
  const [orderLimitsState, orderLimitsAction] = useActionState(updateCheckoutSettingsAction, initialState);
  const [ttlState, ttlAction] = useActionState(updateCheckoutSettingsAction, initialState);

  // Local state for switches
  const [requireAdvance, setRequireAdvance] = useState(
    initialSettings.requireCodAdvanceDeliveryCharge
  );
  const [advanceMode, setAdvanceMode] = useState<"MANUAL_VERIFICATION" | "AUTOMATED_GATEWAY">(
    initialSettings.codAdvanceCollectionMode ?? "MANUAL_VERIFICATION"
  );
  const [enforceOtp, setEnforceOtp] = useState(initialSettings.enforceFirstTimeCodOtp);
  const [allowGuest, setAllowGuest] = useState(initialSettings.allowGuestCheckout);
  const [ttlMinutes, setTtlMinutes] = useState(initialSettings.onlineReservationTtlMinutes);

  return (
    <div className="space-y-4">
      {/* ── SECTION 1: COD RISK & FRAUD GOVERNANCE ── */}
      <form action={codAction}>
        <Card className="overflow-hidden rounded-xl border-neutral-200/80 bg-white shadow-2xs">
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

          <SectionAlert error={codState.error} message={codState.message} />

          <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
            {/* Max COD Order Ceiling */}
            <div className="space-y-1">
              <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
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
              {codState.fieldErrors?.maxCodOrderValue && (
                <p className="text-[11px] font-semibold text-rose-600">
                  {codState.fieldErrors.maxCodOrderValue[0]}
                </p>
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
              <Switch
                name="enforceFirstTimeCodOtp"
                checked={enforceOtp}
                onCheckedChange={setEnforceOtp}
                aria-label="Verify First-Time Buyers via Phone OTP"
              />
            </div>

            {/* Upfront Delivery Charge for COD Orders */}
            <div className="space-y-3 rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-3.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-7.5 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700">
                    <Banknote className="size-3.5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold tracking-wide text-neutral-900 uppercase">
                      Require Upfront Delivery Fee for COD
                    </h4>
                    <p className="text-[11px] text-neutral-500">
                      Charges courier fee upfront via online payment to confirm cash on delivery
                      orders
                    </p>
                  </div>
                </div>

                <Switch
                  name="requireCodAdvanceDeliveryCharge"
                  checked={requireAdvance}
                  onCheckedChange={setRequireAdvance}
                  activeColor="emerald"
                  aria-label="Require Upfront Delivery Fee for COD"
                />
              </div>

              {requireAdvance && (
                <div className="animate-in fade-in space-y-3.5 border-t border-neutral-200/60 pt-3">
                  <div className="grid gap-3 sm:grid-cols-2">
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

                  {/* Advance Collection Mode (পদ্ধতি ১ বনাম পদ্ধতি ২) */}
                  <div className="space-y-2 rounded-lg border border-neutral-200/80 bg-white p-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                      Advance Collection Mode
                    </label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label
                        className={cn(
                          "flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-all text-xs",
                          advanceMode === "MANUAL_VERIFICATION"
                            ? "border-vl-cyan-500 bg-vl-cyan-50/20 font-semibold text-neutral-950"
                            : "border-neutral-200 bg-neutral-50/50 text-neutral-700 hover:bg-neutral-50"
                        )}
                      >
                        <input
                          type="radio"
                          name="codAdvanceCollectionMode"
                          value="MANUAL_VERIFICATION"
                          checked={advanceMode === "MANUAL_VERIFICATION"}
                          onChange={() => setAdvanceMode("MANUAL_VERIFICATION")}
                          className="mt-0.5 text-vl-cyan-600 focus:ring-vl-cyan-500"
                        />
                        <div>
                          <p className="font-semibold text-neutral-900">পদ্ধতি ১: Manual Call / SMS Verification</p>
                          <p className="text-[11px] font-normal text-neutral-500 mt-0.5">
                            Order is placed as COD. Customer receives your bKash number on success page and SMS. Team confirms order over phone.
                          </p>
                        </div>
                      </label>

                      <label
                        className={cn(
                          "flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-all text-xs",
                          advanceMode === "AUTOMATED_GATEWAY"
                            ? "border-vl-cyan-500 bg-vl-cyan-50/20 font-semibold text-neutral-950"
                            : "border-neutral-200 bg-neutral-50/50 text-neutral-700 hover:bg-neutral-50"
                        )}
                      >
                        <input
                          type="radio"
                          name="codAdvanceCollectionMode"
                          value="AUTOMATED_GATEWAY"
                          checked={advanceMode === "AUTOMATED_GATEWAY"}
                          onChange={() => setAdvanceMode("AUTOMATED_GATEWAY")}
                          className="mt-0.5 text-vl-cyan-600 focus:ring-vl-cyan-500"
                        />
                        <div>
                          <p className="font-semibold text-neutral-900">পদ্ধতি ২: Automated Gateway Payment</p>
                          <p className="text-[11px] font-normal text-neutral-500 mt-0.5">
                            Checkout redirects to bKash/PayStation to collect the ৳100/৳150 advance immediately before confirming order.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* MFS Payment Number & Customer Instructions */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-neutral-700">
                        bKash / Nagad Number for Advance (Method 1)
                      </label>
                      <Input
                        name="codAdvancePaymentNumber"
                        defaultValue={initialSettings.codAdvancePaymentNumber || "01311333277"}
                        placeholder="e.g. 01311333277"
                        className="bg-white font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-neutral-700">
                        Custom Advance Instruction for Shoppers
                      </label>
                      <Input
                        name="codAdvanceInstructions"
                        defaultValue={
                          initialSettings.codAdvanceInstructions ||
                          "Send courier advance via bKash/Nagad to confirm order dispatch. Our representative will also call you."
                        }
                        placeholder="Instruction displayed on Order Success page and SMS"
                        className="bg-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* COD Notice Text */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
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

          <CardFooter className="flex flex-col gap-2 border-t border-neutral-100 bg-neutral-50/50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-neutral-500">
              Configure maximum COD order limits and advance delivery charge rules.
            </p>
            <SectionSubmitButton label="Save COD Rules" />
          </CardFooter>
        </Card>
      </form>

      {/* ── SECTION 2: BASKET LIMITS & GUEST CHECKOUT ── */}
      <form action={orderLimitsAction}>
        <Card className="overflow-hidden rounded-xl border-neutral-200/80 bg-white shadow-2xs">
          <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
                <ShoppingBag className="text-vl-cyan-600 size-4" />
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

          <SectionAlert error={orderLimitsState.error} message={orderLimitsState.message} />

          <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
            {/* Minimum Order Value */}
            <div className="space-y-1">
              <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
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
              {orderLimitsState.fieldErrors?.minOrderValue && (
                <p className="text-[11px] font-semibold text-rose-600">
                  {orderLimitsState.fieldErrors.minOrderValue[0]}
                </p>
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
              <Switch
                name="allowGuestCheckout"
                checked={allowGuest}
                onCheckedChange={setAllowGuest}
                activeColor="emerald"
                aria-label="Allow Guest Checkout"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 border-t border-neutral-100 bg-neutral-50/50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-neutral-500">
              Set minimum checkout thresholds and customer authentication requirements.
            </p>
            <SectionSubmitButton label="Save Order Limits" />
          </CardFooter>
        </Card>
      </form>

      {/* ── SECTION 3: INVENTORY RESERVATION HOLD TTL ── */}
      <form action={ttlAction}>
        <Card className="overflow-hidden rounded-xl border-neutral-200/80 bg-white shadow-2xs">
          <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
                <Hourglass className="text-vl-cyan-600 size-4" />
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

          <SectionAlert error={ttlState.error} message={ttlState.message} />

          <CardContent className="p-5">
            <div className="max-w-md space-y-1">
              <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
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
              {ttlState.fieldErrors?.onlineReservationTtlMinutes && (
                <p className="text-[11px] font-semibold text-rose-600">
                  {ttlState.fieldErrors.onlineReservationTtlMinutes[0]}
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 border-t border-neutral-100 bg-neutral-50/50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-neutral-500">
              Controls temporary inventory reservation hold time for digital payment gateways.
            </p>
            <SectionSubmitButton label="Save Stock Hold" />
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
