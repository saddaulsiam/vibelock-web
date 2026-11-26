"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  updateShippingRulesAction,
  type ShippingRulesActionState,
} from "@/lib/admin/settings/shipping-rules-actions";
import type { ShippingRulesSettings } from "@/lib/settings/shipping-rules-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Loader2,
  Save,
  Sparkles,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const initialState: ShippingRulesActionState = { error: null };

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
          <span>Saving Logistics Rules...</span>
        </>
      ) : (
        <>
          <Save className="size-4" />
          <span>Save Shipping Configuration</span>
        </>
      )}
    </Button>
  );
}

export function ShippingRulesForm({ initialSettings }: { initialSettings: ShippingRulesSettings }) {
  const [state, action] = useActionState(updateShippingRulesAction, initialState);

  const [freeShippingEnabled, setFreeShippingEnabled] = useState(initialSettings.enableFreeShipping);
  const [scope, setScope] = useState(initialSettings.freeShippingScope);
  const [courier, setCourier] = useState(initialSettings.primaryCourier);
  const [autoConsign, setAutoConsign] = useState(initialSettings.autoCreateConsignment);

  return (
    <form action={action} className="space-y-8">
      {/* ── ALERTS (ERROR & SUCCESS) ── */}
      {state.error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-900 shadow-2xs">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-600" />
          <div>
            <h4 className="font-bold">Failed to update shipping rules</h4>
            <p className="mt-0.5 text-xs text-rose-700">{state.error}</p>
          </div>
        </div>
      )}

      {state.message && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-900 shadow-2xs">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div>
            <h4 className="font-bold">Shipping rules updated successfully</h4>
            <p className="mt-0.5 text-xs text-emerald-700">{state.message}</p>
          </div>
        </div>
      )}

      {/* ── SECTION 1: FREE SHIPPING INCENTIVE ENGINE ── */}
      <Card className="border-vl-dark-900/10 bg-white shadow-2xs">
        <CardHeader className="border-b border-vl-dark-900/5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700">
                <Sparkles className="size-4.5" />
              </div>
              <div>
                <CardTitle className="text-vl-dark-900 text-base font-bold">
                  Free Shipping Incentive Engine
                </CardTitle>
                <CardDescription className="text-xs">
                  Automated cart delivery fee waivers to boost Average Order Value (AOV)
                </CardDescription>
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center gap-2">
              <input
                type="hidden"
                name="enableFreeShipping"
                value={freeShippingEnabled ? "true" : "false"}
              />
              <button
                type="button"
                onClick={() => setFreeShippingEnabled(!freeShippingEnabled)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-vl-cyan-500",
                  freeShippingEnabled ? "bg-emerald-600" : "bg-neutral-300"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                    freeShippingEnabled ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-6 p-5 sm:grid-cols-2">
          {/* Threshold Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Free Shipping Cart Threshold (৳) <span className="text-rose-500">*</span>
              </label>
              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-[10px] text-emerald-800">
                AOV Accelerator
              </Badge>
            </div>
            <Input
              type="number"
              name="freeShippingThreshold"
              defaultValue={initialSettings.freeShippingThreshold}
              min={500}
              step={100}
              disabled={!freeShippingEnabled}
              className="bg-white font-mono"
            />
            {state.fieldErrors?.freeShippingThreshold && (
              <p className="text-[11px] font-semibold text-rose-600">
                {state.fieldErrors.freeShippingThreshold[0]}
              </p>
            )}
            <p className="text-[11px] text-neutral-500">
              Orders with product subtotal equal to or exceeding this amount receive free delivery.
            </p>
          </div>

          {/* Scope Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Applicability Geographic Scope
            </label>
            <input type="hidden" name="freeShippingScope" value={scope} />
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                disabled={!freeShippingEnabled}
                onClick={() => setScope("NATIONWIDE")}
                className={cn(
                  "rounded-lg border p-2.5 text-xs font-bold transition-all text-left",
                  scope === "NATIONWIDE"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500"
                    : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                )}
              >
                <span>Nationwide BD</span>
                <span className="block text-[10px] font-normal text-neutral-500">Inside + Outside Dhaka</span>
              </button>

              <button
                type="button"
                disabled={!freeShippingEnabled}
                onClick={() => setScope("INSIDE_DHAKA_ONLY")}
                className={cn(
                  "rounded-lg border p-2.5 text-xs font-bold transition-all text-left",
                  scope === "INSIDE_DHAKA_ONLY"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500"
                    : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                )}
              >
                <span>Dhaka Metro Only</span>
                <span className="block text-[10px] font-normal text-neutral-500">Excludes Outside Dhaka</span>
              </button>
            </div>
          </div>

          {/* Banner Text */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Customer Banner Announcement
            </label>
            <Input
              name="freeShippingBannerText"
              defaultValue={initialSettings.freeShippingBannerText}
              disabled={!freeShippingEnabled}
              placeholder="e.g. Free standard delivery on all nationwide orders above ৳2,500!"
              className="bg-white text-xs"
            />
            <p className="text-[11px] text-neutral-500">
              Promotional notification shown on the top announcement bar and cart progress drawer.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 2: DEFAULT COURIER PICKUP & FULFILLMENT HUB ── */}
      <Card className="border-vl-dark-900/10 bg-white shadow-2xs">
        <CardHeader className="border-b border-vl-dark-900/5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg border border-vl-dark-900/10 bg-vl-white-200 text-vl-dark-900">
              <Building2 className="size-4.5" />
            </div>
            <div>
              <CardTitle className="text-vl-dark-900 text-base font-bold">
                Default Fulfillment Hub & Courier Dispatch Contacts
              </CardTitle>
              <CardDescription className="text-xs">
                Transmitted in Steadfast & Pathao courier consignment payload for parcel pickup
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
          {/* Hub Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Pickup Hub Identifier <span className="text-rose-500">*</span>
            </label>
            <Input
              name="pickupHubName"
              defaultValue={initialSettings.pickupHubName}
              placeholder="e.g. VibeLock Central Fulfillment Hub"
              className="bg-white"
            />
            {state.fieldErrors?.pickupHubName && (
              <p className="text-[11px] font-semibold text-rose-600">{state.fieldErrors.pickupHubName[0]}</p>
            )}
          </div>

          {/* Contact Person */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Dispatch Contact Person <span className="text-rose-500">*</span>
            </label>
            <Input
              name="contactPerson"
              defaultValue={initialSettings.contactPerson}
              placeholder="e.g. Warehouse Operations Lead"
              className="bg-white"
            />
            {state.fieldErrors?.contactPerson && (
              <p className="text-[11px] font-semibold text-rose-600">{state.fieldErrors.contactPerson[0]}</p>
            )}
          </div>

          {/* Contact Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Dispatch Phone Number <span className="text-rose-500">*</span>
            </label>
            <Input
              name="contactPhone"
              defaultValue={initialSettings.contactPhone}
              placeholder="e.g. 8801311333277"
              className="bg-white font-mono"
            />
            {state.fieldErrors?.contactPhone && (
              <p className="text-[11px] font-semibold text-rose-600">{state.fieldErrors.contactPhone[0]}</p>
            )}
          </div>

          {/* Pickup Address */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Pickup & Return Address <span className="text-rose-500">*</span>
            </label>
            <Input
              name="pickupAddress"
              defaultValue={initialSettings.pickupAddress}
              placeholder="House 12, Road 4, Sector 3, Uttara, Dhaka-1230"
              className="bg-white"
            />
            {state.fieldErrors?.pickupAddress && (
              <p className="text-[11px] font-semibold text-rose-600">{state.fieldErrors.pickupAddress[0]}</p>
            )}
            <p className="text-[11px] text-neutral-500">
              Address where courier riders arrive for consignment pickup and returned parcel delivery.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 3: ESTIMATED DELIVERY TIMELINES (SLA PROMISES) ── */}
      <Card className="border-vl-dark-900/10 bg-white shadow-2xs">
        <CardHeader className="border-b border-vl-dark-900/5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg border border-vl-dark-900/10 bg-vl-white-200 text-vl-dark-900">
              <Clock className="size-4.5" />
            </div>
            <div>
              <CardTitle className="text-vl-dark-900 text-base font-bold">
                Storefront Delivery SLA Promises
              </CardTitle>
              <CardDescription className="text-xs">
                Estimated transit timeline badges displayed to shoppers during checkout
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-5 p-5 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Inside Dhaka SLA
            </label>
            <Input
              name="insideDhakaSla"
              defaultValue={initialSettings.insideDhakaSla}
              placeholder="24–48 Hours"
              className="bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Outside Dhaka SLA
            </label>
            <Input
              name="outsideDhakaSla"
              defaultValue={initialSettings.outsideDhakaSla}
              placeholder="3–5 Business Days"
              className="bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Express / Metro SLA
            </label>
            <Input
              name="expressDhakaSla"
              defaultValue={initialSettings.expressDhakaSla}
              placeholder="Same-Day / 24 Hours"
              className="bg-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 4: COURIER ROUTING & AUTOMATION ── */}
      <Card className="border-vl-dark-900/10 bg-white shadow-2xs">
        <CardHeader className="border-b border-vl-dark-900/5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg border border-vl-dark-900/10 bg-vl-white-200 text-vl-dark-900">
              <Truck className="size-4.5" />
            </div>
            <div>
              <CardTitle className="text-vl-dark-900 text-base font-bold">
                Courier Priority & Consignment Automation
              </CardTitle>
              <CardDescription className="text-xs">
                Logistics provider routing and automatic API booking settings
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-6 p-5 sm:grid-cols-2">
          {/* Courier Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Primary Courier Rail
            </label>
            <input type="hidden" name="primaryCourier" value={courier} />
            <div className="grid grid-cols-3 gap-2 pt-0.5">
              {(["STEADFAST", "PATHAO", "MANUAL"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCourier(c)}
                  className={cn(
                    "rounded-lg border p-2.5 text-xs font-bold transition-all text-center",
                    courier === c
                      ? "border-vl-cyan-500 bg-vl-cyan-50 text-vl-dark-900 ring-1 ring-vl-cyan-500"
                      : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                  )}
                >
                  {c === "STEADFAST" ? "Steadfast" : c === "PATHAO" ? "Pathao" : "Manual"}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-neutral-500">
              Default carrier used for automated API tracking number generation.
            </p>
          </div>

          {/* Auto Consignment Toggle */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Auto-Create Consignment on Order
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="hidden"
                  name="autoCreateConsignment"
                  value={autoConsign ? "true" : "false"}
                />
                <button
                  type="button"
                  onClick={() => setAutoConsign(!autoConsign)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-vl-cyan-500",
                    autoConsign ? "bg-vl-cyan-600" : "bg-neutral-300"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                      autoConsign ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </div>
            <div className="rounded-lg border border-vl-dark-900/8 bg-neutral-50/70 p-3 text-xs">
              <p className="font-semibold text-neutral-800">
                {autoConsign ? "Instant API Booking Active" : "Manual Dispatch Approval (Recommended)"}
              </p>
              <p className="mt-0.5 text-[11px] text-neutral-500">
                {autoConsign
                  ? "Orders instantly book a consignment parcel with Steadfast upon customer confirmation."
                  : "Warehouse team verifies order details before generating parcel tracking consignment."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SAVE ACTION FOOTER ── */}
      <div className="flex items-center justify-between rounded-xl border border-vl-dark-900/10 bg-neutral-50 p-4 shadow-2xs">
        <div className="text-xs text-neutral-500">
          <span>Shipping and delivery policy modifications are recorded in </span>
          <code className="font-mono text-vl-dark-900 font-semibold">AuditLog</code> with actor attribution.
        </div>
        <SubmitButton />
      </div>
    </form>
  );
}
