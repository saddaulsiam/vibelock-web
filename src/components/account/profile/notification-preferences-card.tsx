"use client";

import { useState } from "react";
import type { NotificationPreferences } from "@/lib/account/notification-types";
import { updateNotificationPreferencesAction } from "@/lib/account/notification-actions";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, PackageCheck, Flame, RefreshCw, Tag, Check } from "lucide-react";

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
    <Card variant="brand" className="p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="mb-5 border-b border-vl-dark-900/8 pb-5">
        <span className="text-[10px] font-semibold tracking-[0.15em] text-vl-cyan uppercase sm:text-[11px] sm:tracking-[0.2em]">
          Alerts & Updates
        </span>
        <div className="mt-0.5 flex items-center gap-2">
          <Bell className="size-4 text-vl-dark-900" />
          <h2 className="text-base font-bold tracking-tight text-vl-dark-900 uppercase sm:text-lg">
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
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs font-normal text-emerald-800"
            role="status"
          >
            <Check className="size-4 shrink-0 text-emerald-600" />
            <span>Notification preferences updated successfully!</span>
          </div>
        )}

        <div className="divide-y divide-vl-dark-900/6">
          {notificationOptions.map((opt) => {
            const isChecked = prefs[opt.key];
            const Icon = opt.icon;

            return (
              <div
                key={opt.key}
                onClick={() => toggle(opt.key)}
                className="group flex cursor-pointer items-start justify-between gap-3.5 py-4 transition-colors first:pt-1 sm:gap-4"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <Icon className="mt-0.5 size-4 shrink-0 text-neutral-400 group-hover:text-vl-dark-900" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="text-xs font-semibold text-vl-dark-900">{opt.title}</span>
                      {opt.badge && (
                        <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[9px] font-semibold tracking-wider text-neutral-700 uppercase">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-neutral-500 break-words">
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
                    isChecked ? "bg-vl-dark-900" : "bg-neutral-200"
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
        <div className="flex items-center justify-end border-t border-vl-dark-900/8 pt-5">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={pending}
          >
            Save Settings
          </Button>
        </div>
      </form>
    </Card>
  );
}
