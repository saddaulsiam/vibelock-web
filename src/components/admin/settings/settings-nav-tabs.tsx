"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, SlidersHorizontal } from "lucide-react";

export function SettingsNavTabs() {
  const pathname = usePathname();
  const currentTab = pathname?.includes("/payments")
    ? "/admin/settings/payments"
    : "/admin/settings/general";

  return (
    <Tabs value={currentTab}>
      <TabsList variant="line" className="w-full justify-start border-b border-vl-dark-900/10">
        <TabsTrigger
          value="/admin/settings/general"
          render={<Link href="/admin/settings/general" />}
          nativeButton={false}
          className="gap-2 text-xs sm:text-sm font-semibold"
        >
          <SlidersHorizontal className="size-4 text-vl-cyan-600" aria-hidden="true" />
          General Settings
        </TabsTrigger>
        <TabsTrigger
          value="/admin/settings/payments"
          render={<Link href="/admin/settings/payments" />}
          nativeButton={false}
          className="gap-2 text-xs sm:text-sm font-semibold"
        >
          <CreditCard className="size-4 text-vl-cyan-600" aria-hidden="true" />
          Payment Methods
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
