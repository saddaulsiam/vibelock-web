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
      title: "Order & Courier Tracking",
      desc: "Receive real-time notifications when your drop is verified, packed, and dispatched for courier transit.",
      icon: PackageCheck,
      badge: "Essential",
    },
    {
      key: "dropAlerts" as const,
      title: "Limited Drop Alerts",
      desc: "Early notifications prior to seasonal collection launches, graphic drops, and heavyweight editions.",
      icon: Flame,
      badge: "Recommended",
    },
    {
      key: "restockAlerts" as const,
      title: "Back-in-Stock Alerts",
      desc: "Alerts when sold-out streetwear pieces, sizes, or seasonal items are replenished.",
      icon: RefreshCw,
    },
    {
      key: "promoOffers" as const,
      title: "Promotions & Secret Vault Codes",
      desc: "Exclusive member promotions, private sales, and seasonal coupon drops.",
      icon: Tag,
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-[#101114]/8 bg-white p-6 shadow-2xs sm:p-8">
      {/* Header */}
      <div className="mb-5 border-b border-[#101114]/8 pb-5">
        <span className="text-[11px] font-bold tracking-[0.2em] text-[#00D9FF] uppercase">
          Alerts & Updates
        </span>
        <div className="mt-0.5 flex items-center gap-2">
          <Bell className="size-4 text-[#101114]" />
          <h2 className="text-base font-black tracking-tight text-[#101114] uppercase sm:text-lg">
            Notification Settings
          </h2>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          Customize order updates, drop announcements, and back-in-stock alerts.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {savedSuccess && (
          <div
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs font-semibold text-emerald-800"
            role="status"
          >
            <Check className="size-4 shrink-0 text-emerald-600" />
            <span>Notification preferences updated successfully!</span>
          </div>
        )}

        <div className="divide-y divide-[#101114]/6">
          {notificationOptions.map((opt) => {
            const isChecked = prefs[opt.key];
            const Icon = opt.icon;

            return (
              <div
                key={opt.key}
                onClick={() => toggle(opt.key)}
                className="group flex cursor-pointer items-start justify-between gap-4 py-4 transition-colors first:pt-1"
              >
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 size-4 shrink-0 text-neutral-400 group-hover:text-[#101114]" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#101114]">{opt.title}</span>
                      {opt.badge && (
                        <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[9px] font-bold tracking-wider text-neutral-700 uppercase">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 max-w-xl text-xs text-neutral-500 leading-relaxed">
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
                  className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 ${
                    isChecked ? "bg-[#101114]" : "bg-neutral-200"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                      isChecked ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end border-t border-[#101114]/8 pt-5">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#101114] px-6 py-2.5 text-xs font-bold tracking-wider text-white uppercase transition-colors hover:bg-neutral-800 active:scale-95 disabled:opacity-50"
          >
            {pending ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Saving...</span>
              </span>
            ) : (
              "Save Settings"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
