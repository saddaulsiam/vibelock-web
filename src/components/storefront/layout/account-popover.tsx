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
        className="focus-visible:ring-vl-cyan hover:text-vl-white text-vl-white/75 hover:bg-vl-white/10 flex h-9 cursor-pointer items-center gap-1 rounded-full px-2 transition-all focus:outline-none focus-visible:ring-2"
      >
        <div className="bg-vl-white/5 flex size-7 items-center justify-center rounded-full">
          <User className="size-4" />
        </div>
        <ChevronDown
          className={`size-3 transition-transform duration-200 ${
            isOpen ? "text-vl-cyan rotate-180" : "text-vl-white/50"
          }`}
        />
      </button>

      {/* Floating Card Popover */}
      {isOpen && (
        <div className="border-vl-white/10 absolute top-full right-0 z-50 mt-2.5 w-76 rounded-2xl border bg-white p-5 shadow-[0_15px_40px_rgba(0,0,0,0.12)]">
          {/* ── Top Header & Main CTA ── */}
          <div className="text-center">
            <p className="text-vl-black/70 text-xs font-medium">
              {user ? `Hello, ${user.name || "Customer"}` : "Hello, sign in"}
            </p>

            {user ? (
              <Link
                href="/account"
                onClick={() => setIsOpen(false)}
                className="bg-vl-black text-vl-white hover:bg-vl-black/80 mt-2.5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-full text-xs font-bold tracking-wider uppercase transition-all"
              >
                <LayoutDashboard className="size-3.5" />
                <span>Go to Dashboard</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="bg-vl-black text-vl-white hover:bg-vl-black/80 mt-2.5 inline-flex h-9.5 w-full items-center justify-center rounded-full text-xs font-extrabold tracking-wider uppercase transition-all"
                >
                  SIGN IN
                </Link>

                <p className="text-vl-black/60 mt-2 text-[11px]">
                  New customer?{" "}
                  <Link
                    href="/register"
                    onClick={() => setIsOpen(false)}
                    className="text-vl-cyan font-bold hover:underline"
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
              <p className="text-vl-black/40 font-mono text-[10px] font-extrabold tracking-wider uppercase">
                YOUR LISTS
              </p>
              <div className="mt-2.5 flex flex-col gap-2">
                <Link
                  href="/wishlist"
                  onClick={() => setIsOpen(false)}
                  className="text-vl-black/75 group hover:text-vl-cyan flex items-center gap-2 text-xs font-medium transition-colors"
                >
                  <Heart className="text-vl-black/50 group-hover:text-vl-cyan size-3.5" />
                  <span>Wishlist</span>
                </Link>
              </div>
            </div>

            {/* Column 2: YOUR ACCOUNT */}
            <div>
              <p className="text-vl-black/40 font-mono text-[10px] font-extrabold tracking-wider uppercase">
                YOUR ACCOUNT
              </p>
              <div className="mt-2.5 flex flex-col gap-2">
                <Link
                  href="/account/orders"
                  onClick={() => setIsOpen(false)}
                  className="text-vl-black/75 group hover:text-vl-cyan flex items-center gap-2 text-xs font-medium transition-colors"
                >
                  <Package className="text-vl-black/50 group-hover:text-vl-cyan size-3.5" />
                  <span>Orders</span>
                </Link>
                <Link
                  href="/account"
                  onClick={() => setIsOpen(false)}
                  className="text-vl-black/75 group hover:text-vl-cyan flex items-center gap-2 text-xs font-medium transition-colors"
                >
                  <Tag className="text-vl-black/50 group-hover:text-vl-cyan size-3.5" />
                  <span>Offers</span>
                </Link>
                <Link
                  href="/account"
                  onClick={() => setIsOpen(false)}
                  className="text-vl-black/75 group hover:text-vl-cyan flex items-center gap-2 text-xs font-medium transition-colors"
                >
                  <MapPin className="text-vl-black/50 group-hover:text-vl-cyan size-3.5" />
                  <span>Addresses</span>
                </Link>
              </div>
            </div>
          </div>

          {/* If Authenticated: Sign Out Action at bottom */}
          {user && (
            <div className="border-vl-black/10 mt-4 border-t pt-3">
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={handleLogout}
                className="group flex w-full items-center justify-between rounded-sm border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold tracking-wide text-red-500 transition-all duration-200 hover:border-red-500 hover:bg-red-500/90 hover:text-white focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  <LogOut className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:text-white" />
                  <span>{isLoggingOut ? "Signing Out..." : "Sign Out"}</span>
                </span>

                <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
