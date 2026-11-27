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
    <form action={action} className="space-y-6">
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

      {/* ── SECTION HEADER ── */}
      <div className="border-b border-neutral-200/80 pb-4">
        <h3 className="text-base font-bold text-neutral-900 tracking-tight">
          General Store Configuration
        </h3>
        <p className="text-xs text-neutral-500">
          Store identity, legal DBID, omnichannel support hotlines, and operational modes
        </p>
      </div>

      {/* ── SECTION 1: STORE IDENTITY & LEGAL REGISTRATION ── */}
      <Card className="overflow-hidden rounded-xl border-neutral-200/80 bg-white shadow-2xs">
        <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
              <Store className="text-vl-cyan-600 size-4.5" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-neutral-900 sm:text-base">
                Store Identity & Legal Registration
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Official store branding and Government of Bangladesh business identification details
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-5 p-6 sm:grid-cols-2">
          {/* Store Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
              Store Public Name <span className="text-rose-500">*</span>
            </label>
            <Input
              name="storeName"
              defaultValue={initialSettings.storeName}
              placeholder="e.g. VibeLock"
              className="bg-white"
            />
            {state.fieldErrors?.storeName && (
              <p className="text-[11px] font-semibold text-rose-600">
                {state.fieldErrors.storeName[0]}
              </p>
            )}
            <p className="text-[11px] text-neutral-500">
              Displayed across public storefront header, emails, and receipts.
            </p>
          </div>

          {/* Legal Business Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
              Legal Business Name <span className="text-rose-500">*</span>
            </label>
            <Input
              name="legalBusinessName"
              defaultValue={initialSettings.legalBusinessName}
              placeholder="e.g. VibeLock Apparel Ltd."
              className="bg-white"
            />
            {state.fieldErrors?.legalBusinessName && (
              <p className="text-[11px] font-semibold text-rose-600">
                {state.fieldErrors.legalBusinessName[0]}
              </p>
            )}
            <p className="text-[11px] text-neutral-500">
              Registered entity printed on official tax invoices and legal disclosures.
            </p>
          </div>

          {/* DBID Number */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
                Digital Business ID (DBID)
              </label>
              <Badge
                variant="outline"
                className="border-neutral-200 bg-neutral-50 font-mono text-[10px] text-neutral-600"
              >
                BD MoC
              </Badge>
            </div>
            <Input
              name="dbidNumber"
              defaultValue={initialSettings.dbidNumber}
              placeholder="e.g. 1928471928"
              className="bg-white font-mono"
            />
            <p className="text-[11px] text-neutral-500">
              Ministry of Commerce digital e-commerce identity registration.
            </p>
          </div>

          {/* Trade License Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
              Trade License Number
            </label>
            <Input
              name="tradeLicenseNumber"
              defaultValue={initialSettings.tradeLicenseNumber}
              placeholder="e.g. TRAD/DNCC/029182/2026"
              className="bg-white font-mono"
            />
            <p className="text-[11px] text-neutral-500">
              City Corporation annual trade license number.
            </p>
          </div>

          {/* BIN Number */}
          <div className="space-y-1.5 sm:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
                Business Identification Number (BIN / e-TIN)
              </label>
              <Badge
                variant="outline"
                className="border-neutral-200 bg-neutral-50 font-mono text-[10px] text-neutral-600"
              >
                NBR 13-Digit
              </Badge>
            </div>
            <Input
              name="binNumber"
              defaultValue={initialSettings.binNumber}
              placeholder="e.g. 003928172-0102"
              className="bg-white font-mono"
            />
            <p className="text-[11px] text-neutral-500">
              National Board of Revenue 13-digit BIN required for Mushak-6.3 tax invoices.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 2: CUSTOMER SUPPORT & LOGISTICS CONTACT ── */}
      <Card className="overflow-hidden rounded-xl border-neutral-200/80 bg-white shadow-2xs">
        <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
              <Headphones className="text-vl-cyan-600 size-4.5" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-neutral-900 sm:text-base">
                Customer Support & Warehouse Channels
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Official contact channels and primary warehouse location for courier dispatch
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-5 p-6 sm:grid-cols-2">
          {/* Support Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
              Customer Support Hotline <span className="text-rose-500">*</span>
            </label>
            <Input
              name="supportPhone"
              defaultValue={initialSettings.supportPhone}
              placeholder="e.g. 8801311333277"
              className="bg-white font-mono"
            />
            {state.fieldErrors?.supportPhone && (
              <p className="text-[11px] font-semibold text-rose-600">
                {state.fieldErrors.supportPhone[0]}
              </p>
            )}
            <p className="text-[11px] text-neutral-500">
              Primary phone line displayed in website top bar and footer.
            </p>
          </div>

          {/* WhatsApp Number */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
                Official WhatsApp Number <span className="text-rose-500">*</span>
              </label>
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50 font-mono text-[10px] text-emerald-800"
              >
                wa.me Direct
              </Badge>
            </div>
            <Input
              name="whatsappNumber"
              defaultValue={initialSettings.whatsappNumber}
              placeholder="e.g. 8801311333277"
              className="bg-white font-mono"
            />
            {state.fieldErrors?.whatsappNumber && (
              <p className="text-[11px] font-semibold text-rose-600">
                {state.fieldErrors.whatsappNumber[0]}
              </p>
            )}
            <p className="text-[11px] text-neutral-500">
              Numbers only with country code (e.g. 8801311333277) for floating chat.
            </p>
          </div>

          {/* Support Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
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
              <p className="text-[11px] font-semibold text-rose-600">
                {state.fieldErrors.supportEmail[0]}
              </p>
            )}
            <p className="text-[11px] text-neutral-500">
              Reply-to destination for customer transactional receipts.
            </p>
          </div>

          {/* Warehouse Address */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
              Default Warehouse / Pickup Hub Address <span className="text-rose-500">*</span>
            </label>
            <Input
              name="warehouseAddress"
              defaultValue={initialSettings.warehouseAddress}
              placeholder="House 12, Road 4, Sector 3, Uttara, Dhaka-1230"
              className="bg-white"
            />
            {state.fieldErrors?.warehouseAddress && (
              <p className="text-[11px] font-semibold text-rose-600">
                {state.fieldErrors.warehouseAddress[0]}
              </p>
            )}
            <p className="text-[11px] text-neutral-500">
              Primary pickup address transmitted to Steadfast and Pathao logistics APIs for
              consignment creation.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 3: STORE OPERATIONAL MODES & SCHEDULES ── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Maintenance Mode Card */}
        <Card
          className={cn(
            "overflow-hidden rounded-xl border transition-all duration-200",
            maintenanceEnabled
              ? "border-amber-300 bg-amber-50/20 shadow-2xs"
              : "border-neutral-200/80 bg-white shadow-2xs"
          )}
        >
          <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg border",
                    maintenanceEnabled
                      ? "border-amber-300 bg-amber-100 text-amber-800"
                      : "border-neutral-200 bg-white text-neutral-700"
                  )}
                >
                  <Power className="size-4.5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-neutral-900">
                    Maintenance Mode
                  </CardTitle>
                  <CardDescription className="text-xs text-neutral-500">
                    Pause storefront checkout for system updates
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

          <CardContent className="space-y-4 p-6 text-xs">
            <p className="leading-relaxed text-neutral-600">
              When enabled, customer checkout is temporarily paused and visitors see a polite
              maintenance notice.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold tracking-wide text-neutral-700 uppercase">
                Maintenance Notice Title
              </label>
              <Input
                name="maintenanceMode_noticeTitle"
                defaultValue={initialSettings.maintenanceMode.noticeTitle}
                className="bg-white text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold tracking-wide text-neutral-700 uppercase">
                Notice Message for Shoppers
              </label>
              <Input
                name="maintenanceMode_noticeMessage"
                defaultValue={initialSettings.maintenanceMode.noticeMessage}
                className="bg-white text-xs"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-neutral-50 px-3 py-2">
              <span className="text-[11px] font-medium text-neutral-600">Admin Access</span>
              <input type="hidden" name="maintenanceMode_allowAdminBypass" value="true" />
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                <ShieldCheck className="size-3.5" />
                Active for Logged-In Admins
              </span>
            </div>
          </CardContent>
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
          <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg border",
                    holidayEnabled
                      ? "border-vl-cyan-300 bg-vl-cyan-100 text-vl-cyan-800"
                      : "border-neutral-200 bg-white text-neutral-700"
                  )}
                >
                  <Calendar className="size-4.5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-neutral-900">
                    Eid & Holiday Notice Mode
                  </CardTitle>
                  <CardDescription className="text-xs text-neutral-500">
                    Keep checkout open with courier delay disclaimer
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

          <CardContent className="space-y-4 p-6 text-xs">
            <p className="leading-relaxed text-neutral-600">
              Allows customers to continue placing orders while warning them of delayed holiday
              courier dispatch.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold tracking-wide text-neutral-700 uppercase">
                Storefront Banner Announcement
              </label>
              <Input
                name="holidayMode_bannerText"
                defaultValue={initialSettings.holidayMode.bannerText}
                className="bg-white text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold tracking-wide text-neutral-700 uppercase">
                Expected Dispatch Date (Optional)
              </label>
              <Input
                name="holidayMode_expectedDispatchDate"
                defaultValue={initialSettings.holidayMode.expectedDispatchDate}
                placeholder="e.g. 15 April 2026"
                className="bg-white text-xs"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-neutral-50 px-3 py-2">
              <span className="text-[11px] font-medium text-neutral-600">Checkout State</span>
              <span className="text-[11px] font-semibold text-neutral-900">
                Orders Accepted Normally
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── SECTION 4: PLATFORM LOCALIZATION STANDARDS ── */}
      <Card className="overflow-hidden rounded-xl border-neutral-200/80 bg-white shadow-2xs">
        <CardContent className="grid gap-4 p-6 text-xs sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3.5">
            <div>
              <span className="text-[11px] font-semibold tracking-wide text-neutral-800 uppercase">
                Platform Currency
              </span>
              <p className="mt-0.5 text-[11px] text-neutral-500">Fixed canonical store currency.</p>
            </div>
            <code className="rounded border border-neutral-200 bg-white px-2.5 py-1 font-mono font-bold text-neutral-900 shadow-2xs">
              BDT (৳)
            </code>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3.5">
            <div>
              <span className="text-[11px] font-semibold tracking-wide text-neutral-800 uppercase">
                Platform Timezone
              </span>
              <p className="mt-0.5 text-[11px] text-neutral-500">
                Standard time for order transaction ledgers.
              </p>
            </div>
            <code className="rounded border border-neutral-200 bg-white px-2.5 py-1 font-mono font-bold text-neutral-900 shadow-2xs">
              Asia/Dhaka (UTC+6)
            </code>
          </div>
        </CardContent>
      </Card>

      {/* ── BOTTOM ACTION FOOTER (NATURAL FLOW, NO FLOATING) ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-neutral-200/80 bg-white p-4 shadow-2xs">
        <div className="text-xs text-neutral-500">
          <span>Updates execute in an atomic transaction with actor logging in </span>
          <code className="font-mono font-semibold text-neutral-900">AuditLog</code>.
        </div>
        <div className="flex items-center justify-end">
          <SubmitButton />
        </div>
      </div>
    </form>
  );
}
