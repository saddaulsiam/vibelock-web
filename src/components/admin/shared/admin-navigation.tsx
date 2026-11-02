"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { hasRequiredRole } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";
import {
  BarChart3,
  Boxes,
  CreditCard,
  FolderTree,
  LayoutDashboard,
  Menu,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
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
import { useState, useSyncExternalStore } from "react";

const SIDEBAR_STORAGE_KEY = "vibelock_admin_sidebar_collapsed";
const SIDEBAR_TOGGLE_EVENT = "vibelock:sidebar-toggle";

function subscribeSidebar(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SIDEBAR_TOGGLE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SIDEBAR_TOGGLE_EVENT, callback);
  };
}

function getSidebarSnapshot(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function getServerSidebarSnapshot(): boolean {
  return false;
}

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  minRole?: Role;
}

export interface NavGroup {
  group?: string;
  items: readonly NavItem[];
}

export const navGroups: readonly NavGroup[] = [
  {
    items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard, minRole: "STAFF" }],
  },
  {
    group: "Sales & Operations",
    items: [
      { label: "Orders", href: "/admin/orders", icon: ShoppingBag, minRole: "STAFF" },
      { label: "Shipping", href: "/admin/shipping", icon: Truck, minRole: "STAFF" },
      { label: "Returns", href: "/admin/returns", icon: RotateCcw, minRole: "STAFF" },
      { label: "Payments", href: "/admin/payments", icon: CreditCard, minRole: "MANAGER" },
    ],
  },
  {
    group: "Catalog & Stock",
    items: [
      { label: "Products", href: "/admin/products", icon: Boxes, minRole: "MANAGER" },
      { label: "Categories", href: "/admin/categories", icon: FolderTree, minRole: "MANAGER" },
      { label: "Inventory", href: "/admin/inventory", icon: PackageCheck, minRole: "STAFF" },
      {
        label: "Inventory Intelligence",
        href: "/admin/inventory-intelligence",
        icon: TrendingDown,
        minRole: "MANAGER",
      },
    ],
  },
  {
    group: "Marketing & CRM",
    items: [
      { label: "Customers", href: "/admin/customers", icon: Users, minRole: "MANAGER" },
      { label: "Reviews", href: "/admin/reviews", icon: Star, minRole: "MANAGER" },
      { label: "Coupons", href: "/admin/coupons", icon: Percent, minRole: "MANAGER" },
      { label: "Banners", href: "/admin/banners", icon: PanelsTopLeft, minRole: "MANAGER" },
    ],
  },
  {
    group: "Analytics & Settings",
    items: [
      { label: "Reports", href: "/admin/reports", icon: BarChart3, minRole: "MANAGER" },
      { label: "Admins", href: "/admin/admins", icon: ShieldCheck, minRole: "ADMIN" },
      { label: "Settings", href: "/admin/settings", icon: Settings, minRole: "ADMIN" },
    ],
  },
] as const;

export function filterNavGroupsByRole(
  groups: readonly NavGroup[],
  userRole: Role = "ADMIN"
): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasRequiredRole(userRole, item.minRole ?? "STAFF")),
    }))
    .filter((group) => group.items.length > 0);
}

function AdminNavLinks({
  onNavigate,
  userRole = "ADMIN",
  collapsed = false,
}: {
  onNavigate?: () => void;
  userRole?: Role;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const visibleGroups = filterNavGroupsByRole(navGroups, userRole);

  return (
    <nav aria-label="Admin navigation" className={cn("space-y-3", collapsed && "space-y-2")}>
      {visibleGroups.map((group, groupIdx) => (
        <div key={group.group || `group-${groupIdx}`} className="grid gap-1">
          {group.group &&
            (!collapsed ? (
              <p className="overflow-hidden px-3 pt-2 pb-1 text-[10px] font-bold tracking-[0.16em] whitespace-nowrap text-white/40 uppercase">
                {group.group}
              </p>
            ) : (
              <div
                className="mx-auto my-1.5 h-px w-6 bg-white/10"
                title={group.group}
                aria-hidden="true"
              />
            ))}
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
                title={collapsed ? label : undefined}
                className={cn(
                  "group relative flex min-h-10 items-center overflow-hidden rounded-xl text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none",
                  collapsed ? "mx-auto size-10 justify-center px-0" : "w-full gap-3 px-3",
                  active
                    ? "bg-white/10 font-semibold text-white shadow-2xs"
                    : "text-white/65 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon
                  className={cn(
                    collapsed ? "size-4" : "size-4",
                    "shrink-0 transition-colors",
                    active ? "text-[#00D9FF]" : "text-white/60 group-hover:text-white"
                  )}
                  aria-hidden="true"
                />
                {!collapsed && <span className="truncate whitespace-nowrap">{label}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function AdminSidebar({ userRole }: { userRole?: Role }) {
  const isCollapsed = useSyncExternalStore(
    subscribeSidebar,
    getSidebarSnapshot,
    getServerSidebarSnapshot
  );

  const toggleCollapse = () => {
    const next = !getSidebarSnapshot();
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      window.dispatchEvent(new Event(SIDEBAR_TOGGLE_EVENT));
    } catch {
      // Ignore localStorage exceptions (e.g., incognito restrictions)
    }
  };

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col overflow-hidden overflow-x-hidden bg-[#101114] text-white transition-[width] duration-300 ease-in-out [-ms-overflow-style:none] lg:flex lg:h-full [&::-webkit-scrollbar]:hidden",
        isCollapsed ? "w-18" : "w-64"
      )}
    >
      {/* Header with Brand & Collapse Trigger */}
      <div
        className={cn(
          "flex min-h-16 shrink-0 items-center overflow-hidden overflow-x-hidden border-b border-white/10 bg-[#101114] whitespace-nowrap",
          isCollapsed ? "justify-center px-2 py-3" : "justify-between px-5 py-3"
        )}
      >
        {!isCollapsed ? (
          <>
            <div className="min-w-0 overflow-hidden whitespace-nowrap">
              <Link
                href="/admin"
                className="font-heading rounded-sm text-lg font-black tracking-tight whitespace-nowrap text-white focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
              >
                VibeLock<span className="text-[#00D9FF]">.</span>
              </Link>
              <p className="text-[10px] font-bold tracking-[0.16em] whitespace-nowrap text-white/50 uppercase">
                Operations
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={toggleCollapse}
              className="size-7 shrink-0 cursor-pointer rounded-lg text-white/55 hover:bg-white/10 hover:text-white"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="size-4" />
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 overflow-hidden">
            <Link
              href="/admin"
              className="font-heading rounded-sm text-lg font-black tracking-tight text-white focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
              title="VibeLock Operations"
            >
              VL<span className="text-[#00D9FF]">.</span>
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={toggleCollapse}
              className="size-6 shrink-0 cursor-e-resize rounded-md text-white/55 hover:bg-white/10 hover:text-white"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="size-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div
        className={cn(
          "flex-1 scrollbar-none overflow-x-hidden overflow-y-auto py-4 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          isCollapsed ? "px-2" : "px-3"
        )}
      >
        <AdminNavLinks userRole={userRole} collapsed={isCollapsed} />
      </div>
    </aside>
  );
}

export function AdminMobileNavigation({ userRole }: { userRole?: Role }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="size-9 rounded-xl border-[#101114]/15 bg-white text-[#101114] shadow-2xs hover:bg-[#F3F0E8] sm:size-10 lg:hidden"
            aria-label="Open admin navigation"
          />
        }
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
          <AdminNavLinks userRole={userRole} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
