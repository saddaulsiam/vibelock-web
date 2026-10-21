import Link from "next/link";
import Image from "next/image";
import { Heart, Search, ShoppingBag, User } from "lucide-react";
import { Container } from "@/components/shared/container";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getCart } from "@/lib/cart/queries";
import { MobileNav } from "./mobile-nav";
import { DesktopNav } from "./desktop-nav";
import { MobileSearch } from "./mobile-search";

export async function Header() {
  const user = await getCurrentUser();
  const cart = await getCart();
  const itemCount = cart?.totalQuantity ?? 0;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#0C0D0E]">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4 py-2 sm:h-[72px] lg:gap-8">
          {/* Left: Mobile Nav + Logo */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <MobileNav isAuthenticated={Boolean(user)} />
            <Link
              href="/"
              className="flex items-center transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
              aria-label="VibeLock Home"
            >
              <Image
                src="/images/vibelock-logo.png"
                alt="VibeLock"
                width={124}
                height={36}
                priority
                className="h-7 w-auto object-contain sm:h-8"
              />
            </Link>
          </div>

          {/* Center: Desktop Navigation */}
          <DesktopNav />

          {/* Right: Search + Icons */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            {/* Pill Search Input */}
            <form
              action="/products"
              method="get"
              role="search"
              aria-label="Search products"
              className="relative hidden items-center lg:flex"
            >
              <Search
                className="pointer-events-none absolute left-3.5 size-4 text-[#F3F0E8]/40"
                aria-hidden="true"
              />
              <Input
                type="search"
                name="q"
                placeholder="Search for products..."
                aria-label="Search for products"
                className="h-9 w-48 rounded-full border border-white/10 bg-[#1A1D21] pr-4 pl-9 text-xs text-[#F3F0E8] placeholder:text-[#F3F0E8]/40 focus-visible:border-[#00D9FF] focus-visible:ring-1 focus-visible:ring-[#00D9FF] xl:w-56"
              />
            </form>

            {/* Mobile Search Component */}
            <MobileSearch />

            {/* Account Icon */}
            <Link
              href={user ? "/account" : "/login"}
              aria-label={user ? "Account" : "Sign in"}
              className="inline-flex size-9 items-center justify-center text-[#F3F0E8]/80 transition-colors hover:text-white"
            >
              <User className="size-5" aria-hidden="true" />
            </Link>

            {/* Wishlist Icon */}
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className="inline-flex size-9 items-center justify-center text-[#F3F0E8]/80 transition-colors hover:text-white"
            >
              <Heart className="size-5" aria-hidden="true" />
            </Link>

            {/* Shopping Cart Icon */}
            <Link
              href="/cart"
              aria-label={itemCount > 0 ? `Shopping bag, ${itemCount} items` : "Shopping bag"}
              className="relative inline-flex size-9 items-center justify-center text-[#F3F0E8]/80 transition-colors hover:text-white"
            >
              <ShoppingBag className="size-5" aria-hidden="true" />
              <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-[#00D9FF] text-[10px] font-bold text-[#101114]">
                {itemCount}
              </span>
            </Link>
          </div>
        </div>
      </Container>
    </header>
  );
}
