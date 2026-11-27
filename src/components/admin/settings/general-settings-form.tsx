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
  Calendar,
  CheckCircle2,
  Headphones,
  Loader2,
  Power,
  Save,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";

const initialState: GeneralSettingsActionState = { error: null };

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

export function GeneralSettingsForm({
  initialSettings,
}: {
  initialSettings: GeneralStoreSettings;
}) {
  const [state, action] = useActionState(updateGeneralSettingsAction, initialState);

  // Local state for interactive killswitch toggles
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(
    initialSettings.maintenanceMode.enabled
  );
  const [holidayEnabled, setHolidayEnabled] = useState(initialSettings.holidayMode.enabled);

  return (
    <form action={action} className="space-y-4">
      {/* ── ALERTS (ERROR & SUCCESS) ── */}
      {state.error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-900 shadow-2xs">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-600" />
          <div>
            <h4 className="font-bold">Failed to update settings</h4>
            <p className="mt-0.5 text-xs text-rose-700">{state.error}</p>
          </div>
        </div>
      )}

      {state.message && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm text-emerald-900 shadow-2xs">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div>
            <h4 className="font-bold">Configuration updated</h4>
            <p className="mt-0.5 text-xs text-emerald-700">{state.message}</p>
          </div>
        </div>
      )}

      {/* ── SECTION 1: STORE IDENTITY & LEGAL REGISTRATION ── */}
      <Card className="overflow-hidden rounded-xl border-neutral-200/80 bg-white shadow-2xs">
        <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
              <Store className="text-vl-cyan-600 size-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-neutral-900">
                Store Identity & Legal Registration
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Official store branding and business identification details
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          {/* Store Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
              Store Name <span className="text-rose-500">*</span>
            </label>
            <Input
              name="storeName"
              defaultValue={initialSettings.storeName}
              placeholder="Store name"
              className="bg-white"
            />
            {state.fieldErrors?.storeName && (
              <p className="text-[11px] font-semibold text-rose-600">
                {state.fieldErrors.storeName[0]}
              </p>
            )}
          </div>

          {/* Legal Business Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
              Legal Business Name <span className="text-rose-500">*</span>
            </label>
            <Input
              name="legalBusinessName"
              defaultValue={initialSettings.legalBusinessName}
              placeholder="Registered legal company name"
              className="bg-white"
            />
            {state.fieldErrors?.legalBusinessName && (
              <p className="text-[11px] font-semibold text-rose-600">
                {state.fieldErrors.legalBusinessName[0]}
              </p>
            )}
          </div>

          {/* DBID Number */}
          <div className="space-y-1">
            <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
              Digital Business ID (DBID)
            </label>
            <Input
              name="dbidNumber"
              defaultValue={initialSettings.dbidNumber}
              placeholder="Ministry of Commerce DBID"
              className="bg-white font-mono"
            />
          </div>

          {/* Trade License Number */}
          <div className="space-y-1">
            <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
              Trade License Number
            </label>
            <Input
              name="tradeLicenseNumber"
              defaultValue={initialSettings.tradeLicenseNumber}
              placeholder="City Corporation trade license number"
              className="bg-white font-mono"
            />
          </div>

          {/* BIN Number */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
              Business Identification Number (BIN / TIN)
            </label>
            <Input
              name="binNumber"
              defaultValue={initialSettings.binNumber}
              placeholder="13-digit BIN / TIN"
              className="bg-white font-mono"
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 border-t border-neutral-100 bg-neutral-50/50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-neutral-500">
            Store identity and legal registrations apply across invoices and public storefront.
          </p>
          <SectionSubmitButton label="Save Identity" />
        </CardFooter>
      </Card>

      {/* ── SECTION 2: CUSTOMER SUPPORT & LOGISTICS CONTACT ── */}
      <Card className="overflow-hidden rounded-xl border-neutral-200/80 bg-white shadow-2xs">
        <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
              <Headphones className="text-vl-cyan-600 size-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-neutral-900">
                Customer Support & Warehouse Channels
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Contact channels and primary warehouse location for courier dispatch
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          {/* Support Phone */}
          <div className="space-y-1">
            <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
              Customer Support Phone <span className="text-rose-500">*</span>
            </label>
            <Input
              name="supportPhone"
              defaultValue={initialSettings.supportPhone}
              placeholder="01XXXXXXXXX"
              className="bg-white font-mono"
            />
            {state.fieldErrors?.supportPhone && (
              <p className="text-[11px] font-semibold text-rose-600">
                {state.fieldErrors.supportPhone[0]}
              </p>
            )}
          </div>

          {/* WhatsApp Number */}
          <div className="space-y-1">
            <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
              WhatsApp Support Number <span className="text-rose-500">*</span>
            </label>
            <Input
              name="whatsappNumber"
              defaultValue={initialSettings.whatsappNumber}
              placeholder="8801XXXXXXXXX"
              className="bg-white font-mono"
            />
            {state.fieldErrors?.whatsappNumber && (
              <p className="text-[11px] font-semibold text-rose-600">
                {state.fieldErrors.whatsappNumber[0]}
              </p>
            )}
          </div>

          {/* Support Email */}
          <div className="space-y-1">
            <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
              Support Email <span className="text-rose-500">*</span>
            </label>
            <Input
              type="email"
              name="supportEmail"
              defaultValue={initialSettings.supportEmail}
              placeholder="support@domain.com"
              className="bg-white font-mono"
            />
            {state.fieldErrors?.supportEmail && (
              <p className="text-[11px] font-semibold text-rose-600">
                {state.fieldErrors.supportEmail[0]}
              </p>
            )}
          </div>

          {/* Warehouse Address */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
              Warehouse / Pickup Address <span className="text-rose-500">*</span>
            </label>
            <Input
              name="warehouseAddress"
              defaultValue={initialSettings.warehouseAddress}
              placeholder="Warehouse address for rider pickups and returns"
              className="bg-white"
            />
            {state.fieldErrors?.warehouseAddress && (
              <p className="text-[11px] font-semibold text-rose-600">
                {state.fieldErrors.warehouseAddress[0]}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 border-t border-neutral-100 bg-neutral-50/50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-neutral-500">
            Support contact channels and primary warehouse location for courier dispatch.
          </p>
          <SectionSubmitButton label="Save Contact Details" />
        </CardFooter>
      </Card>

      {/* ── SECTION 3: STORE OPERATIONAL MODES & SCHEDULES ── */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Maintenance Mode Card */}
        <Card
          className={cn(
            "overflow-hidden rounded-xl border transition-all duration-200",
            maintenanceEnabled
              ? "border-amber-300 bg-amber-50/20 shadow-2xs"
              : "border-neutral-200/80 bg-white shadow-2xs"
          )}
        >
          <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-5 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg border",
                    maintenanceEnabled
                      ? "border-amber-300 bg-amber-100 text-amber-800"
                      : "border-neutral-200 bg-white text-neutral-700"
                  )}
                >
                  <Power className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-neutral-900">
                    Maintenance Mode
                  </CardTitle>
                  <CardDescription className="text-xs text-neutral-500">
                    Temporarily pause storefront checkout
                  </CardDescription>
                </div>
              </div>

              {/* Modern Switch */}
              <div className="flex items-center">
                <input
                  type="hidden"
                  name="maintenanceMode_enabled"
                  value={maintenanceEnabled ? "true" : "false"}
                />
                <input type="hidden" name="maintenanceMode_allowAdminBypass" value="true" />
                <button
                  type="button"
                  role="switch"
                  aria-checked={maintenanceEnabled}
                  onClick={() => setMaintenanceEnabled(!maintenanceEnabled)}
                  className={cn(
                    "focus-visible:ring-vl-cyan-500 relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2",
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

          <CardContent className="space-y-3 p-4 text-xs">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold tracking-wide text-neutral-700 uppercase">
                Notice Title
              </label>
              <Input
                name="maintenanceMode_noticeTitle"
                defaultValue={initialSettings.maintenanceMode.noticeTitle}
                placeholder="Store Under Scheduled Maintenance"
                className="bg-white text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold tracking-wide text-neutral-700 uppercase">
                Notice Message for Shoppers
              </label>
              <Input
                name="maintenanceMode_noticeMessage"
                defaultValue={initialSettings.maintenanceMode.noticeMessage}
                placeholder="We will be back online shortly."
                className="bg-white text-xs"
              />
            </div>
          </CardContent>

          <CardFooter className="flex items-center justify-end border-t border-neutral-100 bg-neutral-50/50 px-4 py-2.5">
            <SectionSubmitButton label="Save Mode" />
          </CardFooter>
        </Card>

        {/* Holiday / Vacation Mode Card */}
        <Card
          className={cn(
            "overflow-hidden rounded-xl border transition-all duration-200",
            holidayEnabled
              ? "border-vl-cyan-300 bg-vl-cyan-50/20 shadow-2xs"
              : "border-neutral-200/80 bg-white shadow-2xs"
          )}
        >
          <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-5 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg border",
                    holidayEnabled
                      ? "border-vl-cyan-300 bg-vl-cyan-100 text-vl-cyan-800"
                      : "border-neutral-200 bg-white text-neutral-700"
                  )}
                >
                  <Calendar className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-neutral-900">
                    Holiday Notice Mode
                  </CardTitle>
                  <CardDescription className="text-xs text-neutral-500">
                    Accept orders while warning of holiday delays
                  </CardDescription>
                </div>
              </div>

              {/* Modern Switch */}
              <div className="flex items-center">
                <input
                  type="hidden"
                  name="holidayMode_enabled"
                  value={holidayEnabled ? "true" : "false"}
                />
                <button
                  type="button"
                  role="switch"
                  aria-checked={holidayEnabled}
                  onClick={() => setHolidayEnabled(!holidayEnabled)}
                  className={cn(
                    "focus-visible:ring-vl-cyan-500 relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2",
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

          <CardContent className="space-y-3 p-4 text-xs">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold tracking-wide text-neutral-700 uppercase">
                Banner Announcement Message
              </label>
              <Input
                name="holidayMode_bannerText"
                defaultValue={initialSettings.holidayMode.bannerText}
                placeholder="Holiday notice: Deliveries will resume right after the holidays."
                className="bg-white text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold tracking-wide text-neutral-700 uppercase">
                Expected Dispatch Date (Optional)
              </label>
              <Input
                name="holidayMode_expectedDispatchDate"
                defaultValue={initialSettings.holidayMode.expectedDispatchDate}
                placeholder="15 April 2026"
                className="bg-white text-xs"
              />
            </div>
          </CardContent>

          <CardFooter className="flex items-center justify-end border-t border-neutral-100 bg-neutral-50/50 px-4 py-2.5">
            <SectionSubmitButton label="Save Notice" />
          </CardFooter>
        </Card>
      </div>

      {/* ── SECTION 4: PLATFORM STANDARDS ── */}
      <Card className="overflow-hidden rounded-xl border-neutral-200/80 bg-white shadow-2xs">
        <CardContent className="grid gap-3 p-3.5 text-xs sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-2.5">
            <span className="font-semibold text-neutral-800">Platform Currency</span>
            <code className="rounded border border-neutral-200 bg-white px-2 py-0.5 font-mono font-bold text-neutral-900 shadow-2xs">
              BDT (৳)
            </code>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-2.5">
            <span className="font-semibold text-neutral-800">Platform Timezone</span>
            <code className="rounded border border-neutral-200 bg-white px-2 py-0.5 font-mono font-bold text-neutral-900 shadow-2xs">
              Asia/Dhaka (UTC+6)
            </code>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
