"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { SecurityPixelSettings } from "@/lib/settings/security-pixel-settings";
import {
  updateSecurityPixelSettingsAction,
  type SecurityPixelActionState,
} from "@/lib/admin/settings/security-pixel-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  Mail,
  Save,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const initialState: SecurityPixelActionState = { error: null };

function SectionSubmitButton({ label = "Save Changes" }: { label?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      variant="primary"
      size="sm"
      className="gap-2 px-4 shadow-2xs font-semibold"
    >
      {pending ? (
        <>
          <Loader2 className="size-3.5 animate-spin text-white" aria-hidden="true" />
          <span>Saving...</span>
        </>
      ) : (
        <>
          <Save className="size-3.5" aria-hidden="true" />
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

export function SecurityPixelForm({ initialSettings }: { initialSettings: SecurityPixelSettings }) {
  const [metaState, metaAction] = useActionState(updateSecurityPixelSettingsAction, initialState);
  const [analyticsState, analyticsAction] = useActionState(updateSecurityPixelSettingsAction, initialState);
  const [securityGovernanceState, securityGovernanceAction] = useActionState(
    updateSecurityPixelSettingsAction,
    initialState
  );

  const [trackEcommerce, setTrackEcommerce] = useState(initialSettings.trackEcommerceEvents);
  const [enforce2FA, setEnforce2FA] = useState(initialSettings.enforceAdmin2FA);
  const [notifyFailedLogin, setNotifyFailedLogin] = useState(
    initialSettings.notifyFailedAdminLogin
  );

  const maskedToken = initialSettings.metaCapiAccessToken
    ? `••••••••••••••••••••••••••••••••${initialSettings.metaCapiAccessToken.slice(-6)}`
    : "";

  return (
    <div className="space-y-4">
      {/* ── SECTION 1: META (FACEBOOK) PIXEL & CONVERSIONS API (CAPI) ── */}
      <form action={metaAction}>
        <Card className="overflow-hidden rounded-xl border-neutral-200/80 bg-white shadow-2xs">
          <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
                <Globe className="size-4 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-neutral-900">
                  Meta Pixel & Conversions API (CAPI)
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500">
                  Server-side and browser tracking for Facebook & Instagram ad attribution
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <SectionAlert error={metaState.error} message={metaState.message} />

          <CardContent className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label
                  htmlFor="metaPixelId"
                  className="text-xs font-semibold tracking-wide text-neutral-700 uppercase"
                >
                  Meta Pixel ID
                </label>
                <Input
                  id="metaPixelId"
                  name="metaPixelId"
                  type="text"
                  defaultValue={initialSettings.metaPixelId}
                  placeholder="Pixel ID"
                  className="bg-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="metaTestEventCode"
                  className="text-xs font-semibold tracking-wide text-neutral-700 uppercase"
                >
                  Meta Test Event Code (Optional)
                </label>
                <Input
                  id="metaTestEventCode"
                  name="metaTestEventCode"
                  type="text"
                  defaultValue={initialSettings.metaTestEventCode}
                  placeholder="Test event code"
                  className="bg-white font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="metaCapiAccessToken"
                className="text-xs font-semibold tracking-wide text-neutral-700 uppercase"
              >
                Conversions API (CAPI) Server Token
              </label>
              <Input
                id="metaCapiAccessToken"
                name="metaCapiAccessToken"
                type="password"
                defaultValue={maskedToken}
                placeholder="Access token"
                className="bg-white font-mono"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-neutral-100 bg-neutral-50/50 px-5 py-3">
            <p className="text-xs text-neutral-500">
              Meta Pixel browser tracking, Conversions API (CAPI) server token, and test events.
            </p>
            <SectionSubmitButton label="Save Meta Config" />
          </CardFooter>
        </Card>
      </form>

      {/* ── SECTION 2: GOOGLE & TIKTOK ANALYTICS ── */}
      <form action={analyticsAction}>
        <Card className="overflow-hidden rounded-xl border-neutral-200/80 bg-white shadow-2xs">
          <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
                <Activity className="text-vl-cyan-600 size-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-neutral-900">
                  Google Tag Manager & Multi-Pixel
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500">
                  GTM container, GA4 measurement ID, and supplementary ad network tags
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <SectionAlert error={analyticsState.error} message={analyticsState.message} />

          <CardContent className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label
                  htmlFor="googleTagManagerId"
                  className="text-xs font-semibold tracking-wide text-neutral-700 uppercase"
                >
                  Google Tag Manager ID
                </label>
                <Input
                  id="googleTagManagerId"
                  name="googleTagManagerId"
                  type="text"
                  defaultValue={initialSettings.googleTagManagerId}
                  placeholder="GTM-XXXXXXX"
                  className="bg-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="googleAnalyticsId"
                  className="text-xs font-semibold tracking-wide text-neutral-700 uppercase"
                >
                  Google Analytics 4 (GA4) ID
                </label>
                <Input
                  id="googleAnalyticsId"
                  name="googleAnalyticsId"
                  type="text"
                  defaultValue={initialSettings.googleAnalyticsId}
                  placeholder="G-XXXXXXXXXX"
                  className="bg-white font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="tiktokPixelId"
                className="text-xs font-semibold tracking-wide text-neutral-700 uppercase"
              >
                TikTok Pixel ID
              </label>
              <Input
                id="tiktokPixelId"
                name="tiktokPixelId"
                type="text"
                defaultValue={initialSettings.tiktokPixelId}
                placeholder="Pixel ID"
                className="bg-white font-mono"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3">
              <div>
                <span className="text-xs font-semibold text-neutral-900">
                  Track Enhanced E-Commerce Milestones
                </span>
                <p className="text-[11px] text-neutral-500">
                  Capture ViewContent, AddToCart, and Purchase events across active tracking containers
                </p>
              </div>
              <Switch
                name="trackEcommerceEvents"
                checked={trackEcommerce}
                onCheckedChange={setTrackEcommerce}
                activeColor="cyan"
                aria-label="Track Enhanced E-Commerce Milestones"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-neutral-100 bg-neutral-50/50 px-5 py-3">
            <p className="text-xs text-neutral-500">
              Google Tag Manager container, GA4 measurement stream, and TikTok pixel tags.
            </p>
            <SectionSubmitButton label="Save Analytics Tags" />
          </CardFooter>
        </Card>
      </form>

      {/* ── SECTION 3: ADMIN ACCESS & SECURITY GOVERNANCE ── */}
      <form action={securityGovernanceAction}>
        <Card className="overflow-hidden rounded-xl border-neutral-200/80 bg-white shadow-2xs">
          <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
                <Shield className="size-4 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-neutral-900">
                  Admin Session & Perimeter Governance
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500">
                  Inactivity session timeouts, mandatory 2FA, and static IP allowlists
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <SectionAlert error={securityGovernanceState.error} message={securityGovernanceState.message} />

          <CardContent className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label
                  htmlFor="adminSessionTimeoutMinutes"
                  className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-neutral-700 uppercase"
                >
                  <Clock className="size-3.5 text-neutral-400" />
                  Inactivity Session Timeout
                </label>
                <select
                  id="adminSessionTimeoutMinutes"
                  name="adminSessionTimeoutMinutes"
                  defaultValue={initialSettings.adminSessionTimeoutMinutes}
                  className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-900 shadow-2xs focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                >
                  <option value="15">15 Minutes (High Security)</option>
                  <option value="30">30 Minutes</option>
                  <option value="60">60 Minutes (Standard)</option>
                  <option value="120">2 Hours</option>
                  <option value="240">4 Hours</option>
                  <option value="480">8 Hours (Full Shift)</option>
                </select>
                {securityGovernanceState.fieldErrors?.adminSessionTimeoutMinutes && (
                  <p className="text-[11px] font-semibold text-rose-600">
                    {securityGovernanceState.fieldErrors.adminSessionTimeoutMinutes[0]}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="securityContactEmail"
                  className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-neutral-700 uppercase"
                >
                  <Mail className="size-3.5 text-neutral-400" />
                  Security Breach Notification Email
                </label>
                <Input
                  id="securityContactEmail"
                  name="securityContactEmail"
                  type="email"
                  defaultValue={initialSettings.securityContactEmail}
                  placeholder="security@domain.com"
                  className="bg-white font-mono"
                />
                {securityGovernanceState.fieldErrors?.securityContactEmail && (
                  <p className="text-[11px] font-semibold text-rose-600">
                    {securityGovernanceState.fieldErrors.securityContactEmail[0]}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3">
              <div>
                <span className="text-xs font-semibold text-neutral-900">
                  Enforce Mandatory Two-Factor (2FA / OTP)
                </span>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  Require OTP verification for staff accounts with admin access
                </p>
              </div>
              <Switch
                name="enforceAdmin2FA"
                checked={enforce2FA}
                onCheckedChange={setEnforce2FA}
                activeColor="purple"
                aria-label="Enforce Mandatory Two-Factor"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="adminIpAllowlist"
                className="text-xs font-semibold tracking-wide text-neutral-700 uppercase"
              >
                Admin Static IP Address Allowlist
              </label>
              <Input
                id="adminIpAllowlist"
                name="adminIpAllowlist"
                type="text"
                defaultValue={initialSettings.adminIpAllowlist.join(", ")}
                placeholder="Leave blank for unrestricted access"
                className="bg-white font-mono"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3">
              <div>
                <span className="text-xs font-semibold text-neutral-900">
                  Notify on Consecutive Failed Admin Login Attempts
                </span>
              </div>
              <Switch
                name="notifyFailedAdminLogin"
                checked={notifyFailedLogin}
                onCheckedChange={setNotifyFailedLogin}
                activeColor="amber"
                aria-label="Notify on Consecutive Failed Admin Login Attempts"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-neutral-100 bg-neutral-50/50 px-5 py-3">
            <p className="text-xs text-neutral-500">
              Admin session timeout duration, mandatory two-factor auth, and static IP whitelist perimeter.
            </p>
            <SectionSubmitButton label="Save Security Governance" />
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
