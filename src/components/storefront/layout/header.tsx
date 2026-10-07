import Link from "next/link";
import { Search, ShoppingBag } from "lucide-react";
import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logoutAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getCart } from "@/lib/cart/queries";
import { MobileNav } from "./mobile-nav";
import { storefrontShopLinks } from "./navigation";

export async function Header() {
  const user = await getCurrentUser();
  const cart = await getCart();
  const itemCount = cart?.totalQuantity ?? 0;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 supports-[backdrop-filter]:backdrop-blur">
      <Container>
        <div className="flex min-h-16 items-center gap-3 py-2.5 xl:gap-8">
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <MobileNav isAuthenticated={Boolean(user)} />
            <Link
              href="/"
              className="rounded-sm text-xl font-extrabold tracking-[-0.06em] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 sm:text-2xl"
              aria-label="VibeLock home"
            >
              VibeLock<span className="text-brand-cyan">.</span>
            </Link>
          </div>

          <nav
            aria-label="Shop navigation"
            className="hidden min-w-0 flex-1 items-center justify-center gap-4 text-xs font-semibold uppercase tracking-wide xl:flex 2xl:gap-6"
          >
            {storefrontShopLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-4"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <form
              action="/products"
              method="get"
              role="search"
              aria-label="Search the VibeLock catalog"
              className="hidden w-44 items-center gap-1 rounded-full border border-border bg-white/70 pl-3 pr-1 transition-colors focus-within:border-[#101114]/40 focus-within:ring-2 focus-within:ring-[#00D9FF]/50 xl:flex 2xl:w-52"
            >
              <Input
                type="search"
                name="q"
                aria-label="Search products"
                placeholder="Search products"
                className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                aria-label="Submit product search"
                className="size-9 rounded-full focus-visible:ring-[#00D9FF]"
              >
                <Search aria-hidden="true" />
              </Button>
            </form>

            <details className="group relative xl:hidden">
              <summary
                aria-label="Open product search"
                className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden"
              >
                <Search className="size-5" aria-hidden="true" />
              </summary>
              <div className="absolute right-0 top-full z-50 mt-2 w-[min(88vw,24rem)] border border-[#101114]/15 bg-white p-3">
                <form
                  action="/products"
                  method="get"
                  role="search"
                  aria-label="Search the VibeLock catalog"
                  className="flex items-center gap-2"
                >
                  <Input
                    type="search"
                    name="q"
                    aria-label="Search products"
                    placeholder="Search products"
                    className="h-11 rounded-sm border-[#101114]/20 bg-white focus-visible:border-[#101114] focus-visible:ring-[#00D9FF]/50"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    aria-label="Submit product search"
                    className="size-11 rounded-sm bg-[#101114] text-white hover:bg-[#101114]/85 focus-visible:ring-[#00D9FF]"
                  >
                    <Search aria-hidden="true" />
                  </Button>
                </form>
              </div>
            </details>

            {user ? (
              <>
                <Link
                  href="/account"
                  className="hidden min-h-11 items-center rounded-full px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 xl:inline-flex"
                >
                  Account
                </Link>
                <form action={logoutAction} className="hidden xl:block">
                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="hidden min-h-11 items-center rounded-full px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 xl:inline-flex"
              >
                Sign in
              </Link>
            )}

            <Link
              href="/cart"
              aria-label={itemCount > 0 ? `Shopping bag, ${itemCount} items` : "Shopping bag"}
              className="relative inline-flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2"
            >
              <ShoppingBag className="size-5" aria-hidden="true" />
              {itemCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand-cyan px-1 text-[10px] font-bold leading-none text-brand-charcoal">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </Container>
    </header>
  );
}
