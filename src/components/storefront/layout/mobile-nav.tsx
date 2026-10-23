"use client";

import { logoutAction } from "@/app/actions/auth";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

interface MobileNavProps {
  isAuthenticated: boolean;
}

export function MobileNav({ isAuthenticated }: MobileNavProps) {
  const [open, setOpen] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const closeNav = () => setOpen(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logoutAction();
    toast.success("You've been signed out.");
    closeNav();
    router.push("/");
    router.refresh();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open navigation menu"
        className="inline-flex size-9 items-center justify-center rounded-full text-[#101114]/80 transition-colors hover:bg-black/5 hover:text-[#101114] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none xl:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[min(88vw,22rem)] overflow-y-auto border-white/10 bg-[#0C0D0E] p-6"
      >
        <SheetHeader className="border-b border-white/10 px-0 pt-1 pb-5">
          <SheetTitle className="text-left">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-[#101114]">
                <Image
                  src="/images/vibelock-logo.png"
                  alt="VibeLock"
                  width={20}
                  height={20}
                  className="h-auto w-auto object-contain"
                />
              </div>
              <span className="font-heading text-sm font-black tracking-wider text-white uppercase">
                VIBELOCK
              </span>
            </div>
          </SheetTitle>
        </SheetHeader>

        <nav aria-label="Mobile navigation" className="mt-5 flex flex-col">
          <Link
            href="/"
            onClick={closeNav}
            className={`border-b border-white/10 py-3 text-xs font-semibold tracking-wider uppercase transition-colors ${
              pathname === "/" ? "text-[#00D9FF]" : "text-[#F3F0E8]/80 hover:text-white"
            }`}
          >
            Home
          </Link>
          <Link
            href="/products"
            onClick={closeNav}
            className={`border-b border-white/10 py-3 text-xs font-semibold tracking-wider uppercase transition-colors ${
              pathname.startsWith("/products")
                ? "text-[#00D9FF]"
                : "text-[#F3F0E8]/80 hover:text-white"
            }`}
          >
            Shop All
          </Link>
          <div className="border-b border-white/10 py-3">
            <span className="text-[11px] font-semibold tracking-widest text-[#F3F0E8]/40 uppercase">
              Categories
            </span>
            <div className="mt-2.5 flex flex-col gap-2 pl-2">
              <Link
                href="/category/t-shirts"
                onClick={closeNav}
                className={`text-xs font-medium transition-colors ${
                  pathname === "/category/t-shirts"
                    ? "text-[#00D9FF]"
                    : "text-[#F3F0E8]/80 hover:text-[#00D9FF]"
                }`}
              >
                T-Shirts
              </Link>
              <Link
                href="/category/shirts"
                onClick={closeNav}
                className={`text-xs font-medium transition-colors ${
                  pathname === "/category/shirts"
                    ? "text-[#00D9FF]"
                    : "text-[#F3F0E8]/80 hover:text-[#00D9FF]"
                }`}
              >
                Shirts
              </Link>
              <Link
                href="/category/pants"
                onClick={closeNav}
                className={`text-xs font-medium transition-colors ${
                  pathname === "/category/pants"
                    ? "text-[#00D9FF]"
                    : "text-[#F3F0E8]/80 hover:text-[#00D9FF]"
                }`}
              >
                Pants
              </Link>
              <Link
                href="/category/shorts"
                onClick={closeNav}
                className={`text-xs font-medium transition-colors ${
                  pathname === "/category/shorts"
                    ? "text-[#00D9FF]"
                    : "text-[#F3F0E8]/80 hover:text-[#00D9FF]"
                }`}
              >
                Shorts
              </Link>
            </div>
          </div>
          <Link
            href="/about"
            onClick={closeNav}
            className={`border-b border-white/10 py-3 text-xs font-semibold tracking-wider uppercase transition-colors ${
              pathname === "/about" ? "text-[#00D9FF]" : "text-[#F3F0E8]/80 hover:text-white"
            }`}
          >
            About
          </Link>
          <Link
            href="/contact"
            onClick={closeNav}
            className={`border-b border-white/10 py-3 text-xs font-semibold tracking-wider uppercase transition-colors ${
              pathname === "/contact" ? "text-[#00D9FF]" : "text-[#F3F0E8]/80 hover:text-white"
            }`}
          >
            Contact
          </Link>
          <Link
            href="/wishlist"
            onClick={closeNav}
            className={`border-b border-white/10 py-3 text-xs font-semibold tracking-wider uppercase transition-colors ${
              pathname === "/wishlist" ? "text-[#00D9FF]" : "text-[#F3F0E8]/80 hover:text-white"
            }`}
          >
            Wishlist
          </Link>
        </nav>

        <div className="mt-6 grid gap-2.5 border-t border-white/10 pt-5">
          <Link
            href={isAuthenticated ? "/account" : "/login"}
            onClick={closeNav}
            className="inline-flex min-h-10 items-center justify-center border border-white/15 px-4 text-xs font-semibold tracking-wider text-[#F3F0E8] uppercase transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
          >
            {isAuthenticated ? "My Account" : "Sign In"}
          </Link>
          {!isAuthenticated && (
            <Link
              href="/register"
              onClick={closeNav}
              className="inline-flex min-h-10 items-center justify-center bg-[#00D9FF] px-4 text-xs font-semibold tracking-wider text-[#101114] uppercase transition-colors hover:bg-[#00D9FF]/90"
            >
              Create Account
            </Link>
          )}
          {isAuthenticated && (
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex min-h-10 w-full items-center justify-center border border-white/10 px-4 text-xs font-medium text-[#F3F0E8]/60 hover:text-white disabled:opacity-50"
            >
              {loggingOut ? "Signing out..." : "Sign Out"}
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
