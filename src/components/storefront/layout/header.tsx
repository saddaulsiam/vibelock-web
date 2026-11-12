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
import { HeaderShell } from "./header-shell";
import { CartDrawer } from "../cart/cart-drawer";

export async function Header() {
  const [user, cart, categories] = await Promise.all([
    getCurrentUser(),
    getCart(),
    getCategories(),
  ]);

  return (
    <HeaderShell>
      <div className="border-vl-white/10 bg-vl-black/60 shadow-floating-nav pointer-events-auto mx-auto flex h-13 w-full max-w-6xl items-center justify-between rounded-full border px-4 backdrop-blur-lg sm:px-6">
        <div className="flex shrink-0 items-center gap-2 sm:gap-3.5">
          <Link
            href="/"
            className="flex items-center gap-0 transition-opacity hover:opacity-90 focus-visible:outline-none"
            aria-label="VibeLock Home"
          >
            {/* Circular Black Badge with White Logo Emblem */}
            <div className="border-vl-cyan bg-vl-black relative flex size-8.5 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 shadow-sm">
              <Image
                src="/logo/icon/vl_icon_white_transparent.svg"
                alt="VibeLock"
                width={20}
                height={20}
                priority
                className="size-5 object-contain"
              />
            </div>
            {/* VibeLock Wordmark */}
            <Image
              src="/logo/workmark/vibelock_wordmark_white_transparent.svg"
              alt="VibeLock"
              width={160}
              height={64}
              priority
              className="-ml-1 h-11 w-auto shrink-0 object-contain sm:h-12"
            />
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
            className="hover:text-vl-cyan hover:bg-vl-white/10 text-vl-white/75 focus-visible:ring-vl-cyan inline-flex size-8 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none sm:size-9"
          >
            <Heart className="size-4 sm:size-4.5" aria-hidden="true" />
          </Link>

          {/* Shopping Cart Drawer */}
          <CartDrawer initialCart={cart} />

          {/* Account Popover Menu */}
          <AccountPopover user={user} />

          {/* Mobile Menu Button */}
          <CategoriesDrawer
            variant="mobile"
            isAuthenticated={Boolean(user)}
            categories={categories}
          />
        </div>
      </div>
    </HeaderShell>
  );
}
