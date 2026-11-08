"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { User, ChevronDown, CircleUserRound, Heart, Box, Sparkles, LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { toast } from "sonner";

interface AccountPopoverProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  } | null;
}

export function AccountPopover({ user }: AccountPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const hasValidImage = Boolean(user?.image && failedImage !== user.image);

  // Mouse hover handlers with smooth intent delay
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logoutAction({ redirect: false });
    toast.success("Successfully signed out");
    setIsOpen(false);
    router.push("/");
    router.refresh();
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── Trigger Button: Cyan User Icon with Subtle Chevron ── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Account options"
        className="hover:text-vl-cyan text-vl-white/75 inline-flex size-8 cursor-pointer items-center justify-center gap-0.5 rounded-full p-0 transition-opacity hover:bg-white/10 hover:opacity-85 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] sm:size-9 sm:w-auto sm:px-2"
      >
        <User className="size-4 stroke-[2.2] sm:size-4.5" />
        <ChevronDown
          className={`size-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* ── Floating Account Card Popover (Matches Screenshot 1:1) ── */}
      {isOpen && (
        <div className="absolute top-full right-0 z-50 mt-3 w-72 rounded-2xl border border-neutral-100/90 bg-white p-5 shadow-[0_20px_45px_-10px_rgba(0,0,0,0.12),0_10px_20px_-5px_rgba(0,0,0,0.04)] before:absolute before:inset-x-0 before:-top-3 before:h-3 sm:w-[290px]">
          {user ? (
            /* ── LOGGED IN STATE ── */
            <>
              {/* Profile Header */}
              <div className="flex items-center gap-3">
                {hasValidImage && user?.image ? (
                  <div className="relative size-11 shrink-0 overflow-hidden rounded-full shadow-2xs ring-2 ring-neutral-100/90">
                    <Image
                      src={user.image}
                      alt={user.name || "Customer Avatar"}
                      fill
                      sizes="44px"
                      unoptimized={Boolean(user.image.startsWith("http"))}
                      onError={() => setFailedImage(user.image ?? null)}
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#101114] text-white shadow-2xs">
                    <CircleUserRound className="size-7 stroke-[1.8] text-white" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-2xs block leading-none font-bold tracking-[0.14em] text-neutral-400 uppercase">
                    HELLO,
                  </span>
                  <h3
                    className="mt-1 truncate text-sm leading-snug font-bold tracking-tight text-[#101114]"
                    title={user.name || "Customer"}
                  >
                    {user.name || "Customer"}
                  </h3>
                </div>
              </div>

              {/* Action Buttons: MY ACCOUNT + Circular Sign Out */}
              <div className="mt-4 flex items-center gap-2">
                <Button asChild variant="primary" size="default" className="flex-1 rounded-full">
                  <Link href="/account" onClick={() => setIsOpen(false)}>
                    MY ACCOUNT
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  loading={isLoggingOut}
                  title="Sign Out"
                  aria-label="Sign Out"
                  className="size-9 shrink-0 rounded-full border-neutral-200/80 bg-white text-neutral-500 shadow-2xs hover:border-red-200 hover:bg-red-50/50 hover:text-red-600"
                >
                  <LogOut className="size-4 stroke-[1.8]" />
                </Button>
              </div>
            </>
          ) : (
            /* ── GUEST / SIGN IN STATE ── */
            <div className="pt-1 text-center">
              <p className="text-xs font-semibold text-neutral-500">Hello, sign in</p>
              <Button
                asChild
                variant="primary"
                size="default"
                fullWidth
                className="text-compact mt-3.5 rounded-full font-bold tracking-[0.12em] uppercase shadow-2xs"
              >
                <Link href="/login" onClick={() => setIsOpen(false)}>
                  SIGN IN
                </Link>
              </Button>
              <p className="mt-3 text-xs text-neutral-400">
                New customer?{" "}
                <Link
                  href="/register"
                  onClick={() => setIsOpen(false)}
                  className="font-bold text-[#00D9FF] hover:underline"
                >
                  Start here
                </Link>
              </p>
            </div>
          )}

          {/* Subtle Horizontal Divider */}
          <div className="my-4 border-t border-neutral-100" />

          {/* ── 2 Columns: YOUR LISTS & YOUR ACCOUNT ── */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            {/* Column 1: YOUR LISTS */}
            <div>
              <h4 className="text-compact font-bold tracking-[0.14em] text-neutral-900 uppercase">
                YOUR LISTS
              </h4>
              <div className="mt-3 flex flex-col gap-2.5">
                <Link
                  href="/wishlist"
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center gap-2.5 py-0.5 text-xs font-medium text-neutral-600 transition-colors hover:text-[#101114]"
                >
                  <Heart className="size-4 shrink-0 stroke-[1.6] text-neutral-400 transition-colors group-hover:text-[#101114]" />
                  <span>Wishlist</span>
                </Link>
              </div>
            </div>

            {/* Column 2: YOUR ACCOUNT */}
            <div>
              <h4 className="text-compact font-bold tracking-[0.14em] text-neutral-900 uppercase">
                YOUR ACCOUNT
              </h4>
              <div className="mt-3 flex flex-col gap-2.5">
                <Link
                  href="/account/orders"
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center gap-2.5 py-0.5 text-xs font-medium text-neutral-600 transition-colors hover:text-[#101114]"
                >
                  <Box className="size-4 shrink-0 stroke-[1.6] text-neutral-400 transition-colors group-hover:text-[#101114]" />
                  <span>Orders</span>
                </Link>
                <Link
                  href="/account/coupons"
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center gap-2.5 py-0.5 text-xs font-medium text-neutral-600 transition-colors hover:text-[#101114]"
                >
                  <Sparkles className="size-4 shrink-0 stroke-[1.6] text-neutral-400 transition-colors group-hover:text-[#101114]" />
                  <span>Offers</span>
                </Link>
                <Link
                  href="/account/profile"
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center gap-2.5 py-0.5 text-xs font-medium text-neutral-600 transition-colors hover:text-[#101114]"
                >
                  <User className="size-4 shrink-0 stroke-[1.6] text-neutral-400 transition-colors group-hover:text-[#101114]" />
                  <span>Profile</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
