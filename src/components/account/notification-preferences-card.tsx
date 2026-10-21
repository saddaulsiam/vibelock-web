"use client";

import { useState } from "react";
import type { NotificationPreferences } from "@/lib/account/notification-types";
import { updateNotificationPreferencesAction } from "@/lib/account/notification-actions";
import { toast } from "sonner";
import { Bell, PackageCheck, Flame, RefreshCw, Tag, Loader2, Check } from "lucide-react";

interface NotificationPreferencesCardProps {
  initialPreferences: NotificationPreferences;
}

export function NotificationPreferencesCard({
  initialPreferences,
}: NotificationPreferencesCardProps) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(initialPreferences);
  const [pending, setPending] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const toggle = (key: keyof NotificationPreferences) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setSavedSuccess(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setSavedSuccess(false);

    const result = await updateNotificationPreferencesAction(prefs);
    if (result.success) {
      setSavedSuccess(true);
      toast.success("Notification preferences updated!");
    } else {
      toast.error(result.error ?? "Failed to save notification preferences.");
    }
    setPending(false);
  };

  const notificationOptions = [
    {
      key: "orderUpdates" as const,
      title: "Order & Delivery Tracking",
      desc: "Receive real-time email and SMS status updates when orders are packed, dispatched, and out for courier delivery.",
      icon: PackageCheck,
      badge: "Essential",
    },
    {
      key: "dropAlerts" as const,
      title: "Limited Drop & Vault Release Alerts",
      desc: "Instant drop notifications before limited seasonal collections, graphic tees, and heavyweight hoodies release.",
      icon: Flame,
      badge: "Recommended",
    },
    {
      key: "restockAlerts" as const,
      title: "Back-in-Stock & Restock Notifications",
      desc: "Be the first to know when previously sold-out streetwear pieces and popular sizes are restocked.",
      icon: RefreshCw,
    },
    {
      key: "promoOffers" as const,
      title: "Exclusive Perks & Secret Vault Codes",
      desc: "Get member-only coupons, seasonal sale announcements, and special promo codes.",
      icon: Tag,
    },
  ];

  return (
    <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#101114]/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#101114] text-white">
            <Bell className="size-5 text-[#00D9FF]" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-[#101114] uppercase sm:text-xl">
              Notification Preferences
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
              Control which updates, drop alerts, and delivery notifications you receive.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {savedSuccess && (
          <div
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800"
            role="status"
          >
            <Check className="size-4 shrink-0 text-emerald-600" />
            <span>Notification settings updated successfully!</span>
          </div>
        )}

        <div className="space-y-3">
          {notificationOptions.map((opt) => {
            const isChecked = prefs[opt.key];
            const Icon = opt.icon;

            return (
              <div
                key={opt.key}
                onClick={() => toggle(opt.key)}
                className={`group flex cursor-pointer items-start justify-between gap-4 rounded-xl border p-4 transition-all ${
                  isChecked
                    ? "border-[#101114]/20 bg-[#F3F0E8]/40 hover:border-[#101114]/35"
                    : "border-[#101114]/10 bg-white hover:border-[#101114]/20 hover:bg-[#F3F0E8]/20"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                      isChecked
                        ? "border-[#101114] bg-[#101114] text-[#00D9FF]"
                        : "text-muted-foreground border-[#101114]/10 bg-white"
                    }`}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#101114]">{opt.title}</span>
                      {opt.badge && (
                        <span className="rounded-full bg-[#101114]/5 px-2 py-0.5 text-[9px] font-bold tracking-wider text-[#101114] uppercase">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-1 max-w-xl text-xs leading-relaxed">
                      {opt.desc}
                    </p>
                  </div>
                </div>

                {/* Switch Toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isChecked}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(opt.key);
                  }}
                  className={`relative mt-1 inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] ${
                    isChecked ? "bg-[#101114]" : "bg-gray-200"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      isChecked ? "translate-x-5 bg-[#00D9FF]" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end pt-3">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center rounded-xl bg-[#101114] px-6 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#1f2229] active:scale-95 disabled:opacity-50"
          >
            {pending ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Saving Preferences...</span>
              </span>
            ) : (
              "Save Notification Settings"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
