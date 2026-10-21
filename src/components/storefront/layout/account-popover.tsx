"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  ChevronDown,
  Heart,
  Package,
  Tag,
  MapPin,
  LogOut,
  ArrowRight,
  LayoutDashboard,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { toast } from "sonner";

interface AccountPopoverProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
  } | null;
}

export function AccountPopover({ user }: AccountPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logoutAction();
    toast.success("Successfully signed out");
    setIsOpen(false);
    router.push("/");
    router.refresh();
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button with User Icon and Subtle Chevron */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Account options"
        className="flex h-9 items-center gap-1 rounded-full px-2 text-[#101114]/80 transition-colors hover:bg-black/5 hover:text-[#101114] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
      >
        <div className="flex size-7 items-center justify-center rounded-full bg-black/5">
          <User className="size-4" />
        </div>
        <ChevronDown
          className={`size-3 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[#00D9FF]" : "text-[#101114]/50"
          }`}
        />
      </button>

      {/* Floating Card Popover */}
      {isOpen && (
        <div className="absolute top-full right-0 z-50 mt-2.5 w-76 rounded-2xl border border-black/10 bg-white p-5 shadow-[0_15px_40px_rgba(0,0,0,0.12)]">
          {/* ── Top Header & Main CTA ── */}
          <div className="text-center">
            <p className="text-xs font-medium text-[#101114]/70">
              {user ? `Hello, ${user.name || "Customer"}` : "Hello, sign in"}
            </p>

            {user ? (
              <Link
                href="/account"
                onClick={() => setIsOpen(false)}
                className="mt-2.5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-full bg-[#101114] text-xs font-bold tracking-wider text-white uppercase transition-all hover:bg-[#1E262C]"
              >
                <LayoutDashboard className="size-3.5" />
                <span>Go to Dashboard</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="mt-2.5 inline-flex h-9.5 w-full items-center justify-center rounded-full bg-[#101114] text-xs font-extrabold tracking-wider text-white uppercase transition-all hover:bg-[#1E262C]"
                >
                  SIGN IN
                </Link>

                <p className="mt-2 text-[11px] text-[#101114]/60">
                  New customer?{" "}
                  <Link
                    href="/register"
                    onClick={() => setIsOpen(false)}
                    className="font-bold text-[#0088A8] hover:underline"
                  >
                    Start here
                  </Link>
                </p>
              </>
            )}
          </div>

          <div className="my-4 border-t border-black/8" />

          {/* ── 2-Column Split: YOUR LISTS & YOUR ACCOUNT ── */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            {/* Column 1: YOUR LISTS */}
            <div>
              <p className="font-mono text-[10px] font-extrabold tracking-wider text-[#101114]/40 uppercase">
                YOUR LISTS
              </p>
              <div className="mt-2.5 flex flex-col gap-2">
                <Link
                  href="/wishlist"
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center gap-2 text-xs font-medium text-[#101114]/75 transition-colors hover:text-[#0088A8]"
                >
                  <Heart className="size-3.5 text-[#101114]/50 group-hover:text-[#0088A8]" />
                  <span>Wishlist</span>
                </Link>
              </div>
            </div>

            {/* Column 2: YOUR ACCOUNT */}
            <div>
              <p className="font-mono text-[10px] font-extrabold tracking-wider text-[#101114]/40 uppercase">
                YOUR ACCOUNT
              </p>
              <div className="mt-2.5 flex flex-col gap-2">
                <Link
                  href="/account/orders"
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center gap-2 text-xs font-medium text-[#101114]/75 transition-colors hover:text-[#0088A8]"
                >
                  <Package className="size-3.5 text-[#101114]/50 group-hover:text-[#0088A8]" />
                  <span>Orders</span>
                </Link>
                <Link
                  href="/account"
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center gap-2 text-xs font-medium text-[#101114]/75 transition-colors hover:text-[#0088A8]"
                >
                  <Tag className="size-3.5 text-[#101114]/50 group-hover:text-[#0088A8]" />
                  <span>Offers</span>
                </Link>
                <Link
                  href="/account"
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center gap-2 text-xs font-medium text-[#101114]/75 transition-colors hover:text-[#0088A8]"
                >
                  <MapPin className="size-3.5 text-[#101114]/50 group-hover:text-[#0088A8]" />
                  <span>Addresses</span>
                </Link>
              </div>
            </div>
          </div>

          {/* If Authenticated: Sign Out Action at bottom */}
          {user && (
            <div className="mt-4 border-t border-black/8 pt-3">
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={handleLogout}
                className="flex w-full items-center justify-between text-xs font-semibold text-red-600 transition-colors hover:text-red-700"
              >
                <span className="flex items-center gap-1.5">
                  <LogOut className="size-3.5" />
                  <span>Sign Out</span>
                </span>
                <ArrowRight className="size-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
