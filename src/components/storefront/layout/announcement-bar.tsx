import * as React from "react";
import { Truck } from "lucide-react";

export function AnnouncementBar() {
  return (
    <aside
      aria-label="Announcement"
      className="relative z-50 flex h-8 items-center justify-center border-b border-white/10 bg-vl-black px-4 text-center sm:h-8.5"
    >
      <p className="flex items-center justify-center gap-2 text-compact font-bold tracking-wider text-vl-white uppercase sm:text-xs">
        <Truck className="size-3.5 shrink-0 text-vl-cyan" aria-hidden="true" />
        <span>
          FREE SHIPPING <span className="text-vl-cyan">ON ORDERS</span> OVER ৳2000
        </span>
      </p>
    </aside>
  );
}
