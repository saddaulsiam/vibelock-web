import * as React from "react";

export function AnnouncementBar() {
  return (
    <aside
      aria-label="Announcement"
      className="relative z-50 border-b border-[#F3F0E8]/10 bg-[#101114] px-4 py-2 text-center text-xs font-medium text-[#F3F0E8]/75 md:text-sm"
    >
      <p>
        VibeLock Streetwear <span className="text-[#00D9FF]">/</span> Modern Urban Identity for
        Dhaka
      </p>
    </aside>
  );
}
