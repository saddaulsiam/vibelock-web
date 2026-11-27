"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  updateNotificationSettingsAction,
  type NotificationActionState,
} from "@/lib/admin/settings/notification-actions";
import type { NotificationSettings } from "@/lib/settings/notification-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Loader2,
  Mail,
  MessageSquare,
  Save,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

const initialState: NotificationActionState = { error: null };

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
          <span>Saving Channels...</span>
        </>
      ) : (
        <>
          <Save className="size-4" />
          <span>Save Notification Settings</span>
        </>
      )}
    </Button>
  );
}

export function NotificationSettingsForm({
  initialSettings,
}: {
  initialSettings: NotificationSettings;
}) {
  const [state, action] = useActionState(updateNotificationSettingsAction, initialState);

  const [provider, setProvider] = useState(initialSettings.smsProvider);
  const [onOrderPlaced, setOnOrderPlaced] = useState(initialSettings.notifyOnOrderPlaced);
  const [onDispatched, setOnDispatched] = useState(initialSettings.notifyOnOrderDispatched);
  const [onOutDelivery, setOnOutDelivery] = useState(initialSettings.notifyOnOutForDelivery);
  const [onReturnApproved, setOnReturnApproved] = useState(initialSettings.notifyOnReturnApproved);
  const [adminAlerts, setAdminAlerts] = useState(initialSettings.adminAlertsEnabled);
  const [lowBalanceWarn, setLowBalanceWarn] = useState(
    initialSettings.adminAlertLowSmsBalanceWarning
  );
  const [customerEmail, setCustomerEmail] = useState(initialSettings.enableCustomerOrderEmail);
  const [adminEmail, setAdminEmail] = useState(initialSettings.enableAdminOrderAlertEmail);

  return (
    <form action={action} className="space-y-6">
      {/* ── ALERTS (ERROR & SUCCESS) ── */}
      {state.error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-900 shadow-2xs">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-600" />
          <div>
            <h4 className="font-bold">Failed to update notification settings</h4>
            <p className="mt-0.5 text-xs text-rose-700">{state.error}</p>
          </div>
        </div>
      )}

      {state.message && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm text-emerald-900 shadow-2xs">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div>
            <h4 className="font-bold">Notifications configuration updated</h4>
            <p className="mt-0.5 text-xs text-emerald-700">{state.message}</p>
          </div>
        </div>
      )}

      {/* ── SECTION HEADER ── */}
      <div className="border-b border-neutral-200/80 pb-4">
        <h3 className="text-base font-bold text-neutral-900 tracking-tight">
          Notifications & SMS Settings
        </h3>
        <p className="text-xs text-neutral-500">
          Manage SMS carrier gateways, automated parcel milestones, and manager email alerts
        </p>
      </div>

      {/* ── SECTION 1: SMS GATEWAY RAIL & SENDER CONFIG ── */}
      <Card className="border-neutral-200/80 bg-white shadow-2xs rounded-xl overflow-hidden">
        <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
              <Smartphone className="size-4.5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base font-bold text-neutral-900">
                SMS Gateway Provider & Credentials
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Primary carrier provider, sender ID, and API dispatch credentials
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-6 p-6 sm:grid-cols-2">
          {/* Provider Selection */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
              Primary SMS Gateway Provider
            </label>
            <input type="hidden" name="smsProvider" value={provider} />
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                { id: "BULKSMSBD", name: "BulkSMSBD", sub: "REST API v2" },
                { id: "GREENWEB", name: "Greenweb BD", sub: "HTTP Gateway" },
                { id: "REVE", name: "Reve SMS", sub: "Enterprise API" },
                { id: "CUSTOM", name: "Custom Gateway", sub: "HTTP Endpoint" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id as typeof provider)}
                  className={cn(
                    "rounded-lg border p-3 text-left text-xs transition-all",
                    provider === p.id
                      ? "border-neutral-900 bg-neutral-900 text-white shadow-2xs"
                      : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                  )}
                >
                  <span className="block font-bold">{p.name}</span>
                  <span
                    className={cn(
                      "block text-[10px] mt-0.5",
                      provider === p.id ? "text-neutral-300" : "text-neutral-400"
                    )}
                  >
                    {p.sub}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Sender ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
              SMS Sender ID (Masking) <span className="text-rose-500">*</span>
            </label>
            <Input
              name="senderId"
              defaultValue={initialSettings.senderId}
              placeholder="Brand Sender ID"
              className="bg-white font-mono"
            />
            {state.fieldErrors?.senderId && (
              <p className="text-[11px] font-semibold text-rose-600">
                {state.fieldErrors.senderId[0]}
              </p>
            )}
          </div>

          {/* Gateway API Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
              Gateway API Key (Optional Override)
            </label>
            <Input
              type="password"
              name="smsApiKey"
              defaultValue={initialSettings.smsApiKey}
              placeholder="Leave blank to use environment secret"
              className="bg-white font-mono"
            />
          </div>

          {/* Gateway API URL */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
              Gateway API Endpoint URL (Optional Override)
            </label>
            <Input
              name="smsApiUrl"
              defaultValue={initialSettings.smsApiUrl}
              placeholder="https://api.gateway.com/send (Leave blank to use environment default)"
              className="bg-white font-mono text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 2: CUSTOMER TRANSACTIONAL SMS LIFECYCLE ── */}
      <Card className="border-neutral-200/80 bg-white shadow-2xs rounded-xl overflow-hidden">
        <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
              <MessageSquare className="size-4.5 text-vl-cyan-600" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base font-bold text-neutral-900">
                Customer SMS Notifications
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Automated order milestone SMS alerts dispatched to shoppers
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
          {/* Trigger 1: Order Placed */}
          <div className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3.5">
            <span className="text-xs font-semibold text-neutral-900">Order Placed Confirmation</span>
            <div className="flex items-center">
              <input
                type="hidden"
                name="notifyOnOrderPlaced"
                value={onOrderPlaced ? "true" : "false"}
              />
              <button
                type="button"
                role="switch"
                aria-checked={onOrderPlaced}
                onClick={() => setOnOrderPlaced(!onOrderPlaced)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-vl-cyan-500",
                  onOrderPlaced ? "bg-vl-cyan-600" : "bg-neutral-300"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                    onOrderPlaced ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>

          {/* Trigger 2: Order Dispatched with Tracking */}
          <div className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3.5">
            <span className="text-xs font-semibold text-neutral-900">
              Courier Dispatch & Tracking Link
            </span>
            <div className="flex items-center">
              <input
                type="hidden"
                name="notifyOnOrderDispatched"
                value={onDispatched ? "true" : "false"}
              />
              <button
                type="button"
                role="switch"
                aria-checked={onDispatched}
                onClick={() => setOnDispatched(!onDispatched)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-vl-cyan-500",
                  onDispatched ? "bg-vl-cyan-600" : "bg-neutral-300"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                    onDispatched ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>

          {/* Trigger 3: Out for Delivery */}
          <div className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3.5">
            <span className="text-xs font-semibold text-neutral-900">Out for Delivery Alert</span>
            <div className="flex items-center">
              <input
                type="hidden"
                name="notifyOnOutForDelivery"
                value={onOutDelivery ? "true" : "false"}
              />
              <button
                type="button"
                role="switch"
                aria-checked={onOutDelivery}
                onClick={() => setOnOutDelivery(!onOutDelivery)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-vl-cyan-500",
                  onOutDelivery ? "bg-vl-cyan-600" : "bg-neutral-300"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                    onOutDelivery ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>

          {/* Trigger 4: Return Approved */}
          <div className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3.5">
            <span className="text-xs font-semibold text-neutral-900">Return / Refund Approved</span>
            <div className="flex items-center">
              <input
                type="hidden"
                name="notifyOnReturnApproved"
                value={onReturnApproved ? "true" : "false"}
              />
              <button
                type="button"
                role="switch"
                aria-checked={onReturnApproved}
                onClick={() => setOnReturnApproved(!onReturnApproved)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-vl-cyan-500",
                  onReturnApproved ? "bg-vl-cyan-600" : "bg-neutral-300"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                    onReturnApproved ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 3: STORE MANAGER HIGH-VALUE ORDER RADAR ── */}
      <Card className="border-neutral-200/80 bg-white shadow-2xs rounded-xl overflow-hidden">
        <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
                <BellRing className="size-4.5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-sm sm:text-base font-bold text-neutral-900">
                  Manager SMS Alerts & High-Value Orders
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500">
                  Direct SMS alerts sent to operations management for VIP orders
                </CardDescription>
              </div>
            </div>

            {/* Modern Switch */}
            <div className="flex items-center">
              <input
                type="hidden"
                name="adminAlertsEnabled"
                value={adminAlerts ? "true" : "false"}
              />
              <button
                type="button"
                role="switch"
                aria-checked={adminAlerts}
                onClick={() => setAdminAlerts(!adminAlerts)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-vl-cyan-500",
                  adminAlerts ? "bg-amber-600" : "bg-neutral-300"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                    adminAlerts ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-5 p-6 sm:grid-cols-2">
          {/* Admin Recipient Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
              Manager Alert Phone Number <span className="text-rose-500">*</span>
            </label>
            <Input
              name="adminAlertRecipientPhone"
              defaultValue={initialSettings.adminAlertRecipientPhone}
              disabled={!adminAlerts}
              placeholder="01XXXXXXXXX"
              className="bg-white font-mono"
            />
            {state.fieldErrors?.adminAlertRecipientPhone && (
              <p className="text-[11px] font-semibold text-rose-600">
                {state.fieldErrors.adminAlertRecipientPhone[0]}
              </p>
            )}
          </div>

          {/* High-Value Threshold */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
              High-Value Order Threshold (৳) <span className="text-rose-500">*</span>
            </label>
            <Input
              type="number"
              name="adminAlertHighValueThreshold"
              defaultValue={initialSettings.adminAlertHighValueThreshold}
              disabled={!adminAlerts}
              min={1000}
              step={1000}
              className="bg-white font-mono"
            />
            {state.fieldErrors?.adminAlertHighValueThreshold && (
              <p className="text-[11px] font-semibold text-rose-600">
                {state.fieldErrors.adminAlertHighValueThreshold[0]}
              </p>
            )}
          </div>

          {/* Low SMS Balance Warning Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3.5 sm:col-span-2">
            <div>
              <span className="text-xs font-semibold text-neutral-800">
                SMS Gateway Low-Credit Balance Alert
              </span>
              <p className="text-[11px] text-neutral-500">
                Alerts manager when provider credit balance drops below 100 SMS
              </p>
            </div>
            <div className="flex items-center">
              <input
                type="hidden"
                name="adminAlertLowSmsBalanceWarning"
                value={lowBalanceWarn ? "true" : "false"}
              />
              <button
                type="button"
                role="switch"
                aria-checked={lowBalanceWarn}
                onClick={() => setLowBalanceWarn(!lowBalanceWarn)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-vl-cyan-500",
                  lowBalanceWarn ? "bg-amber-600" : "bg-neutral-300"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                    lowBalanceWarn ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 4: EMAIL NOTIFICATION CHANNELS ── */}
      <Card className="border-neutral-200/80 bg-white shadow-2xs rounded-xl overflow-hidden">
        <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
              <Mail className="size-4.5 text-vl-cyan-600" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base font-bold text-neutral-900">
                Email Dispatch Channels
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Transactional email notification recipients and sender profile
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-5 p-6 sm:grid-cols-2">
          {/* Admin Notification Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
              Store Order Alert Email <span className="text-rose-500">*</span>
            </label>
            <Input
              type="email"
              name="adminNotificationEmail"
              defaultValue={initialSettings.adminNotificationEmail}
              placeholder="orders@domain.com"
              className="bg-white font-mono"
            />
            {state.fieldErrors?.adminNotificationEmail && (
              <p className="text-[11px] font-semibold text-rose-600">
                {state.fieldErrors.adminNotificationEmail[0]}
              </p>
            )}
          </div>

          {/* Support Reply-To Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-neutral-700 uppercase">
              Support Reply-To Email <span className="text-rose-500">*</span>
            </label>
            <Input
              type="email"
              name="supportReplyToEmail"
              defaultValue={initialSettings.supportReplyToEmail}
              placeholder="support@domain.com"
              className="bg-white font-mono"
            />
            {state.fieldErrors?.supportReplyToEmail && (
              <p className="text-[11px] font-semibold text-rose-600">
                {state.fieldErrors.supportReplyToEmail[0]}
              </p>
            )}
          </div>

          {/* Email Toggles */}
          <div className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3.5">
            <div>
              <span className="text-xs font-semibold text-neutral-800">
                Customer Order Confirmation Email
              </span>
              <p className="text-[11px] text-neutral-500">Send HTML receipt to customer</p>
            </div>
            <div className="flex items-center">
              <input
                type="hidden"
                name="enableCustomerOrderEmail"
                value={customerEmail ? "true" : "false"}
              />
              <button
                type="button"
                role="switch"
                aria-checked={customerEmail}
                onClick={() => setCustomerEmail(!customerEmail)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-vl-cyan-500",
                  customerEmail ? "bg-emerald-600" : "bg-neutral-300"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                    customerEmail ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3.5">
            <div>
              <span className="text-xs font-semibold text-neutral-800">Manager Order Alert Email</span>
              <p className="text-[11px] text-neutral-500">Alert store staff on incoming orders</p>
            </div>
            <div className="flex items-center">
              <input
                type="hidden"
                name="enableAdminOrderAlertEmail"
                value={adminEmail ? "true" : "false"}
              />
              <button
                type="button"
                role="switch"
                aria-checked={adminEmail}
                onClick={() => setAdminEmail(!adminEmail)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-vl-cyan-500",
                  adminEmail ? "bg-emerald-600" : "bg-neutral-300"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                    adminEmail ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── BOTTOM ACTION FOOTER (NATURAL FLOW, NO FLOATING) ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-neutral-200/80 bg-white p-4 shadow-2xs">
        <div className="text-xs text-neutral-500">
          <span>Notification and messaging channel updates take effect immediately.</span>
        </div>
        <div className="flex items-center justify-end">
          <SubmitButton />
        </div>
      </div>
    </form>
  );
}
