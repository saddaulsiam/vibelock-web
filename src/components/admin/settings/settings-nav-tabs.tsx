"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BellRing,
  Boxes,
  CreditCard,
  Receipt,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Truck,
} from "lucide-react";

export function SettingsNavTabs() {
  const pathname = usePathname();
  const currentTab = pathname?.includes("/payments")
    ? "/admin/settings/payments"
    : pathname?.includes("/checkout")
      ? "/admin/settings/checkout"
      : pathname?.includes("/shipping")
        ? "/admin/settings/shipping"
        : pathname?.includes("/notifications")
          ? "/admin/settings/notifications"
          : pathname?.includes("/policies")
            ? "/admin/settings/policies"
            : pathname?.includes("/invoicing")
              ? "/admin/settings/invoicing"
              : pathname?.includes("/security")
                ? "/admin/settings/security"
                : "/admin/settings/general";

  return (
    <Tabs value={currentTab}>
      <TabsList variant="line" className="border-vl-dark-900/10 w-full justify-start border-b">
        <TabsTrigger
          value="/admin/settings/general"
          render={<Link href="/admin/settings/general" />}
          nativeButton={false}
          className="gap-2 text-xs font-semibold sm:text-sm"
        >
          <SlidersHorizontal className="text-vl-cyan-600 size-4" aria-hidden="true" />
          General Settings
        </TabsTrigger>
        <TabsTrigger
          value="/admin/settings/checkout"
          render={<Link href="/admin/settings/checkout" />}
          nativeButton={false}
          className="gap-2 text-xs font-semibold sm:text-sm"
        >
          <ShieldAlert className="size-4 text-amber-600" aria-hidden="true" />
          Checkout & COD Rules
        </TabsTrigger>
        <TabsTrigger
          value="/admin/settings/shipping"
          render={<Link href="/admin/settings/shipping" />}
          nativeButton={false}
          className="gap-2 text-xs font-semibold sm:text-sm"
        >
          <Truck className="size-4 text-purple-600" aria-hidden="true" />
          Shipping & Delivery
        </TabsTrigger>
        <TabsTrigger
          value="/admin/settings/notifications"
          render={<Link href="/admin/settings/notifications" />}
          nativeButton={false}
          className="gap-2 text-xs font-semibold sm:text-sm"
        >
          <BellRing className="size-4 text-emerald-600" aria-hidden="true" />
          Notifications & SMS
        </TabsTrigger>
        <TabsTrigger
          value="/admin/settings/policies"
          render={<Link href="/admin/settings/policies" />}
          nativeButton={false}
          className="gap-2 text-xs font-semibold sm:text-sm"
        >
          <Boxes className="size-4 text-amber-600" aria-hidden="true" />
          Inventory & Returns
        </TabsTrigger>
        <TabsTrigger
          value="/admin/settings/invoicing"
          render={<Link href="/admin/settings/invoicing" />}
          nativeButton={false}
          className="gap-2 text-xs font-semibold sm:text-sm"
        >
          <Receipt className="size-4 text-emerald-600" aria-hidden="true" />
          Tax & Invoicing
        </TabsTrigger>
        <TabsTrigger
          value="/admin/settings/security"
          render={<Link href="/admin/settings/security" />}
          nativeButton={false}
          className="gap-2 text-xs font-semibold sm:text-sm"
        >
          <Shield className="size-4 text-vl-cyan-600" aria-hidden="true" />
          Security & Pixels
        </TabsTrigger>
        <TabsTrigger
          value="/admin/settings/payments"
          render={<Link href="/admin/settings/payments" />}
          nativeButton={false}
          className="gap-2 text-xs font-semibold sm:text-sm"
        >
          <CreditCard className="text-vl-cyan-600 size-4" aria-hidden="true" />
          Payment Methods
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
