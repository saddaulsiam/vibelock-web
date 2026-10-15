import * as React from "react";
import { Truck } from "lucide-react";

export function AnnouncementBar() {
  return (
    <aside
      aria-label="Announcement"
      className="relative z-50 flex h-8 sm:h-[34px] items-center justify-center border-b border-white/10 bg-[#101114] px-4 text-center"
    >
      <p className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#F3F0E8] sm:text-xs">
        <Truck className="size-3.5 shrink-0 text-[#00D9FF]" aria-hidden="true" />
        <span>
          FREE SHIPPING <span className="text-[#00D9FF]">ON ORDERS</span> OVER ৳2000
        </span>
      </p>
    </aside>
  );
}
