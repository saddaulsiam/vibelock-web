"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  BarChart3,
  Boxes,
  CreditCard,
  FolderTree,
  LayoutDashboard,
  Menu,
  PackageCheck,
  PanelsTopLeft,
  Percent,
  RotateCcw,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  TrendingDown,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
}

interface NavGroup {
  group?: string;
  items: readonly NavItem[];
}

const navGroups: readonly NavGroup[] = [
  {
    items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard }],
  },
  {
    group: "Sales & Operations",
    items: [
      { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
      { label: "Shipping", href: "/admin/shipping", icon: Truck },
      { label: "Returns", href: "/admin/returns", icon: RotateCcw },
      { label: "Payments", href: "/admin/payments", icon: CreditCard },
    ],
  },
  {
    group: "Catalog & Stock",
    items: [
      { label: "Products", href: "/admin/products", icon: Boxes },
      { label: "Categories", href: "/admin/categories", icon: FolderTree },
      { label: "Inventory", href: "/admin/inventory", icon: PackageCheck },
      {
        label: "Inventory Intelligence",
        href: "/admin/inventory-intelligence",
        icon: TrendingDown,
      },
    ],
  },
  {
    group: "Marketing & CRM",
    items: [
      { label: "Customers", href: "/admin/customers", icon: Users },
      { label: "Reviews", href: "/admin/reviews", icon: Star },
      { label: "Coupons", href: "/admin/coupons", icon: Percent },
      { label: "Banners", href: "/admin/banners", icon: PanelsTopLeft },
    ],
  },
  {
    group: "Analytics & Settings",
    items: [
      { label: "Reports", href: "/admin/reports", icon: BarChart3 },
      { label: "Admins", href: "/admin/admins", icon: ShieldCheck },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
] as const;

function AdminNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin navigation" className="space-y-4">
      {navGroups.map((group, groupIdx) => (
        <div key={group.group || `group-${groupIdx}`} className="grid gap-0.5">
          {group.group && (
            <p className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-[0.16em] text-white/40 uppercase">
              {group.group}
            </p>
          )}
          {group.items.map(({ label, href, icon: Icon }) => {
            const active =
              href === "/admin"
                ? pathname === href
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={`inline-flex min-h-10 items-center gap-3 border-l-2 px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2 focus-visible:outline-none ${
                  active
                    ? "border-[#00D9FF] bg-white/10 font-semibold text-white"
                    : "border-transparent text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function AdminSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-[#101114] text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:overflow-y-auto">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#101114] px-6 py-6">
        <Link
          href="/admin"
          className="rounded-sm text-xl font-extrabold tracking-[-0.06em] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
        >
          VibeLock<span className="text-[#00D9FF]">.</span>
        </Link>
        <p className="mt-1 text-xs font-medium tracking-[0.16em] text-white/55 uppercase">
          Operations
        </p>
      </div>
      <div className="flex-1 px-3 py-5">
        <AdminNavLinks />
      </div>
    </aside>
  );
}

export function AdminMobileNavigation() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open admin navigation"
        className="inline-flex size-11 items-center justify-center border border-[#101114]/15 text-[#101114] transition-colors hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[min(86vw,20rem)] border-0 bg-[#101114] p-0 text-white"
      >
        <SheetHeader className="border-b border-white/10 px-5 py-6">
          <SheetTitle className="text-left text-xl font-extrabold tracking-[-0.06em] text-white">
            VibeLock<span className="text-[#00D9FF]">.</span>
            <span className="ml-2 text-xs font-medium tracking-[0.16em] text-white/55 uppercase">
              Operations
            </span>
          </SheetTitle>
        </SheetHeader>
        <div className="px-3 py-5">
          <AdminNavLinks onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
