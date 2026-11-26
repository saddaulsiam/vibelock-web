"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { SecurityPixelSettings } from "@/lib/settings/security-pixel-settings";
import {
  updateSecurityPixelSettingsAction,
  type SecurityPixelActionState,
} from "@/lib/admin/settings/security-pixel-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  Lock,
  Mail,
  Save,
  Shield,
} from "lucide-react";

const initialState: SecurityPixelActionState = { error: null };

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
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          <span>Saving Security Controls...</span>
        </>
      ) : (
        <>
          <Save className="size-4" aria-hidden="true" />
          <span>Save Security & Tracking Config</span>
        </>
      )}
    </Button>
  );
}

export function SecurityPixelForm({ initialSettings }: { initialSettings: SecurityPixelSettings }) {
  const [state, formAction] = useActionState(updateSecurityPixelSettingsAction, initialState);

  const maskedToken = initialSettings.metaCapiAccessToken
    ? `••••••••••••••••••••••••••••••••${initialSettings.metaCapiAccessToken.slice(-6)}`
    : "";

  return (
    <form action={formAction} className="space-y-8">
      {/* Status Alerts */}
      {state.error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/90 p-4 text-red-900 shadow-sm dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          <AlertTriangle className="size-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
          <div className="text-sm font-medium">
            <p>{state.error}</p>
          </div>
        </div>
      )}

      {state.message && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-900 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          <div className="text-sm font-medium">
            <p>{state.message}</p>
          </div>
        </div>
      )}

      {/* Grid: 2 columns */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* CARD 1: META (FACEBOOK) PIXEL & CAPI */}
        <Card className="border-vl-dark-900/10 shadow-sm dark:border-vl-dark-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                <Globe className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Meta Pixel & Conversions API (CAPI)</CardTitle>
                <CardDescription className="text-xs">
                  Server-side and browser tracking for Facebook & Instagram ad attribution.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="metaPixelId" className="text-xs font-semibold text-vl-dark-700 dark:text-vl-dark-300">
                Meta Pixel ID
              </label>
              <Input
                id="metaPixelId"
                name="metaPixelId"
                type="text"
                defaultValue={initialSettings.metaPixelId}
                placeholder="e.g. 123456789012345"
              />
              <p className="text-[11px] text-vl-dark-500">
                Injected into storefront layout for standard browser event capture.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="metaCapiAccessToken" className="text-xs font-semibold text-vl-dark-700 dark:text-vl-dark-300">
                Conversions API (CAPI) Server Token
              </label>
              <Input
                id="metaCapiAccessToken"
                name="metaCapiAccessToken"
                type="password"
                defaultValue={maskedToken}
                placeholder="EAAB..."
              />
              <p className="text-[11px] text-vl-dark-500">
                Authorizes direct server-to-server purchase event tracking (leaves unchanged if masked).
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="metaTestEventCode" className="text-xs font-semibold text-vl-dark-700 dark:text-vl-dark-300">
                Meta Test Event Code (Optional)
              </label>
              <Input
                id="metaTestEventCode"
                name="metaTestEventCode"
                type="text"
                defaultValue={initialSettings.metaTestEventCode}
                placeholder="TEST12345"
              />
              <p className="text-[11px] text-vl-dark-500">
                Temporary code from Meta Events Manager to verify live diagnostics.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: GOOGLE & TIKTOK ANALYTICS */}
        <Card className="border-vl-dark-900/10 shadow-sm dark:border-vl-dark-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-vl-cyan-500/10 text-vl-cyan-600 dark:bg-vl-cyan-500/20 dark:text-vl-cyan-400">
                <Activity className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Google Tag Manager & Multi-Pixel</CardTitle>
                <CardDescription className="text-xs">
                  GTM container, GA4 measurement ID, and supplementary ad network tags.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="googleTagManagerId" className="text-xs font-semibold text-vl-dark-700 dark:text-vl-dark-300">
                  Google Tag Manager ID
                </label>
                <Input
                  id="googleTagManagerId"
                  name="googleTagManagerId"
                  type="text"
                  defaultValue={initialSettings.googleTagManagerId}
                  placeholder="GTM-XXXXXXX"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="googleAnalyticsId" className="text-xs font-semibold text-vl-dark-700 dark:text-vl-dark-300">
                  Google Analytics 4 (GA4) ID
                </label>
                <Input
                  id="googleAnalyticsId"
                  name="googleAnalyticsId"
                  type="text"
                  defaultValue={initialSettings.googleAnalyticsId}
                  placeholder="G-XXXXXXXXXX"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="tiktokPixelId" className="text-xs font-semibold text-vl-dark-700 dark:text-vl-dark-300">
                TikTok Pixel ID
              </label>
              <Input
                id="tiktokPixelId"
                name="tiktokPixelId"
                type="text"
                defaultValue={initialSettings.tiktokPixelId}
                placeholder="e.g. C5A1B2C3D4E5"
              />
            </div>

            <div className="pt-2 border-t border-vl-dark-900/10 dark:border-vl-dark-800">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="trackEcommerceEvents"
                  value="true"
                  defaultChecked={initialSettings.trackEcommerceEvents}
                  className="mt-1 size-4 rounded border-vl-dark-900/20 text-vl-cyan-600 focus:ring-vl-cyan-500"
                />
                <div>
                  <span className="text-sm font-medium text-vl-dark-900 dark:text-vl-white">
                    Track Enhanced E-Commerce Milestones
                  </span>
                  <p className="text-xs text-vl-dark-500 dark:text-vl-dark-400">
                    Fires ViewContent, AddToCart, InitiateCheckout, and Purchase events across active tracking containers.
                  </p>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* CARD 3: ADMIN SESSION & ACCESS GOVERNANCE */}
        <Card className="border-vl-dark-900/10 shadow-sm dark:border-vl-dark-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                <Lock className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Admin Session & Access Governance</CardTitle>
                <CardDescription className="text-xs">
                  Inactivity logout thresholds and high-security access controls for admin users.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="adminSessionTimeoutMinutes" className="text-xs font-semibold text-vl-dark-700 dark:text-vl-dark-300 flex items-center gap-1.5">
                <Clock className="size-3.5 text-vl-dark-400" />
                Admin Inactivity Session Timeout
              </label>
              <select
                id="adminSessionTimeoutMinutes"
                name="adminSessionTimeoutMinutes"
                defaultValue={initialSettings.adminSessionTimeoutMinutes}
                className="w-full rounded-md border border-vl-dark-900/20 bg-vl-white px-3 py-2 text-xs text-vl-dark-900 shadow-sm focus:border-vl-cyan-500 focus:outline-none focus:ring-1 focus:ring-vl-cyan-500 dark:border-vl-dark-700 dark:bg-vl-dark-800 dark:text-vl-white"
              >
                <option value="15">15 Minutes (High Security)</option>
                <option value="30">30 Minutes</option>
                <option value="60">60 Minutes (Standard)</option>
                <option value="120">2 Hours</option>
                <option value="240">4 Hours</option>
                <option value="480">8 Hours (Full Shift)</option>
              </select>
              <p className="text-[11px] text-vl-dark-500">
                Automatically terminates idle dashboard sessions to safeguard inventory and sensitive customer data.
              </p>
              {state.fieldErrors?.adminSessionTimeoutMinutes && (
                <p className="text-xs text-red-500">{state.fieldErrors.adminSessionTimeoutMinutes[0]}</p>
              )}
            </div>

            <div className="rounded-xl border border-vl-dark-900/10 bg-vl-dark-900/[0.02] p-4 dark:border-vl-dark-800 dark:bg-vl-dark-900/40">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="enforceAdmin2FA"
                  value="true"
                  defaultChecked={initialSettings.enforceAdmin2FA}
                  className="mt-1 size-4 rounded border-vl-dark-900/20 text-vl-cyan-600 focus:ring-vl-cyan-500"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-vl-dark-900 dark:text-vl-white">
                      Enforce Mandatory Two-Factor (2FA / OTP)
                    </span>
                    <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-200">
                      Recommended
                    </Badge>
                  </div>
                  <p className="text-xs text-vl-dark-500 dark:text-vl-dark-400">
                    Requires SMS or authenticator OTP verification for all staff accounts with ADMIN permissions.
                  </p>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* CARD 4: PERIMETER IP ALLOWLIST & SECURITY ALERTS */}
        <Card className="border-vl-dark-900/10 shadow-sm dark:border-vl-dark-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                <Shield className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">IP Allowlist & Breach Notifications</CardTitle>
                <CardDescription className="text-xs">
                  Network perimeter restrictions and automated security alert routing.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="adminIpAllowlist" className="text-xs font-semibold text-vl-dark-700 dark:text-vl-dark-300">
                  Admin IP Address Allowlist
                </label>
                <span className="text-[10px] text-vl-dark-500">Leave blank for unrestricted access</span>
              </div>
              <Input
                id="adminIpAllowlist"
                name="adminIpAllowlist"
                type="text"
                defaultValue={initialSettings.adminIpAllowlist.join(", ")}
                placeholder="103.145.12.10, 192.168.1.1"
              />
              <p className="text-[11px] text-vl-dark-500">
                Comma-separated static public IPs permitted to access `/admin`.
              </p>
            </div>

            <div className="rounded-xl border border-vl-dark-900/10 bg-vl-dark-900/[0.02] p-4 dark:border-vl-dark-800 dark:bg-vl-dark-900/40">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="notifyFailedAdminLogin"
                  value="true"
                  defaultChecked={initialSettings.notifyFailedAdminLogin}
                  className="mt-1 size-4 rounded border-vl-dark-900/20 text-vl-cyan-600 focus:ring-vl-cyan-500"
                />
                <div>
                  <span className="text-sm font-medium text-vl-dark-900 dark:text-vl-white">
                    Notify on Failed Admin Login Attempts
                  </span>
                  <p className="text-xs text-vl-dark-500 dark:text-vl-dark-400">
                    Dispatches an emergency alert when consecutive failed login attempts occur on admin accounts.
                  </p>
                </div>
              </label>
            </div>

            <div className="space-y-2">
              <label htmlFor="securityContactEmail" className="text-xs font-semibold text-vl-dark-700 dark:text-vl-dark-300 flex items-center gap-1.5">
                <Mail className="size-3.5 text-vl-dark-400" />
                Security Alerts Notification Email
              </label>
              <Input
                id="securityContactEmail"
                name="securityContactEmail"
                type="email"
                defaultValue={initialSettings.securityContactEmail}
                placeholder="security@vibelock.com"
              />
              {state.fieldErrors?.securityContactEmail && (
                <p className="text-xs text-red-500">{state.fieldErrors.securityContactEmail[0]}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Save Actions Bar */}
      <div className="flex items-center justify-between rounded-xl border border-vl-dark-900/10 bg-vl-dark-900/[0.02] p-4 dark:border-vl-dark-800 dark:bg-vl-dark-900/40">
        <p className="text-xs text-vl-dark-500 dark:text-vl-dark-400">
          Tracking pixels and security controls update in real-time across both storefront and administrative routes.
        </p>
        <SubmitButton />
      </div>
    </form>
  );
}
