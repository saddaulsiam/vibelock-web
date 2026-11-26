"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  updateGeneralSettingsAction,
  type GeneralSettingsActionState,
} from "@/lib/admin/settings/general-settings-actions";
import type { GeneralStoreSettings } from "@/lib/settings/store-settings-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Headphones,
  Loader2,
  Power,
  Save,
  ShieldCheck,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";

const initialState: GeneralSettingsActionState = { error: null };

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
          <span>Saving Changes...</span>
        </>
      ) : (
        <>
          <Save className="size-4" />
          <span>Save Configuration</span>
        </>
      )}
    </Button>
  );
}

export function GeneralSettingsForm({ initialSettings }: { initialSettings: GeneralStoreSettings }) {
  const [state, action] = useActionState(updateGeneralSettingsAction, initialState);

  // Local state for interactive killswitch toggles
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(initialSettings.maintenanceMode.enabled);
  const [holidayEnabled, setHolidayEnabled] = useState(initialSettings.holidayMode.enabled);

  return (
    <form action={action} className="space-y-8">
      {/* ── ALERTS (ERROR & SUCCESS) ── */}
      {state.error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-900 shadow-2xs">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-600" />
          <div>
            <h4 className="font-bold">Failed to update settings</h4>
            <p className="mt-0.5 text-xs text-rose-700">{state.error}</p>
          </div>
        </div>
      )}

      {state.message && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-900 shadow-2xs">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div>
            <h4 className="font-bold">Configuration updated</h4>
            <p className="mt-0.5 text-xs text-emerald-700">{state.message}</p>
          </div>
        </div>
      )}

      {/* ── SECTION 1: STORE IDENTITY & LEGAL REGISTRATION ── */}
      <Card className="border-vl-dark-900/10 bg-white shadow-2xs">
        <CardHeader className="border-b border-vl-dark-900/5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg border border-vl-dark-900/10 bg-vl-white-200 text-vl-dark-900">
              <Store className="size-4.5" />
            </div>
            <div>
              <CardTitle className="text-vl-dark-900 text-base font-bold">
                Store Identity & Legal Compliance
              </CardTitle>
              <CardDescription className="text-xs">
                Public storefront branding and Ministry of Commerce legal identification details
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
          {/* Store Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Store Public Name <span className="text-rose-500">*</span>
            </label>
            <Input
              name="storeName"
              defaultValue={initialSettings.storeName}
              placeholder="e.g. VibeLock"
              className="bg-white"
            />
            {state.fieldErrors?.storeName && (
              <p className="text-[11px] font-semibold text-rose-600">{state.fieldErrors.storeName[0]}</p>
            )}
            <p className="text-[11px] text-neutral-500">Displayed in metadata, order emails, and receipts.</p>
          </div>

          {/* Legal Business Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Legal Business Name <span className="text-rose-500">*</span>
            </label>
            <Input
              name="legalBusinessName"
              defaultValue={initialSettings.legalBusinessName}
              placeholder="e.g. VibeLock Apparel Ltd."
              className="bg-white"
            />
            {state.fieldErrors?.legalBusinessName && (
              <p className="text-[11px] font-semibold text-rose-600">{state.fieldErrors.legalBusinessName[0]}</p>
            )}
            <p className="text-[11px] text-neutral-500">Printed on official invoices and legal audit declarations.</p>
          </div>

          {/* DBID Number */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                DBID Number (Digital Business ID)
              </label>
              <span className="text-[10px] font-mono text-neutral-400">BD MOC</span>
            </div>
            <Input
              name="dbidNumber"
              defaultValue={initialSettings.dbidNumber}
              placeholder="e.g. 1928471928"
              className="bg-white font-mono"
            />
            <p className="text-[11px] text-neutral-500">Ministry of Commerce issued digital business ID.</p>
          </div>

          {/* Trade License Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Trade License Number
            </label>
            <Input
              name="tradeLicenseNumber"
              defaultValue={initialSettings.tradeLicenseNumber}
              placeholder="e.g. TRAD/DNCC/029182/2026"
              className="bg-white font-mono"
            />
            <p className="text-[11px] text-neutral-500">City Corporation trade license registration.</p>
          </div>

          {/* BIN Number */}
          <div className="space-y-1.5 sm:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Business Identification Number (BIN / e-TIN)
              </label>
              <span className="text-[10px] font-mono text-neutral-400">NBR VAT</span>
            </div>
            <Input
              name="binNumber"
              defaultValue={initialSettings.binNumber}
              placeholder="e.g. 003928172-0102"
              className="bg-white font-mono"
            />
            <p className="text-[11px] text-neutral-500">NBR 13-digit BIN required for VAT Mushak-6.3 compliance.</p>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 2: OMNICHANNEL CONTACT & SUPPORT ── */}
      <Card className="border-vl-dark-900/10 bg-white shadow-2xs">
        <CardHeader className="border-b border-vl-dark-900/5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg border border-vl-dark-900/10 bg-vl-white-200 text-vl-dark-900">
              <Headphones className="size-4.5" />
            </div>
            <div>
              <CardTitle className="text-vl-dark-900 text-base font-bold">
                Customer Support & Warehouse Channels
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time hotline, WhatsApp channel, and courier return hub locations
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
          {/* Support Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Customer Support Hotline <span className="text-rose-500">*</span>
            </label>
            <Input
              name="supportPhone"
              defaultValue={initialSettings.supportPhone}
              placeholder="e.g. 8801311333277"
              className="bg-white font-mono"
            />
            {state.fieldErrors?.supportPhone && (
              <p className="text-[11px] font-semibold text-rose-600">{state.fieldErrors.supportPhone[0]}</p>
            )}
            <p className="text-[11px] text-neutral-500">Primary phone number displayed on storefront header & footer.</p>
          </div>

          {/* WhatsApp Number */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Official WhatsApp Number <span className="text-rose-500">*</span>
              </label>
              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-[10px] text-emerald-800">
                Direct wa.me
              </Badge>
            </div>
            <Input
              name="whatsappNumber"
              defaultValue={initialSettings.whatsappNumber}
              placeholder="e.g. 8801311333277"
              className="bg-white font-mono"
            />
            {state.fieldErrors?.whatsappNumber && (
              <p className="text-[11px] font-semibold text-rose-600">{state.fieldErrors.whatsappNumber[0]}</p>
            )}
            <p className="text-[11px] text-neutral-500">Digits-only format used by the floating WhatsApp chat widget.</p>
          </div>

          {/* Support Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Customer Support Email <span className="text-rose-500">*</span>
            </label>
            <Input
              type="email"
              name="supportEmail"
              defaultValue={initialSettings.supportEmail}
              placeholder="support@vibelock.com"
              className="bg-white font-mono"
            />
            {state.fieldErrors?.supportEmail && (
              <p className="text-[11px] font-semibold text-rose-600">{state.fieldErrors.supportEmail[0]}</p>
            )}
            <p className="text-[11px] text-neutral-500">Reply-to destination for automated customer order emails.</p>
          </div>

          {/* Warehouse Address */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Default Warehouse / Pickup Hub Address <span className="text-rose-500">*</span>
            </label>
            <Input
              name="warehouseAddress"
              defaultValue={initialSettings.warehouseAddress}
              placeholder="House 12, Road 4, Sector 3, Uttara, Dhaka-1230"
              className="bg-white"
            />
            {state.fieldErrors?.warehouseAddress && (
              <p className="text-[11px] font-semibold text-rose-600">{state.fieldErrors.warehouseAddress[0]}</p>
            )}
            <p className="text-[11px] text-neutral-500">
              Courier parcel pickup location transmitted to Steadfast & Pathao APIs.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 3: EMERGENCY KILLSWITCHES & DISPATCH MODES ── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Maintenance Mode Card */}
        <Card
          className={cn(
            "transition-all duration-200 border",
            maintenanceEnabled
              ? "border-amber-300 bg-amber-50/20 shadow-sm"
              : "border-vl-dark-900/10 bg-white shadow-2xs"
          )}
        >
          <CardHeader className="border-b border-vl-dark-900/5 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg border",
                    maintenanceEnabled
                      ? "border-amber-300 bg-amber-100 text-amber-800"
                      : "border-vl-dark-900/10 bg-vl-white-200 text-vl-dark-900"
                  )}
                >
                  <Power className="size-4.5" />
                </div>
                <div>
                  <CardTitle className="text-vl-dark-900 text-base font-bold">
                    Store Maintenance Mode
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Temporary killswitch for server upgrades
                  </CardDescription>
                </div>
              </div>

              {/* Toggle Switch */}
              <div className="flex items-center gap-2">
                <input
                  type="hidden"
                  name="maintenanceMode_enabled"
                  value={maintenanceEnabled ? "true" : "false"}
                />
                <button
                  type="button"
                  onClick={() => setMaintenanceEnabled(!maintenanceEnabled)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-vl-cyan-500",
                    maintenanceEnabled ? "bg-amber-500" : "bg-neutral-300"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                      maintenanceEnabled ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 p-5 text-xs">
            <p className="text-neutral-600 leading-relaxed">
              When active, customer checkout is paused and visitors see a clean maintenance page.
            </p>

            <div className="space-y-1.5">
              <label className="font-bold text-neutral-700 uppercase tracking-wider">
                Maintenance Notice Title
              </label>
              <Input
                name="maintenanceMode_noticeTitle"
                defaultValue={initialSettings.maintenanceMode.noticeTitle}
                className="bg-white text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-neutral-700 uppercase tracking-wider">
                Notice Message for Shoppers
              </label>
              <Input
                name="maintenanceMode_noticeMessage"
                defaultValue={initialSettings.maintenanceMode.noticeMessage}
                className="bg-white text-xs"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-vl-dark-900/8 bg-neutral-50 p-2.5">
              <span className="font-medium text-neutral-600">Admin Bypass Allowed</span>
              <input
                type="hidden"
                name="maintenanceMode_allowAdminBypass"
                value="true"
              />
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                <ShieldCheck className="size-3.5" />
                Active for Logged-In Admins
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Holiday / Vacation Mode Card */}
        <Card
          className={cn(
            "transition-all duration-200 border",
            holidayEnabled
              ? "border-vl-cyan-300 bg-vl-cyan-50/20 shadow-sm"
              : "border-vl-dark-900/10 bg-white shadow-2xs"
          )}
        >
          <CardHeader className="border-b border-vl-dark-900/5 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg border",
                    holidayEnabled
                      ? "border-vl-cyan-300 bg-vl-cyan-100 text-vl-cyan-800"
                      : "border-vl-dark-900/10 bg-vl-white-200 text-vl-dark-900"
                  )}
                >
                  <Calendar className="size-4.5" />
                </div>
                <div>
                  <CardTitle className="text-vl-dark-900 text-base font-bold">
                    Eid & Holiday Notice Mode
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Checkout stays open with delay banner
                  </CardDescription>
                </div>
              </div>

              {/* Toggle Switch */}
              <div className="flex items-center gap-2">
                <input
                  type="hidden"
                  name="holidayMode_enabled"
                  value={holidayEnabled ? "true" : "false"}
                />
                <button
                  type="button"
                  onClick={() => setHolidayEnabled(!holidayEnabled)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-vl-cyan-500",
                    holidayEnabled ? "bg-vl-cyan-600" : "bg-neutral-300"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                      holidayEnabled ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 p-5 text-xs">
            <p className="text-neutral-600 leading-relaxed">
              Allows customers to continue placing orders while warning them of delayed courier dispatch.
            </p>

            <div className="space-y-1.5">
              <label className="font-bold text-neutral-700 uppercase tracking-wider">
                Storefront Banner Announcement
              </label>
              <Input
                name="holidayMode_bannerText"
                defaultValue={initialSettings.holidayMode.bannerText}
                className="bg-white text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-neutral-700 uppercase tracking-wider">
                Expected Dispatch Date (Optional)
              </label>
              <Input
                name="holidayMode_expectedDispatchDate"
                defaultValue={initialSettings.holidayMode.expectedDispatchDate}
                placeholder="e.g. 15 April 2026"
                className="bg-white text-xs"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-vl-dark-900/8 bg-neutral-50 p-2.5">
              <span className="font-medium text-neutral-600">Checkout Behavior</span>
              <span className="font-semibold text-vl-dark-900">
                Orders Accepted Normally
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── SECTION 4: LOCALIZATION & PLATFORM DEFAULTS ── */}
      <Card className="border-vl-dark-900/10 bg-white shadow-2xs">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2 text-xs">
          <div className="flex items-center justify-between rounded-lg border border-vl-dark-900/8 bg-neutral-50/80 p-3">
            <div>
              <span className="font-bold text-neutral-700 uppercase tracking-wider">Platform Currency</span>
              <p className="text-[11px] text-neutral-500">Locked to canonical Bangladesh Taka.</p>
            </div>
            <code className="rounded bg-white px-2.5 py-1 font-mono font-bold text-vl-dark-900 border">
              BDT (৳)
            </code>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-vl-dark-900/8 bg-neutral-50/80 p-3">
            <div>
              <span className="font-bold text-neutral-700 uppercase tracking-wider">Platform Timezone</span>
              <p className="text-[11px] text-neutral-500">Dhaka Standard Time for ledger transactions.</p>
            </div>
            <code className="rounded bg-white px-2.5 py-1 font-mono font-bold text-vl-dark-900 border">
              Asia/Dhaka (UTC+6)
            </code>
          </div>
        </CardContent>
      </Card>

      {/* ── SAVE ACTION FOOTER ── */}
      <div className="flex items-center justify-between rounded-xl border border-vl-dark-900/10 bg-neutral-50 p-4 shadow-2xs">
        <div className="text-xs text-neutral-500">
          <span>All updates are tracked atomically with admin attribution in </span>
          <code className="font-mono text-vl-dark-900 font-semibold">AuditLog</code>.
        </div>
        <SubmitButton />
      </div>
    </form>
  );
}
