import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getCart } from "@/lib/cart/queries";
import { getCategories } from "@/lib/catalog/queries";
import Image from "next/image";
import Link from "next/link";
import { CartDrawer } from "../cart/cart-drawer";
import { AccountPopover } from "./account-popover";
import { CategoriesDrawer } from "./categories-drawer";
import { DesktopNav } from "./desktop-nav";
import { HeaderSearch } from "./header-search";
import { HeaderShell } from "./header-shell";
import { HeaderWishlist } from "./header-wishlist";

export async function Header({
  announcement,
}: {
  announcement?: React.ReactNode;
} = {}) {
  const [user, cart, categories] = await Promise.all([
    getCurrentUser(),
    getCart(),
    getCategories(),
  ]);

  return (
    <HeaderShell announcement={announcement}>
      <div className="border-vl-white/10 bg-vl-dark/75 shadow-floating-nav pointer-events-auto relative mx-auto flex h-13 w-full max-w-6xl items-center justify-between rounded-full border px-3.5 backdrop-blur-lg sm:px-5">
        <div className="flex shrink-0 items-center gap-2 sm:gap-3.5">
          <Link
            href="/"
            className="flex items-center gap-0 transition-opacity hover:opacity-90 focus-visible:outline-none"
            aria-label="VibeLock Home"
          >
            {/* Circular Black Badge with White Logo Emblem */}
            <div className="border-vl-cyan bg-vl-black relative flex size-8.5 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 shadow-sm">
              <Image
                src="/logo/icon/vibelock_icon_dark.svg"
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

        {/* ── Right: Search Pill + Wishlist + Cart + Account Popover + Mobile Menu ── */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          {/* Search Trigger (Desktop pill + Mobile icon) & Instant Search Modal */}
          <HeaderSearch categories={categories} />

          {/* Wishlist Link with Live Count Badge */}
          <HeaderWishlist />

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
