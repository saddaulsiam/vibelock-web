import * as React from "react";
import { AlertTriangle, Calendar, Truck } from "lucide-react";

export interface AnnouncementBarProps {
  holidayBanner?: string | null;
  shippingBanner?: string | null;
  maintenanceBypass?: boolean;
}

export function AnnouncementBar({
  holidayBanner,
  shippingBanner,
  maintenanceBypass,
}: AnnouncementBarProps) {
  if (maintenanceBypass) {
    return (
      <aside
        aria-label="Maintenance Notice"
        className="relative z-50 flex h-8 items-center justify-center border-b border-amber-500/20 bg-amber-500/10 px-4 text-center sm:h-8.5"
      >
        <p className="flex items-center justify-center gap-2 text-xs font-semibold text-amber-500">
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
          <span>Maintenance Mode Active (Staff Bypass View)</span>
        </p>
      </aside>
    );
  }

  if (holidayBanner) {
    return (
      <aside
        aria-label="Holiday Notice"
        className="relative z-50 flex h-8 items-center justify-center border-b border-purple-500/20 bg-purple-950/80 px-4 text-center sm:h-8.5"
      >
        <p className="flex items-center justify-center gap-2 text-xs font-medium text-purple-200">
          <Calendar className="size-3.5 shrink-0 text-purple-400" aria-hidden="true" />
          <span>{holidayBanner}</span>
        </p>
      </aside>
    );
  }

  if (shippingBanner) {
    return (
      <aside
        aria-label="Announcement"
        className="bg-vl-black relative z-50 flex h-8 items-center justify-center border-b border-white/10 px-4 text-center sm:h-8.5"
      >
        <p className="text-compact text-vl-white flex items-center justify-center gap-2 font-bold tracking-wider uppercase sm:text-xs">
          <Truck className="text-vl-cyan size-3.5 shrink-0" aria-hidden="true" />
          <span>{shippingBanner}</span>
        </p>
      </aside>
    );
  }

  return null;
}
