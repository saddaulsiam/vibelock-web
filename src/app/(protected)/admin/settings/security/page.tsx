import { requireRole } from "@/lib/auth/authorization";
import { getSecurityPixelSettings } from "@/lib/settings/security-pixel-settings";
import { SecurityPixelForm } from "@/components/admin/settings/security-pixel-form";
import {
  Activity,
  Clock,
  Globe,
  Lock,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminSecuritySettingsPage() {
  // Enforce ADMIN role
  await requireRole("ADMIN");

  const { settings, hasStore } = await getSecurityPixelSettings();

  const activePixelCount = [
    Boolean(settings.metaPixelId),
    Boolean(settings.googleTagManagerId),
    Boolean(settings.googleAnalyticsId),
    Boolean(settings.tiktokPixelId),
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary KPI Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Tracking Pixels */}
        <div className="flex items-center gap-4 rounded-xl border border-vl-dark-900/10 bg-vl-white p-4 shadow-sm dark:border-vl-dark-800 dark:bg-vl-dark-900">
          <div className="flex size-11 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
            <Globe className="size-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-vl-dark-500 dark:text-vl-dark-400">Active Pixels</p>
            <p className="text-xl font-bold tracking-tight text-vl-dark-950 dark:text-vl-white">
              {activePixelCount} Connected
            </p>
            <p className="text-[11px] text-vl-dark-400">
              {settings.metaPixelId ? "Meta Pixel Active" : "No Meta Pixel"}
            </p>
          </div>
        </div>

        {/* Metric 2: GTM / GA4 */}
        <div className="flex items-center gap-4 rounded-xl border border-vl-dark-900/10 bg-vl-white p-4 shadow-sm dark:border-vl-dark-800 dark:bg-vl-dark-900">
          <div className="flex size-11 items-center justify-center rounded-lg bg-vl-cyan-500/10 text-vl-cyan-600 dark:bg-vl-cyan-500/20 dark:text-vl-cyan-400">
            <Activity className="size-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-vl-dark-500 dark:text-vl-dark-400">Tag Manager</p>
            <p className="text-sm font-bold tracking-tight text-vl-dark-950 dark:text-vl-white truncate max-w-[160px]">
              {settings.googleTagManagerId || "GTM Standby"}
            </p>
            <p className="text-[11px] text-vl-dark-400 truncate max-w-[160px]">
              {settings.googleAnalyticsId || "Direct GA4 Standby"}
            </p>
          </div>
        </div>

        {/* Metric 3: Session Timeout */}
        <div className="flex items-center gap-4 rounded-xl border border-vl-dark-900/10 bg-vl-white p-4 shadow-sm dark:border-vl-dark-800 dark:bg-vl-dark-900">
          <div className="flex size-11 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
            <Clock className="size-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-vl-dark-500 dark:text-vl-dark-400">Session Timeout</p>
            <p className="text-xl font-bold tracking-tight text-vl-dark-950 dark:text-vl-white">
              {settings.adminSessionTimeoutMinutes} Min
            </p>
            <p className="text-[11px] text-vl-dark-400">
              {settings.enforceAdmin2FA ? "Mandatory 2FA Active" : "Standard Auth"}
            </p>
          </div>
        </div>

        {/* Metric 4: IP Perimeter */}
        <div className="flex items-center gap-4 rounded-xl border border-vl-dark-900/10 bg-vl-white p-4 shadow-sm dark:border-vl-dark-800 dark:bg-vl-dark-900">
          <div className="flex size-11 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
            <Shield className="size-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-vl-dark-500 dark:text-vl-dark-400">IP Perimeter</p>
            <p className="text-xl font-bold tracking-tight text-vl-dark-950 dark:text-vl-white">
              {settings.adminIpAllowlist.length > 0 ? `${settings.adminIpAllowlist.length} IPs` : "Open (Global)"}
            </p>
            <p className="text-[11px] text-vl-dark-400">
              {settings.notifyFailedAdminLogin ? "Login alerts enabled" : "Alerts paused"}
            </p>
          </div>
        </div>
      </div>

      {/* Storage Strategy A Badge Notice */}
      <div className="flex items-center justify-between rounded-xl border border-vl-dark-900/10 bg-vl-dark-900/[0.02] p-3 text-xs dark:border-vl-dark-800 dark:bg-vl-dark-900/30">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "size-2 rounded-full",
              hasStore ? "bg-emerald-500" : "bg-amber-500"
            )}
          />
          <span className="font-medium text-vl-dark-700 dark:text-vl-dark-300">
            {hasStore
              ? "Active database policy record (StoreSetting: SECURITY_PIXEL_CONFIG)"
              : "Running on Strategy A fallback defaults (Unmigrated fallback resilient)"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-vl-dark-400">
          <Lock className="size-3.5" />
          <span>Admin Access Protected</span>
        </div>
      </div>

      {/* Main Settings Form */}
      <SecurityPixelForm initialSettings={settings} />
    </div>
  );
}
