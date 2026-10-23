"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  User,
  MapPin,
  Heart,
  Ticket,
  RotateCcw,
  Settings,
  LogOut,
  Check,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { subscribeNewsletterAction } from "@/app/actions/newsletter";
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

  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logoutAction();
    toast.success("You've been signed out.");
    router.push("/");
    router.refresh();
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSubscribing(true);
    try {
      const res = await subscribeNewsletterAction({
        email: newsletterEmail,
        source: "ACCOUNT_SIDEBAR",
      });
      if (res.success) {
        toast.success(res.message || "You're on the list! Welcome to the VibeLock crew.");
        setNewsletterEmail("");
      } else {
        toast.error(res.error || "Failed to subscribe. Please try again.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubscribing(false);
    }
  };

  const navItems = [
    {
      label: "Dashboard",
      href: "/account",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: "My Orders",
      href: "/account/orders",
      icon: ShoppingBag,
    },
    {
      label: "My Profile",
      href: "/account/profile",
      icon: User,
    },
    {
      label: "Addresses",
      href: "/account/addresses",
      icon: MapPin,
    },
    {
      label: "Wishlist",
      href: "/wishlist",
      icon: Heart,
    },
    {
      label: "Coupons",
      href: "#coupons",
      icon: Ticket,
      onClick: onOpenCoupons,
    },
    {
      label: "Returns & Refunds",
      href: "/account/returns",
      icon: RotateCcw,
    },
    {
      label: "Settings",
      href: "/account/security",
      icon: Settings,
    },
  ];

  return (
    <aside className="w-full flex-col">
      <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
        {/* Customer Avatar & Info */}
        <div className="flex flex-col items-center border-b border-[#101114]/10 pb-6 text-center">
          <div className="relative mb-3 h-18 w-18 overflow-hidden rounded-full border-2 border-[#101114]/10 bg-[#F3F0E8] shadow-inner">
            <Image
              src={avatarSrc}
              alt={profile.name || "Customer Avatar"}
              fill
              sizes="72px"
              unoptimized={Boolean(avatarSrc.startsWith("http"))}
              onError={() => setImgError(true)}
              className="object-cover"
            />
          </div>

          <h2 className="font-heading text-base font-black leading-snug tracking-tight text-vl-black">
            {profile.name || "VibeLock Customer"}
          </h2>

          <p
            className="text-muted-foreground mt-0.5 max-w-full truncate px-2 text-xs"
            title={profile.email}
          >
            {profile.email}
          </p>

          <div className="mt-2.5">
            {profile.emailVerified ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                <Check className="size-3" strokeWidth={3} />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
                <ShieldAlert className="size-3" />
                Unverified
              </span>
            )}
          </div>
        </div>

        {/* Navigation List */}
        <nav aria-label="Customer Account Navigation" className="mt-4 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

            if (item.onClick) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    item.onClick?.();
                    onNavClick?.();
                  }}
                  className="flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-[#101114]/80 transition-colors hover:bg-[#F3F0E8] hover:text-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
                >
                  <item.icon className="text-muted-foreground size-4.5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onNavClick}
                className={`relative flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none ${
                  isActive
                    ? "bg-[#00D9FF]/12 font-bold text-[#101114] before:absolute before:top-2 before:bottom-2 before:left-0 before:w-1 before:rounded-r before:bg-[#00D9FF]"
                    : "text-[#101114]/80 hover:bg-[#F3F0E8] hover:text-[#101114]"
                }`}
              >
                <item.icon
                  className={`size-4.5 shrink-0 transition-colors ${
                    isActive ? "text-[#0099b8]" : "text-muted-foreground"
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Divider */}
          <div className="my-2 border-t border-[#101114]/10" />

          {/* Logout Action */}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-muted-foreground flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none disabled:opacity-50"
          >
            <LogOut className="text-muted-foreground size-4.5 shrink-0 transition-colors" />
            <span>{loggingOut ? "Signing out..." : "Logout"}</span>
          </button>
        </nav>

        {/* Small Dark Promotional Newsletter Card */}
        <div className="relative mt-6 overflow-hidden rounded-xl bg-[#101114] p-4 text-white shadow-md">
          <div
            className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full bg-[#00D9FF]/20 blur-xl"
            aria-hidden="true"
          />
          <p className="text-[10px] font-bold tracking-widest text-[#00D9FF] uppercase">
            Stay In Style
          </p>
          <h4 className="mt-1 text-xs font-black tracking-tight text-white uppercase">
            Get Exclusive Offers
          </h4>
          <p className="mt-1 text-[11px] leading-relaxed text-white/70">
            Be the first to know about new drops, special discounts and more.
          </p>

          <form onSubmit={handleNewsletterSubmit} className="mt-3 flex items-center gap-1.5">
            <input
              type="email"
              name="newsletter-email"
              autoComplete="email"
              suppressHydrationWarning
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full min-w-0 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-[#00D9FF] focus:ring-1 focus:ring-[#00D9FF] focus:outline-none"
            />
            <button
              type="submit"
              disabled={subscribing}
              aria-label="Subscribe to exclusive offers"
              className="shrink-0 rounded-lg bg-[#00D9FF] p-2 text-[#101114] transition-colors hover:bg-[#00c4e6] active:scale-95 disabled:opacity-50"
            >
              <ArrowRight className="size-3.5" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
