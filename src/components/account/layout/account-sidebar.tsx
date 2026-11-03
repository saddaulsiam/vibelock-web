"use client";

import { logoutAction } from "@/app/actions/auth";
import {
  Check,
  Heart,
  LayoutDashboard,
  LogOut,
  RotateCcw,
  ShieldAlert,
  ShoppingBag,
  Ticket,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface AccountSidebarProps {
  profile: {
    name: string | null;
    email: string;
    emailVerified: Date | null;
    image: string | null;
  };
  onOpenCoupons?: () => void;
  onNavClick?: () => void;
}

export function AccountSidebar({ profile, onOpenCoupons, onNavClick }: AccountSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const FALLBACK = "/images/hero/hero-slide-1.png";
  const [imgError, setImgError] = useState(false);
  const avatarSrc = !imgError && profile.image ? profile.image : FALLBACK;

  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logoutAction({ redirect: false });
    toast.success("You've been signed out.");
    router.push("/");
    router.refresh();
  };

  const navItems = [
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
      onClick: onOpenCoupons,
    },
    {
      label: "Wishlist",
      href: "/wishlist",
      icon: Heart,
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
    <aside className="w-full">
      <div className="rounded-xl border border-[#101114]/10 bg-white p-5">
        {/* Customer Avatar & Profile Summary */}
        <div className="flex flex-col items-center border-b border-[#101114]/8 pb-5 text-center">
          <div className="relative mb-3 h-16 w-16 overflow-hidden rounded-full border border-[#101114]/10 bg-[#F3F0E8]">
            <Image
              src={avatarSrc}
              alt={profile.name || "Customer Avatar"}
              fill
              sizes="64px"
              unoptimized={Boolean(avatarSrc.startsWith("http"))}
              onError={() => setImgError(true)}
              className="object-cover"
            />
          </div>

          <h2 className="text-sm font-black tracking-tight text-[#101114] uppercase">
            {profile.name || "VibeLock Customer"}
          </h2>

          <p
            className="mt-0.5 max-w-full truncate px-2 text-xs text-neutral-500"
            title={profile.email}
          >
            {profile.email}
          </p>

          <div className="mt-2">
            {profile.emailVerified ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                <Check className="size-3" strokeWidth={2.5} />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                <ShieldAlert className="size-3" />
                Unverified
              </span>
            )}
          </div>
        </div>

        {/* Navigation List */}
        <nav aria-label="Account Navigation" className="mt-3 flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive = item.matches
              ? item.matches(pathname)
              : item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);

            if (item.onClick) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    item.onClick?.();
                    onNavClick?.();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
                >
                  <item.icon className="size-4 shrink-0 text-neutral-400" />
                  <span>{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onNavClick}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none ${
                  isActive
                    ? "bg-[#101114] text-white"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-[#101114]"
                }`}
              >
                <item.icon
                  className={`size-4 shrink-0 ${isActive ? "text-white" : "text-neutral-400"}`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Understated Separator */}
          <div className="my-2 border-t border-[#101114]/8" />

          {/* Minimalist Logout Action */}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:outline-none disabled:opacity-50"
          >
            <LogOut className="size-4 shrink-0" />
            <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
          </button>
        </nav>
      </div>
    </aside>
  );
}
