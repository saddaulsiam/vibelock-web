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
import { Badge } from "@/components/ui/badge";
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
          <span>Saving Notification Channels...</span>
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
    <form action={action} className="space-y-8">
      {/* ── ALERTS (ERROR & SUCCESS) ── */}
      {state.error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-900 shadow-2xs">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-600" />
          <div>
            <h4 className="font-bold">Failed to update notification settings</h4>
            <p className="mt-0.5 text-xs text-rose-700">{state.error}</p>
          </div>
        </div>
      )}

      {state.message && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-900 shadow-2xs">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div>
            <h4 className="font-bold">Notifications configuration updated</h4>
            <p className="mt-0.5 text-xs text-emerald-700">{state.message}</p>
          </div>
        </div>
      )}

      {/* ── SECTION 1: SMS GATEWAY RAIL & SENDER CONFIG ── */}
      <Card className="border-vl-dark-900/10 bg-white shadow-2xs">
        <CardHeader className="border-vl-dark-900/5 border-b pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg border border-purple-200 bg-purple-50 text-purple-700">
              <Smartphone className="size-4.5" />
            </div>
            <div>
              <CardTitle className="text-vl-dark-900 text-base font-bold">
                Bangladesh SMS Gateway Rail & API Routing
              </CardTitle>
              <CardDescription className="text-xs">
                Configure primary carrier provider, brand mask sender ID, and gateway credentials
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-6 p-5 sm:grid-cols-2">
          {/* Provider Selection */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-bold tracking-wider text-neutral-700 uppercase">
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
                    "rounded-lg border p-3 text-left text-xs font-bold transition-all",
                    provider === p.id
                      ? "border-purple-500 bg-purple-50 text-purple-900 ring-1 ring-purple-500"
                      : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                  )}
                >
                  <span className="block">{p.name}</span>
                  <span className="block text-[10px] font-normal text-neutral-500">{p.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sender ID */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold tracking-wider text-neutral-700 uppercase">
                SMS Sender ID (Masking) <span className="text-rose-500">*</span>
              </label>
              <Badge
                variant="outline"
                className="border-purple-300 bg-purple-50 text-[10px] text-purple-800"
              >
                Alphanumeric Mask
              </Badge>
            </div>
            <Input
              name="senderId"
              defaultValue={initialSettings.senderId}
              placeholder="e.g. VibeLock"
              className="bg-white font-mono"
            />
            {state.fieldErrors?.senderId && (
              <p className="text-[11px] font-semibold text-rose-600">
                {state.fieldErrors.senderId[0]}
              </p>
            )}
            <p className="text-[11px] text-neutral-500">
              Operator-approved brand masking text displayed on recipient handsets.
            </p>
          </div>

          {/* Gateway API Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold tracking-wider text-neutral-700 uppercase">
              Gateway API Key (Optional Override)
            </label>
            <Input
              type="password"
              name="smsApiKey"
              defaultValue={initialSettings.smsApiKey}
              placeholder="•••••••••••••••• (Leave blank to use .env)"
              className="bg-white font-mono"
            />
            <p className="text-[11px] text-neutral-500">
              When omitted, uses verified <code className="text-vl-dark-900">SMS_API_KEY</code> from
              server environment.
            </p>
          </div>

          {/* Gateway API URL */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-bold tracking-wider text-neutral-700 uppercase">
              Gateway API Endpoint URL (Optional Override)
            </label>
            <Input
              name="smsApiUrl"
              defaultValue={initialSettings.smsApiUrl}
              placeholder="https://api.bulksmsbd.com/api/sms/send (Leave blank to use .env)"
              className="bg-white font-mono text-xs"
            />
            <p className="text-[11px] text-neutral-500">
              Target HTTP endpoint for transactional payload dispatch.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 2: CUSTOMER TRANSACTIONAL SMS TRIGGERS ── */}
      <Card className="border-vl-dark-900/10 bg-white shadow-2xs">
        <CardHeader className="border-vl-dark-900/5 border-b pb-4">
          <div className="flex items-center gap-2.5">
            <div className="border-vl-cyan-200 bg-vl-cyan-50 text-vl-cyan-700 flex size-9 items-center justify-center rounded-lg border">
              <MessageSquare className="size-4.5" />
            </div>
            <div>
              <CardTitle className="text-vl-dark-900 text-base font-bold">
                Customer Transactional SMS Lifecycle Triggers
              </CardTitle>
              <CardDescription className="text-xs">
                Activate or silence automated SMS notifications for key parcel lifecycle milestones
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          {/* Trigger 1: Order Placed */}
          <div className="border-vl-dark-900/8 flex items-center justify-between rounded-lg border bg-neutral-50/70 p-3.5">
            <div>
              <span className="text-xs font-bold text-neutral-800">Order Placed Confirmation</span>
              <p className="text-[11px] text-neutral-500">
                Dispatches order invoice number upon checkout completion.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="hidden"
                name="notifyOnOrderPlaced"
                value={onOrderPlaced ? "true" : "false"}
              />
              <button
                type="button"
                onClick={() => setOnOrderPlaced(!onOrderPlaced)}
                className={cn(
                  "focus-visible:ring-vl-cyan-500 relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2",
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
          <div className="border-vl-dark-900/8 flex items-center justify-between rounded-lg border bg-neutral-50/70 p-3.5">
            <div>
              <span className="text-xs font-bold text-neutral-800">
                Courier Dispatch + Tracking Link
              </span>
              <p className="text-[11px] text-neutral-500">
                Includes Steadfast consignment tracking URL.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="hidden"
                name="notifyOnOrderDispatched"
                value={onDispatched ? "true" : "false"}
              />
              <button
                type="button"
                onClick={() => setOnDispatched(!onDispatched)}
                className={cn(
                  "focus-visible:ring-vl-cyan-500 relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2",
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
          <div className="border-vl-dark-900/8 flex items-center justify-between rounded-lg border bg-neutral-50/70 p-3.5">
            <div>
              <span className="text-xs font-bold text-neutral-800">Out for Delivery Alert</span>
              <p className="text-[11px] text-neutral-500">
                Warns customer that rider is en route to their address.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="hidden"
                name="notifyOnOutForDelivery"
                value={onOutDelivery ? "true" : "false"}
              />
              <button
                type="button"
                onClick={() => setOnOutDelivery(!onOutDelivery)}
                className={cn(
                  "focus-visible:ring-vl-cyan-500 relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2",
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
          <div className="border-vl-dark-900/8 flex items-center justify-between rounded-lg border bg-neutral-50/70 p-3.5">
            <div>
              <span className="text-xs font-bold text-neutral-800">Return / Refund Approved</span>
              <p className="text-[11px] text-neutral-500">
                Notifies shopper when return pickup consignment is approved.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="hidden"
                name="notifyOnReturnApproved"
                value={onReturnApproved ? "true" : "false"}
              />
              <button
                type="button"
                onClick={() => setOnReturnApproved(!onReturnApproved)}
                className={cn(
                  "focus-visible:ring-vl-cyan-500 relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2",
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

      {/* ── SECTION 3: STORE MANAGER ALERTS & HIGH-VALUE RADAR ── */}
      <Card className="border-vl-dark-900/10 bg-white shadow-2xs">
        <CardHeader className="border-vl-dark-900/5 border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 text-amber-700">
                <BellRing className="size-4.5" />
              </div>
              <div>
                <CardTitle className="text-vl-dark-900 text-base font-bold">
                  Store Manager Alerts & High-Value Order Radar
                </CardTitle>
                <CardDescription className="text-xs">
                  Instant SMS notifications sent to operations management for VIP orders
                </CardDescription>
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center gap-2">
              <input
                type="hidden"
                name="adminAlertsEnabled"
                value={adminAlerts ? "true" : "false"}
              />
              <button
                type="button"
                onClick={() => setAdminAlerts(!adminAlerts)}
                className={cn(
                  "focus-visible:ring-vl-cyan-500 relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2",
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

        <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
          {/* Admin Recipient Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold tracking-wider text-neutral-700 uppercase">
              Store Manager Alert Phone <span className="text-rose-500">*</span>
            </label>
            <Input
              name="adminAlertRecipientPhone"
              defaultValue={initialSettings.adminAlertRecipientPhone}
              disabled={!adminAlerts}
              placeholder="e.g. 8801311333277"
              className="bg-white font-mono"
            />
            {state.fieldErrors?.adminAlertRecipientPhone && (
              <p className="text-[11px] font-semibold text-rose-600">
                {state.fieldErrors.adminAlertRecipientPhone[0]}
              </p>
            )}
            <p className="text-[11px] text-neutral-500">
              Receives SMS alerts when orders exceeding the threshold are placed.
            </p>
          </div>

          {/* High-Value Threshold */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold tracking-wider text-neutral-700 uppercase">
              High-Value Order Radar Threshold (৳) <span className="text-rose-500">*</span>
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
            <p className="text-[11px] text-neutral-500">
              Orders equal to or above this value trigger instant priority dispatch alerts.
            </p>
          </div>

          {/* Low SMS Balance Warning Toggle */}
          <div className="border-vl-dark-900/8 flex items-center justify-between rounded-lg border bg-neutral-50/70 p-3 sm:col-span-2">
            <div>
              <span className="text-xs font-bold text-neutral-800">
                SMS Gateway Low-Credit Balance Alert
              </span>
              <p className="text-[11px] text-neutral-500">
                Warns manager when provider balance drops below 100 credits.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="hidden"
                name="adminAlertLowSmsBalanceWarning"
                value={lowBalanceWarn ? "true" : "false"}
              />
              <button
                type="button"
                onClick={() => setLowBalanceWarn(!lowBalanceWarn)}
                className={cn(
                  "focus-visible:ring-vl-cyan-500 relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2",
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
      <Card className="border-vl-dark-900/10 bg-white shadow-2xs">
        <CardHeader className="border-vl-dark-900/5 border-b pb-4">
          <div className="flex items-center gap-2.5">
            <div className="border-vl-dark-900/10 bg-vl-white-200 text-vl-dark-900 flex size-9 items-center justify-center rounded-lg border">
              <Mail className="size-4.5" />
            </div>
            <div>
              <CardTitle className="text-vl-dark-900 text-base font-bold">
                Email Dispatch Channels & Sender Profiles
              </CardTitle>
              <CardDescription className="text-xs">
                Resend transactional email triggers and recipient routing
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
          {/* Admin Notification Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold tracking-wider text-neutral-700 uppercase">
              Store Order Alert Email <span className="text-rose-500">*</span>
            </label>
            <Input
              type="email"
              name="adminNotificationEmail"
              defaultValue={initialSettings.adminNotificationEmail}
              className="bg-white font-mono"
            />
            {state.fieldErrors?.adminNotificationEmail && (
              <p className="text-[11px] font-semibold text-rose-600">
                {state.fieldErrors.adminNotificationEmail[0]}
              </p>
            )}
            <p className="text-[11px] text-neutral-500">
              Destination inbox for internal new-order notifications.
            </p>
          </div>

          {/* Support Reply-To Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold tracking-wider text-neutral-700 uppercase">
              Support Reply-To Address <span className="text-rose-500">*</span>
            </label>
            <Input
              type="email"
              name="supportReplyToEmail"
              defaultValue={initialSettings.supportReplyToEmail}
              className="bg-white font-mono"
            />
            {state.fieldErrors?.supportReplyToEmail && (
              <p className="text-[11px] font-semibold text-rose-600">
                {state.fieldErrors.supportReplyToEmail[0]}
              </p>
            )}
            <p className="text-[11px] text-neutral-500">
              Set as the Reply-To header in customer order receipts.
            </p>
          </div>

          {/* Email Toggles */}
          <div className="border-vl-dark-900/8 flex items-center justify-between rounded-lg border bg-neutral-50/70 p-3">
            <div>
              <span className="text-xs font-bold text-neutral-800">
                Customer Order Confirmation Email
              </span>
              <p className="text-[11px] text-neutral-500">Send HTML receipt via Resend.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="hidden"
                name="enableCustomerOrderEmail"
                value={customerEmail ? "true" : "false"}
              />
              <button
                type="button"
                onClick={() => setCustomerEmail(!customerEmail)}
                className={cn(
                  "focus-visible:ring-vl-cyan-500 relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2",
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

          <div className="border-vl-dark-900/8 flex items-center justify-between rounded-lg border bg-neutral-50/70 p-3">
            <div>
              <span className="text-xs font-bold text-neutral-800">Manager Order Alert Email</span>
              <p className="text-[11px] text-neutral-500">Alert store staff on incoming orders.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="hidden"
                name="enableAdminOrderAlertEmail"
                value={adminEmail ? "true" : "false"}
              />
              <button
                type="button"
                onClick={() => setAdminEmail(!adminEmail)}
                className={cn(
                  "focus-visible:ring-vl-cyan-500 relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2",
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

      {/* ── SAVE ACTION FOOTER ── */}
      <div className="border-vl-dark-900/10 flex items-center justify-between rounded-xl border bg-neutral-50 p-4 shadow-2xs">
        <div className="text-xs text-neutral-500">
          <span>SMS and notification channel updates are logged in </span>
          <code className="text-vl-dark-900 font-mono font-semibold">AuditLog</code> with actor
          attribution.
        </div>
        <SubmitButton />
      </div>
    </form>
  );
}
