"use client";

import { logoutAction } from "@/app/actions/auth";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

interface MobileNavProps {
  isAuthenticated: boolean;
}

export function MobileNav({ isAuthenticated }: MobileNavProps) {
  const [open, setOpen] = React.useState(false);
  const closeNav = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open navigation menu"
        className="inline-flex size-10 items-center justify-center text-[#F3F0E8]/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] xl:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(88vw,22rem)] overflow-y-auto border-white/10 bg-[#0C0D0E] p-6">
        <SheetHeader className="border-b border-white/10 px-0 pb-5 pt-1">
          <SheetTitle className="text-left">
            <Image
              src="/images/vibelock-logo-white.png"
              alt="VibeLock"
              width={110}
              height={32}
              className="h-7 w-auto object-contain"
            />
          </SheetTitle>
        </SheetHeader>

        <nav aria-label="Mobile navigation" className="mt-5 flex flex-col">
          <Link
            href="/"
            onClick={closeNav}
            className="border-b border-white/10 py-3 text-xs font-semibold uppercase tracking-wider text-[#00D9FF]"
          >
            Home
          </Link>
          <Link
            href="/products"
            onClick={closeNav}
            className="border-b border-white/10 py-3 text-xs font-semibold uppercase tracking-wider text-[#F3F0E8]/80 hover:text-white"
          >
            Shop All
          </Link>
          <div className="border-b border-white/10 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#F3F0E8]/40">
              Categories
            </span>
            <div className="mt-2.5 flex flex-col gap-2 pl-2">
              <Link
                href="/category/t-shirts"
                onClick={closeNav}
                className="text-xs font-medium text-[#F3F0E8]/80 hover:text-[#00D9FF]"
              >
                T-Shirts
              </Link>
              <Link
                href="/category/shirts"
                onClick={closeNav}
                className="text-xs font-medium text-[#F3F0E8]/80 hover:text-[#00D9FF]"
              >
                Shirts
              </Link>
              <Link
                href="/category/pants"
                onClick={closeNav}
                className="text-xs font-medium text-[#F3F0E8]/80 hover:text-[#00D9FF]"
              >
                Pants
              </Link>
              <Link
                href="/category/shorts"
                onClick={closeNav}
                className="text-xs font-medium text-[#F3F0E8]/80 hover:text-[#00D9FF]"
              >
                Shorts
              </Link>
            </div>
          </div>
          <Link
            href="/about"
            onClick={closeNav}
            className="border-b border-white/10 py-3 text-xs font-semibold uppercase tracking-wider text-[#F3F0E8]/80 hover:text-white"
          >
            About
          </Link>
          <Link
            href="/contact"
            onClick={closeNav}
            className="border-b border-white/10 py-3 text-xs font-semibold uppercase tracking-wider text-[#F3F0E8]/80 hover:text-white"
          >
            Contact
          </Link>
          <Link
            href="/wishlist"
            onClick={closeNav}
            className="border-b border-white/10 py-3 text-xs font-semibold uppercase tracking-wider text-[#F3F0E8]/80 hover:text-white"
          >
            Wishlist
          </Link>
        </nav>

        <div className="mt-6 grid gap-2.5 border-t border-white/10 pt-5">
          <Link
            href={isAuthenticated ? "/account" : "/login"}
            onClick={closeNav}
            className="inline-flex min-h-10 items-center justify-center border border-white/15 px-4 text-xs font-semibold uppercase tracking-wider text-[#F3F0E8] transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
          >
            {isAuthenticated ? "My Account" : "Sign In"}
          </Link>
          {!isAuthenticated && (
            <Link
              href="/register"
              onClick={closeNav}
              className="inline-flex min-h-10 items-center justify-center bg-[#00D9FF] px-4 text-xs font-semibold uppercase tracking-wider text-[#101114] transition-colors hover:bg-[#00D9FF]/90"
            >
              Create Account
            </Link>
          )}
          {isAuthenticated && (
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex min-h-10 w-full items-center justify-center border border-white/10 px-4 text-xs font-medium text-[#F3F0E8]/60 hover:text-white"
              >
                Sign Out
              </button>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
