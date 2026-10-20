"use client";

import { useState } from "react";
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

export function AccountShell({ profile, coupons, children }: AccountShellProps) {
  const [couponsModalOpen, setCouponsModalOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-[#F3F0E8]">
      {/* Universal Account Hero Banner */}
      <AccountHero name={profile.name} />

      {/* 2-Column Responsive Dashboard Shell */}
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 flex-1">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr] xl:gap-8 items-start">
          
          {/* Persistent Left Sidebar */}
          <div className="w-full md:sticky md:top-24">
            <AccountSidebar
              profile={profile}
              onOpenCoupons={() => setCouponsModalOpen(true)}
            />
          </div>

          {/* Right Content Area (Dashboard or Subpage) */}
          <main className="min-w-0 flex-1">
            {children}
          </main>

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
