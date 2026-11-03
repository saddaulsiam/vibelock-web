"use client";

import { logoutAction } from "@/app/actions/auth";
import { LayoutDashboard, LogOut, RotateCcw, ShoppingBag, Ticket, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AccountCouponsModal, CouponItem } from "../dashboard/account-coupons-modal";
import { Button } from "@/components/ui/button";

interface AccountShellProps {
  profile: {
    name: string | null;
    email: string;
    emailVerified: Date | null;
    image: string | null;
  };
  coupons: CouponItem[];
  children: React.ReactNode;
}

export function AccountShell({ profile, coupons, children }: AccountShellProps) {
  const [couponsModalOpen, setCouponsModalOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active tab into view horizontally on mobile
  useEffect(() => {
    if (!tabsContainerRef.current) return;
    const activeTab = tabsContainerRef.current.querySelector<HTMLElement>('[data-active="true"]');
    if (activeTab) {
      activeTab.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [pathname]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logoutAction({ redirect: false });
    toast.success("You've been signed out.");
    router.push("/");
    router.refresh();
  };

  type NavItem = {
    label: string;
    href: string;
    icon: typeof LayoutDashboard;
    exact?: boolean;
    matches?: (p: string) => boolean;
    onClick?: () => void;
  };

  const navItems: NavItem[] = [
    {
      label: "Overview",
      href: "/account",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: "Orders",
      href: "/account/orders",
      icon: ShoppingBag,
    },
    {
      label: "Coupons",
      href: "#coupons",
      icon: Ticket,
      onClick: () => setCouponsModalOpen(true),
    },
    {
      label: "Returns",
      href: "/account/returns",
      icon: RotateCcw,
    },
    {
      label: "Profile",
      href: "/account/profile",
      icon: User,
      matches: (p: string) =>
        p.startsWith("/account/profile") ||
        p.startsWith("/account/addresses") ||
        p.startsWith("/account/security"),
    },
  ];

  return (
    <div className="bg-background relative min-h-screen">
      {/* ── Architectural Dot Matrix Background (VibeLock Technical Grid) ── */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-70"
        style={{
          backgroundImage: "radial-gradient(rgba(16, 17, 20, 0.13) 1.2px, transparent 1.2px)",
          backgroundSize: "30px 30px",
        }}
        aria-hidden="true"
      />

      {/* ── Main Canvas (Centered single column for all viewports) ── */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-20 pb-16 sm:px-6 sm:pt-24 lg:px-8">
        {/* Universal Identity Row */}
        <div className="flex items-center justify-between gap-4 pb-8">
          <div>
            <span className="text-vl-cyan text-[11px] font-bold tracking-[0.2em] uppercase">
              My Account
            </span>
            <h1 className="text-vl-black mt-0.5 text-xl font-semibold tracking-tight uppercase sm:text-2xl md:text-3xl">
              {profile.name || "Customer"}
            </h1>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            disabled={loggingOut}
            title="Sign out of account"
            className="h-9 gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-600 shadow-none transition-colors hover:border-red-300 hover:bg-red-100 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut className="size-4 shrink-0 text-red-500" />
            <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
          </Button>
        </div>

        {/* Universal Horizontal Underline Tabs */}
        <nav
          aria-label="Account navigation tabs"
          className="mb-8 border-b border-[#101114]/10 bg-transparent"
        >
          <div
            ref={tabsContainerRef}
            className="-mb-px flex scrollbar-none items-center gap-4 overflow-x-auto [-ms-overflow-style:none] sm:gap-6 [&::-webkit-scrollbar]:hidden"
          >
            {navItems.map((item) => {
              const isActive = item.matches
                ? item.matches(pathname)
                : item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              if (item.onClick) {
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.onClick}
                    className="inline-flex min-h-10.5 shrink-0 cursor-pointer items-center gap-1.5 border-b-2 border-transparent pt-1 pb-3 text-xs font-medium tracking-wider text-neutral-500 uppercase transition-colors hover:border-neutral-300 hover:text-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
                  >
                    <Icon className="size-3.5 text-neutral-400" />
                    <span>{item.label}</span>
                  </button>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  data-active={isActive ? "true" : undefined}
                  className={`inline-flex min-h-10.5 shrink-0 items-center gap-1.5 border-b-2 pt-1 pb-3 text-xs tracking-wider uppercase transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none ${
                    isActive
                      ? "border-[#101114] font-semibold text-[#101114]"
                      : "border-transparent font-medium text-neutral-500 hover:border-neutral-300 hover:text-[#101114]"
                  }`}
                >
                  <Icon
                    className={`size-3.5 ${isActive ? "text-[#101114]" : "text-neutral-400"}`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Main Account Page Content */}
        <main className="w-full">{children}</main>
      </div>

      {/* Interactive Coupons Dialog */}
      <AccountCouponsModal
        isOpen={couponsModalOpen}
        onClose={() => setCouponsModalOpen(false)}
        coupons={coupons}
      />
    </div>
  );
}
