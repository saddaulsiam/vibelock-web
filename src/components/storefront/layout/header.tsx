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
    <header className="sticky top-0 z-40 w-full border-b border-[#101114]/10 bg-[#F3F0E8]">
      <Container>
        <div className="flex min-h-[68px] items-center gap-3 py-2 sm:min-h-[72px] xl:gap-7">
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <MobileNav isAuthenticated={Boolean(user)} />
            <Link
              href="/"
              className="rounded-sm text-[22px] font-extrabold tracking-[-0.075em] text-[#101114] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2 sm:text-2xl"
              aria-label="VibeLock home"
            >
              VibeLock<span className="text-[#00D9FF]">.</span>
            </Link>
          </div>

          <nav
            aria-label="Shop navigation"
            className="hidden min-w-0 flex-1 items-center justify-center gap-4 text-[11px] font-semibold uppercase tracking-[0.12em] xl:flex 2xl:gap-6"
          >
            {storefrontShopLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap py-2 text-[#101114]/65 transition-colors hover:text-[#101114] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2"
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
              className="hidden w-40 items-center gap-1 border-b border-[#101114]/20 pl-2 transition-colors focus-within:border-[#101114] xl:flex 2xl:w-48"
            >
              <Search className="size-4 shrink-0 text-[#101114]/55" aria-hidden="true" />
              <Input
                type="search"
                name="q"
                aria-label="Search products"
                placeholder="Search products"
                className="h-10 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0"
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                aria-label="Submit product search"
                className="size-9 rounded-none text-[#101114] hover:bg-[#101114]/5 focus-visible:ring-[#00D9FF]"
              >
                <Search aria-hidden="true" className="size-4" />
              </Button>
            </form>

            <details className="group relative xl:hidden">
              <summary
                aria-label="Open product search"
                className="flex size-10 cursor-pointer list-none items-center justify-center text-[#101114] transition-colors hover:bg-[#101114]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] [&::-webkit-details-marker]:hidden"
              >
                <Search className="size-5" aria-hidden="true" />
              </summary>
              <div className="absolute right-0 top-full z-50 mt-2 w-[min(88vw,24rem)] border border-[#101114]/15 bg-[#F3F0E8] p-3 shadow-lg">
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
                    className="h-11 rounded-none border-[#101114]/20 bg-white focus-visible:border-[#101114] focus-visible:ring-[#00D9FF]/50"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    aria-label="Submit product search"
                    className="size-11 rounded-none bg-[#101114] text-white hover:bg-[#101114]/85 focus-visible:ring-[#00D9FF]"
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
                  className="hidden min-h-10 items-center px-3 text-sm font-medium text-[#101114]/75 transition-colors hover:text-[#101114] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2 xl:inline-flex"
                >
                  Account
                </Link>
                <form action={logoutAction} className="hidden xl:block">
                  <button
                    type="submit"
                    className="inline-flex min-h-10 items-center px-3 text-sm font-medium text-[#101114]/60 transition-colors hover:text-[#101114] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="hidden min-h-10 items-center px-3 text-sm font-medium text-[#101114]/75 transition-colors hover:text-[#101114] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2 xl:inline-flex"
              >
                Sign in
              </Link>
            )}

            <Link
              href="/cart"
              aria-label={itemCount > 0 ? `Shopping bag, ${itemCount} items` : "Shopping bag"}
              className="relative inline-flex size-10 items-center justify-center text-[#101114] transition-colors hover:bg-[#101114]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
            >
              <ShoppingBag className="size-5" aria-hidden="true" />
              {itemCount > 0 ? (
                <span className="absolute right-0 top-0 flex min-h-5 min-w-5 items-center justify-center bg-[#00D9FF] px-1 text-[10px] font-bold leading-none text-[#101114]">
                  {itemCount}
                </span>
              ) : null}
            </Link>
          </div>
        </div>
      </Container>
    </header>
  );
}
