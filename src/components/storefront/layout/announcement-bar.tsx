import * as React from "react";
import { Truck } from "lucide-react";

export function AnnouncementBar() {
  return (
    <aside
      aria-label="Announcement"
      className="bg-vl-black relative z-50 flex h-8 items-center justify-center border-b border-white/10 px-4 text-center sm:h-8.5"
    >
      <p className="text-compact text-vl-white flex items-center justify-center gap-2 font-bold tracking-wider uppercase sm:text-xs">
        <Truck className="text-vl-cyan size-3.5 shrink-0" aria-hidden="true" />
        <span>
          FREE SHIPPING <span className="text-vl-cyan">ON ORDERS</span> OVER ৳2000
        </span>
      </p>
    </aside>
  );
}
