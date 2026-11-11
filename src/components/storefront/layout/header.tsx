import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getCart } from "@/lib/cart/queries";
import { getCategories } from "@/lib/catalog/queries";
import { Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AccountPopover } from "./account-popover";
import { CategoriesDrawer } from "./categories-drawer";
import { DesktopNav } from "./desktop-nav";
import { HeaderSearch } from "./header-search";
import { CartSheet } from "@/components/storefront/cart/cart-sheet";

export async function Header() {
  const [user, cart, categories] = await Promise.all([
    getCurrentUser(),
    getCart(),
    getCategories(),
  ]);

  return (
    <header className="pointer-events-none fixed top-2 right-0 left-0 z-50 w-full px-2.5 sm:top-3 sm:px-6 lg:px-8">
      <div className="border-vl-white/10 bg-vl-black/60 pointer-events-auto mx-auto flex h-13 w-full max-w-6xl items-center justify-between rounded-full border px-4 shadow-floating-nav backdrop-blur-lg sm:px-6">
        <div className="flex shrink-0 items-center gap-2 sm:gap-3.5">
          <Link
            href="/"
            className="flex items-center gap-1.5 transition-opacity hover:opacity-90 focus-visible:outline-none"
            aria-label="VibeLock Home"
          >
            {/* Circular Black Badge with White Logo Emblem */}
            <div className="border-vl-cyan bg-vl-black flex size-8.5 items-center justify-center rounded-full border-2 shadow-sm">
              <Image
                src="/images/vibelock-logo.png"
                alt="VibeLock"
                width={22}
                height={22}
                priority
                className="h-auto w-auto object-contain"
              />
            </div>
            <span className="text-vl-white shrink-0 text-sm font-black tracking-wider whitespace-nowrap uppercase sm:text-base">
              VIBELOCK
            </span>
          </Link>
        </div>

        {/* ── Center: Desktop Navigation ── */}
        <DesktopNav categories={categories} isAuthenticated={Boolean(user)} />

        {/* ── Right: Search Pill + Wishlist + Cart + Account Popover ── */}
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          {/* Search Trigger (Desktop pill + Mobile icon) & Instant Search Modal */}
          <HeaderSearch categories={categories} />

          {/* Wishlist Link */}
          <Link
            href="/wishlist"
            aria-label="Wishlist"
            className="text-vl-white/75 hover:text-vl-cyan hover:bg-vl-white/10 inline-flex size-8 items-center justify-center rounded-full transition-colors sm:size-9"
          >
            <Heart className="size-4 sm:size-4.5" aria-hidden="true" />
          </Link>

          {/* Shopping Cart Drawer */}
          <CartSheet initialCart={cart} />

          {/* Account Popover Menu (Matching screenshot!) */}
          <AccountPopover user={user} />

          {/* Mobile Menu Button */}
          <CategoriesDrawer
            variant="mobile"
            isAuthenticated={Boolean(user)}
            categories={categories}
          />
        </div>
      </div>
    </header>
  );
}
