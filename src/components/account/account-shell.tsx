"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AccountHero } from "./account-hero";
import { AccountSidebar } from "./account-sidebar";
import { AccountCouponsModal, CouponItem } from "./account-coupons-modal";

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

// Map pathnames to human-readable labels for the mobile top bar
function getPageLabel(pathname: string): string {
  if (pathname === "/account") return "Dashboard";
  if (pathname.startsWith("/account/orders")) return "My Orders";
  if (pathname.startsWith("/account/profile")) return "My Profile";
  if (pathname.startsWith("/account/addresses")) return "Addresses";
  if (pathname.startsWith("/account/returns")) return "Returns & Refunds";
  if (pathname.startsWith("/account/security")) return "Settings";
  if (pathname.startsWith("/wishlist")) return "Wishlist";
  return "My Account";
}

export function AccountShell({ profile, coupons, children }: AccountShellProps) {
  const [couponsModalOpen, setCouponsModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const pageLabel = getPageLabel(pathname);

  return (
    <div className="flex min-h-screen flex-col bg-[#F3F0E8]">
      {/* Universal Account Hero Banner */}
      <AccountHero name={profile.name} />

      {/* ── Mobile Sticky Top Bar (hidden on lg+) ── */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-[#101114]/10 bg-[#F3F0E8]/95 px-4 py-3 backdrop-blur-sm lg:hidden">
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] font-semibold tracking-widest text-[#101114]/40 uppercase">
            My Account
          </span>
          <span className="text-sm font-bold text-[#101114]">{pageLabel}</span>
        </div>
        <button
          id="account-menu-toggle"
          type="button"
          aria-label="Open account menu"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-[#101114]/10 bg-white px-3 py-2 text-sm font-semibold text-[#101114] shadow-xs transition-all active:scale-95"
        >
          <Menu className="size-4" />
          <span className="text-xs">Menu</span>
        </button>
      </div>

      {/* ── Mobile Drawer Overlay ── */}
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={() => setDrawerOpen(false)}
        className={`fixed inset-0 z-50 bg-[#101114]/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          drawerOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Drawer Panel */}
      <div
        id="account-mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Account navigation menu"
        className={`fixed inset-y-0 left-0 z-50 flex w-[300px] flex-col bg-[#F3F0E8] shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[#101114]/10 bg-white px-5 py-4">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-[#00D9FF] uppercase">
              VibeLock
            </p>
            <p className="text-sm font-black tracking-tight text-[#101114] uppercase">My Account</p>
          </div>
          <button
            type="button"
            aria-label="Close account menu"
            onClick={() => setDrawerOpen(false)}
            className="flex size-8 items-center justify-center rounded-xl border border-[#101114]/10 bg-[#F3F0E8] text-[#101114] transition-colors hover:bg-[#101114]/10 active:scale-95"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Drawer Sidebar Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <AccountSidebar
            profile={profile}
            onOpenCoupons={() => {
              setDrawerOpen(false);
              setCouponsModalOpen(true);
            }}
            onNavClick={() => setDrawerOpen(false)}
          />
        </div>
      </div>

      {/* ── 2-Column Responsive Dashboard Shell ── */}
      <div className="mx-auto w-full max-w-360 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr] xl:gap-8">
          {/* Persistent Left Sidebar — desktop only */}
          <div className="hidden lg:sticky lg:top-24 lg:block">
            <AccountSidebar profile={profile} onOpenCoupons={() => setCouponsModalOpen(true)} />
          </div>

          {/* Right Content Area */}
          <main className="min-w-0 flex-1">{children}</main>
        </div>
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
