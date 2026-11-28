"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellRing,
  Boxes,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Receipt,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Truck,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const SETTINGS_TABS = [
  {
    href: "/admin/settings/general",
    label: "General Settings",
    icon: SlidersHorizontal,
  },
  {
    href: "/admin/settings/checkout",
    label: "Checkout & COD",
    icon: ShieldAlert,
  },
  {
    href: "/admin/settings/shipping",
    label: "Shipping & Delivery",
    icon: Truck,
  },
  {
    href: "/admin/settings/notifications",
    label: "Notifications & SMS",
    icon: BellRing,
  },
  {
    href: "/admin/settings/policies",
    label: "Inventory & Returns",
    icon: Boxes,
  },
  {
    href: "/admin/settings/invoicing",
    label: "Tax & Invoicing",
    icon: Receipt,
  },
  {
    href: "/admin/settings/security",
    label: "Security & Pixels",
    icon: Shield,
  },
  {
    href: "/admin/settings/loyalty",
    label: "Loyalty Program",
    icon: Sparkles,
  },
  {
    href: "/admin/settings/payments",
    label: "Payment Methods",
    icon: CreditCard,
  },
] as const;

export function SettingsNavTabs() {
  const pathname = usePathname();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Match the active tab based on pathname
  const matchedTab = SETTINGS_TABS.find(
    (tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`)
  );
  const activeValue = matchedTab?.href ?? SETTINGS_TABS[0].href;

  const checkScrollability = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    checkScrollability();
    const el = scrollContainerRef.current;
    if (!el) return;

    // Scroll active tab into view smoothly
    const activeEl = el.querySelector<HTMLElement>("[data-active]");
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }

    const timer = setTimeout(() => {
      checkScrollability();
      const currentActive = el.querySelector<HTMLElement>("[data-active]");
      if (currentActive) {
        currentActive.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }, 100);

    const resizeObserver = new ResizeObserver(() => {
      checkScrollability();
    });
    resizeObserver.observe(el);

    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth > el.clientWidth && e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
        checkScrollability();
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      el.removeEventListener("wheel", onWheel);
    };
  }, [pathname]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const amount = direction === "left" ? -240 : 240;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <Tabs value={activeValue} className="w-full">
      <div className="group relative flex w-full items-center">
        {/* Scroll Left Button */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Scroll settings tabs left"
            className="absolute -left-1 z-20 flex size-7 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-800 shadow-md transition-all hover:scale-105 hover:bg-neutral-100 active:scale-95"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}

        {/* Scroll Container */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScrollability}
          className="w-full scrollbar-none overflow-x-auto scroll-smooth py-1"
        >
          <TabsList
            aria-label="Settings Navigation"
            variant="default"
            size="default"
            className="inline-flex h-9 w-auto min-w-full justify-start gap-1 p-1 sm:min-w-0"
          >
            {SETTINGS_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeValue === tab.href;

              return (
                <TabsTrigger
                  key={tab.href}
                  value={tab.href}
                  render={<Link href={tab.href} />}
                  nativeButton={false}
                  className={cn(
                    "h-7 gap-1.5 px-3 py-1 text-xs whitespace-nowrap",
                    "data-active:border-vl-cyan-400/80 font-medium data-active:border data-active:font-semibold data-active:text-neutral-950"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-3.5 shrink-0 transition-colors",
                      isActive
                        ? "text-vl-cyan-600"
                        : "text-neutral-400 group-hover/tabs-trigger:text-neutral-700"
                    )}
                    aria-hidden="true"
                  />
                  <span>{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Scroll Right Button */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Scroll settings tabs right"
            className="absolute -right-1 z-20 flex size-7 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-800 shadow-md transition-all hover:scale-105 hover:bg-neutral-100 active:scale-95"
          >
            <ChevronRight className="size-4" />
          </button>
        )}
      </div>
    </Tabs>
  );
}
