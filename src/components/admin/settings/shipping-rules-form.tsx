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
    <form action={action} className="space-y-6">
      {/* ── ALERTS (ERROR & SUCCESS) ── */}
      {state.error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-900 shadow-2xs">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-600" />
          <div>
            <h4 className="font-bold">Failed to update shipping rules</h4>
            <p className="mt-0.5 text-xs text-rose-700">{state.error}</p>
          </div>
        </div>
      )}

      {state.message && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm text-emerald-900 shadow-2xs">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div>
            <h4 className="font-bold">Shipping rules updated successfully</h4>
            <p className="mt-0.5 text-xs text-emerald-700">{state.message}</p>
          </div>
        </div>
      )}

      {/* ── SECTION HEADER ── */}
      <div className="border-b border-neutral-200/80 pb-4">
        <h3 className="text-base font-bold text-neutral-900 tracking-tight">
          Shipping & Logistics Configuration
        </h3>
        <p className="text-xs text-neutral-500">
          Free delivery incentive rules, primary courier carrier selection, and dispatch warehouse
        </p>
      </div>

      {/* ── SECTION 1: FREE SHIPPING INCENTIVE ENGINE ── */}
      <Card className="border-neutral-200/80 bg-white shadow-2xs rounded-xl overflow-hidden">
        <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
                <Sparkles className="size-4.5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-sm sm:text-base font-bold text-neutral-900">
                  Free Shipping Promotion Engine
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500">
                  Automated delivery fee waivers to boost Average Order Value (AOV)
                </CardDescription>
              </div>
            </div>

            {/* Modern Switch */}
            <div className="flex items-center">
              <input
                type="hidden"
                name="enableFreeShipping"
                value={freeShippingEnabled ? "true" : "false"}
              />
              <button
                type="button"
                role="switch"
                aria-checked={freeShippingEnabled}
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

        <CardContent className="grid gap-6 p-6 sm:grid-cols-2">
          {/* Threshold Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-700 tracking-wide uppercase">
                Free Shipping Cart Threshold (৳) <span className="text-rose-500">*</span>
              </label>
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-800 font-medium">
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
            <label className="text-xs font-semibold text-neutral-700 tracking-wide uppercase">
              Applicability Geographic Scope
            </label>
            <input type="hidden" name="freeShippingScope" value={scope} />
            <div className="grid grid-cols-2 gap-2.5 pt-0.5">
              <button
                type="button"
                disabled={!freeShippingEnabled}
                onClick={() => setScope("NATIONWIDE")}
                className={cn(
                  "rounded-lg border p-3 text-xs font-semibold transition-all text-left",
                  scope === "NATIONWIDE"
                    ? "border-emerald-600 bg-emerald-50/80 text-emerald-950 ring-1 ring-emerald-600"
                    : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                )}
              >
                <span className="block font-bold">Nationwide BD</span>
                <span className="block text-[11px] font-normal text-neutral-500">All 64 districts</span>
              </button>

              <button
                type="button"
                disabled={!freeShippingEnabled}
                onClick={() => setScope("INSIDE_DHAKA_ONLY")}
                className={cn(
                  "rounded-lg border p-3 text-xs font-semibold transition-all text-left",
                  scope === "INSIDE_DHAKA_ONLY"
                    ? "border-emerald-600 bg-emerald-50/80 text-emerald-950 ring-1 ring-emerald-600"
                    : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                )}
              >
                <span className="block font-bold">Dhaka Metro Only</span>
                <span className="block text-[11px] font-normal text-neutral-500">Excludes Outside Dhaka</span>
              </button>
            </div>
          </div>

          {/* Banner Text */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-semibold text-neutral-700 tracking-wide uppercase">
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

      {/* ── SECTION 2: COURIER ROUTING & CONSIGNMENT AUTOMATION ── */}
      <Card className="border-neutral-200/80 bg-white shadow-2xs rounded-xl overflow-hidden">
        <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
              <Truck className="size-4.5 text-vl-cyan-600" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base font-bold text-neutral-900">
                Courier Priority & API Consignment
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Logistics provider routing and automated API tracking number booking
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-6 p-6 sm:grid-cols-2">
          {/* Courier Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700 tracking-wide uppercase">
              Primary Courier Rail
            </label>
            <input type="hidden" name="primaryCourier" value={courier} />
            <div className="grid grid-cols-3 gap-2.5 pt-0.5">
              {(["STEADFAST", "PATHAO", "MANUAL"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCourier(c)}
                  className={cn(
                    "rounded-lg border p-3 text-xs font-semibold transition-all text-center",
                    courier === c
                      ? "border-neutral-900 bg-neutral-900 text-white shadow-2xs"
                      : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                  )}
                >
                  <span className="block font-bold">
                    {c === "STEADFAST" ? "Steadfast" : c === "PATHAO" ? "Pathao" : "Manual"}
                  </span>
                  <span
                    className={cn(
                      "block text-[10px] mt-0.5",
                      courier === c ? "text-neutral-300" : "text-neutral-400"
                    )}
                  >
                    {c === "STEADFAST" ? "Fast API" : c === "PATHAO" ? "Logistics" : "Offline"}
                  </span>
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
              <label className="text-xs font-semibold text-neutral-700 tracking-wide uppercase">
                Auto-Create Consignment on Order
              </label>
              <div className="flex items-center">
                <input
                  type="hidden"
                  name="autoCreateConsignment"
                  value={autoConsign ? "true" : "false"}
                />
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoConsign}
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
            <div className="rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3 text-xs">
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

      {/* ── SECTION 3: STOREFRONT SLA PROMISES ── */}
      <Card className="border-neutral-200/80 bg-white shadow-2xs rounded-xl overflow-hidden">
        <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
              <Clock className="size-4.5 text-vl-cyan-600" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base font-bold text-neutral-900">
                Storefront Delivery SLA Promises
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Estimated transit timeline badges displayed to shoppers during checkout
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-5 p-6 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700 tracking-wide uppercase">
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
            <label className="text-xs font-semibold text-neutral-700 tracking-wide uppercase">
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
            <label className="text-xs font-semibold text-neutral-700 tracking-wide uppercase">
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

      {/* ── SECTION 4: DEFAULT FULFILLMENT HUB & PICKUP CONTACTS ── */}
      <Card className="border-neutral-200/80 bg-white shadow-2xs rounded-xl overflow-hidden">
        <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
              <Building2 className="size-4.5 text-vl-cyan-600" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base font-bold text-neutral-900">
                Default Fulfillment Hub & Pickup Contacts
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Origin contact information sent in courier API payloads for parcel collection
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-5 p-6 sm:grid-cols-2">
          {/* Hub Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700 tracking-wide uppercase">
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
            <label className="text-xs font-semibold text-neutral-700 tracking-wide uppercase">
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
            <label className="text-xs font-semibold text-neutral-700 tracking-wide uppercase">
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
            <label className="text-xs font-semibold text-neutral-700 tracking-wide uppercase">
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
              Warehouse address where courier riders arrive for parcel pickups and return shipments.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── BOTTOM ACTION FOOTER (NATURAL FLOW, NO FLOATING) ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-neutral-200/80 bg-white p-4 shadow-2xs">
        <div className="text-xs text-neutral-500">
          <span>Shipping and delivery policies sync in real-time across checkout and </span>
          <code className="font-mono text-neutral-900 font-semibold">AuditLog</code>.
        </div>
        <div className="flex items-center justify-end">
          <SubmitButton />
        </div>
      </div>
    </form>
  );
}
