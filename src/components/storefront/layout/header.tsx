import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Heart, Search, ShoppingBag, User } from "lucide-react";
import { Container } from "@/components/shared/container";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getCart } from "@/lib/cart/queries";
import { MobileNav } from "./mobile-nav";

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
              className="flex items-center transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
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
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-6 text-xs font-semibold uppercase tracking-wider text-[#F3F0E8] xl:flex 2xl:gap-8"
          >
            <Link
              href="/"
              className="group relative flex flex-col items-center py-2 text-[#00D9FF]"
            >
              <span>HOME</span>
              <span className="absolute -bottom-1 h-0.5 w-5 rounded-full bg-[#00D9FF]" />
            </Link>

            {/* Shop with dropdown */}
            <div className="group relative py-2">
              <Link
                href="/products"
                className="flex items-center gap-1 text-[#F3F0E8]/80 transition-colors hover:text-white"
              >
                <span>SHOP</span>
                <ChevronDown className="size-3 text-[#F3F0E8]/60 transition-transform group-hover:rotate-180" />
              </Link>
              <div className="invisible absolute left-0 top-full z-50 min-w-44 border border-white/10 bg-[#101114] p-1.5 opacity-0 shadow-2xl transition-all duration-150 group-hover:visible group-hover:opacity-100">
                <Link
                  href="/products"
                  className="block px-3 py-2 text-xs font-medium text-[#F3F0E8]/80 transition-colors hover:bg-white/5 hover:text-white"
                >
                  All Products
                </Link>
                <Link
                  href="/products?sort=newest"
                  className="block px-3 py-2 text-xs font-medium text-[#F3F0E8]/80 transition-colors hover:bg-white/5 hover:text-white"
                >
                  New Arrivals
                </Link>
              </div>
            </div>

            {/* Categories with dropdown */}
            <div className="group relative py-2">
              <Link
                href="/category/t-shirts"
                className="flex items-center gap-1 text-[#F3F0E8]/80 transition-colors hover:text-white"
              >
                <span>CATEGORIES</span>
                <ChevronDown className="size-3 text-[#F3F0E8]/60 transition-transform group-hover:rotate-180" />
              </Link>
              <div className="invisible absolute left-0 top-full z-50 min-w-44 border border-white/10 bg-[#101114] p-1.5 opacity-0 shadow-2xl transition-all duration-150 group-hover:visible group-hover:opacity-100">
                <Link
                  href="/category/t-shirts"
                  className="block px-3 py-2 text-xs font-medium text-[#F3F0E8]/80 transition-colors hover:bg-white/5 hover:text-white"
                >
                  T-Shirts
                </Link>
                <Link
                  href="/category/shirts"
                  className="block px-3 py-2 text-xs font-medium text-[#F3F0E8]/80 transition-colors hover:bg-white/5 hover:text-white"
                >
                  Shirts
                </Link>
                <Link
                  href="/category/pants"
                  className="block px-3 py-2 text-xs font-medium text-[#F3F0E8]/80 transition-colors hover:bg-white/5 hover:text-white"
                >
                  Pants
                </Link>
                <Link
                  href="/category/shorts"
                  className="block px-3 py-2 text-xs font-medium text-[#F3F0E8]/80 transition-colors hover:bg-white/5 hover:text-white"
                >
                  Shorts
                </Link>
              </div>
            </div>

            <Link
              href="/about"
              className="py-2 text-[#F3F0E8]/80 transition-colors hover:text-white"
            >
              ABOUT
            </Link>

            <Link
              href="/contact"
              className="py-2 text-[#F3F0E8]/80 transition-colors hover:text-white"
            >
              CONTACT
            </Link>
          </nav>

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
                className="h-9 w-48 rounded-full border border-white/10 bg-[#1A1D21] pl-9 pr-4 text-xs text-[#F3F0E8] placeholder:text-[#F3F0E8]/40 focus-visible:border-[#00D9FF] focus-visible:ring-1 focus-visible:ring-[#00D9FF] xl:w-56"
              />
            </form>

            {/* Mobile Search Popover */}
            <details className="group relative lg:hidden">
              <summary
                aria-label="Open search"
                className="flex size-9 cursor-pointer list-none items-center justify-center text-[#F3F0E8]/80 hover:text-white [&::-webkit-details-marker]:hidden"
              >
                <Search className="size-5" />
              </summary>
              <div className="absolute right-0 top-full z-50 mt-2 w-72 border border-white/10 bg-[#101114] p-3 shadow-2xl">
                <form action="/products" method="get" className="relative flex items-center">
                  <Search className="pointer-events-none absolute left-3 size-4 text-[#F3F0E8]/40" />
                  <Input
                    type="search"
                    name="q"
                    placeholder="Search for products..."
                    className="h-10 rounded-full border-white/10 bg-[#1A1D21] pl-9 pr-3 text-xs text-[#F3F0E8] placeholder:text-[#F3F0E8]/40"
                  />
                </form>
              </div>
            </details>

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
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[#00D9FF] text-[10px] font-bold text-[#101114]">
                {itemCount}
              </span>
            </Link>
          </div>
        </div>
      </Container>
    </header>
  );
}
