"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  ChevronDown,
  CircleUserRound,
  Heart,
  Box,
  Sparkles,
  Coins,
  LogOut,
  Loader2,
} from "lucide-react";
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
  const [imgError, setImgError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

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
        className="focus-visible:ring-vl-cyan hover:text-vl-white text-vl-white/75 hover:bg-vl-white/10 flex size-8 cursor-pointer items-center justify-center rounded-full p-0 transition-all focus:outline-none focus-visible:ring-2 sm:size-9 sm:w-auto sm:gap-0.5 sm:px-2"
      >
        <User className="size-4 sm:size-4.5" />
        <ChevronDown
          className={`size-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* ── Floating Account Card Popover (Matches Screenshot 1:1) ── */}
      {isOpen && (
        <div className="absolute top-full right-0 z-50 mt-3 w-72 rounded-2xl border border-neutral-100 bg-white p-5.5 shadow-[0_20px_50px_rgba(0,0,0,0.12)] before:absolute before:inset-x-0 before:-top-3 before:h-3 sm:w-76">
          {user ? (
            /* ── LOGGED IN STATE ── */
            <>
              {/* Profile Header */}
              <div className="flex items-center gap-3">
                {user.image && !imgError ? (
                  <div className="relative size-11 shrink-0 overflow-hidden rounded-full border border-neutral-200/80 bg-neutral-100 shadow-xs">
                    <Image
                      src={user.image}
                      alt={user.name || "Customer Avatar"}
                      fill
                      sizes="44px"
                      unoptimized={Boolean(user.image.startsWith("http"))}
                      onError={() => setImgError(true)}
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <CircleUserRound className="fill-vl-black size-11 shrink-0 stroke-2 text-white" />
                )}
                <div className="min-w-0 flex-1">
                  <span className="block text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                    HELLO,
                  </span>
                  <h3
                    className="text-vl-black truncate text-sm font-bold tracking-tight"
                    title={user.name || "Customer"}
                  >
                    {user.name || "Customer"}
                  </h3>
                </div>
              </div>

              {/* Action Buttons: MY ACCOUNT + Circular Sign Out */}
              <div className="mt-4 flex items-center gap-2">
                <Link
                  href="/account"
                  onClick={() => setIsOpen(false)}
                  className="bg-vl-black flex h-9 flex-1 items-center justify-center rounded-full text-xs font-semibold tracking-widest text-white uppercase transition-colors hover:bg-neutral-800"
                >
                  MY ACCOUNT
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  title="Sign Out"
                  aria-label="Sign Out"
                  className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  {isLoggingOut ? (
                    <Loader2 className="size-4 animate-spin text-neutral-400" />
                  ) : (
                    <LogOut className="size-4 stroke-[1.8]" />
                  )}
                </button>
              </div>
            </>
          ) : (
            /* ── GUEST / SIGN IN STATE ── */
            <div className="text-center">
              <p className="text-xs font-normal text-neutral-500">Hello, sign in</p>
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="bg-vl-black mt-3.5 flex h-11 w-full items-center justify-center rounded-full text-xs font-semibold tracking-widest text-white uppercase transition-colors hover:bg-neutral-800"
              >
                SIGN IN
              </Link>
              <p className="mt-3 text-xs text-neutral-400">
                New customer?{" "}
                <Link
                  href="/register"
                  onClick={() => setIsOpen(false)}
                  className="font-semibold text-[#00D9FF] hover:underline"
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
              <h4 className="font-mono text-[10px] font-semibold tracking-wider text-neutral-800 uppercase">
                YOUR LISTS
              </h4>
              <div className="mt-2.5 flex flex-col gap-2.5">
                <Link
                  href="/wishlist"
                  onClick={() => setIsOpen(false)}
                  className="group hover:text-vlbg-vl-black flex items-center gap-2 text-xs font-medium text-neutral-500 transition-colors"
                >
                  <Heart className="group-hover:text-vlbg-vl-black size-4 stroke-[1.6] text-neutral-400 transition-colors" />
                  <span>Wishlist</span>
                </Link>
              </div>
            </div>

            {/* Column 2: YOUR ACCOUNT */}
            <div>
              <h4 className="font-mono text-[10px] font-semibold tracking-wider text-neutral-800 uppercase">
                YOUR ACCOUNT
              </h4>
              <div className="mt-2.5 flex flex-col gap-2.5">
                <Link
                  href="/account/orders"
                  onClick={() => setIsOpen(false)}
                  className="group hover:text-vlbg-vl-black flex items-center gap-2 text-xs font-medium text-neutral-500 transition-colors"
                >
                  <Box className="group-hover:text-vlbg-vl-black size-4 stroke-[1.6] text-neutral-400 transition-colors" />
                  <span>Orders</span>
                </Link>
                <Link
                  href="/account/coupons"
                  onClick={() => setIsOpen(false)}
                  className="group hover:text-vlbg-vl-black flex items-center gap-2 text-xs font-medium text-neutral-500 transition-colors"
                >
                  <Sparkles className="group-hover:text-vlbg-vl-black size-4 stroke-[1.6] text-neutral-400 transition-colors" />
                  <span>Offers</span>
                </Link>
                <Link
                  href="/account"
                  onClick={() => setIsOpen(false)}
                  className="group hover:text-vlbg-vl-black flex items-center gap-2 text-xs font-medium text-neutral-500 transition-colors"
                >
                  <Coins className="group-hover:text-vlbg-vl-black size-4 stroke-[1.6] text-neutral-400 transition-colors" />
                  <span>Points</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
