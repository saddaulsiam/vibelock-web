import * as React from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Container } from "@/components/shared/container";
import { MobileNav } from "./mobile-nav";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { Button } from "@/components/ui/button";

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Container>
        <div className="flex h-16 items-center justify-between">
          {/* Left: Mobile Nav & Brand */}
          <div className="flex items-center gap-4">
            <MobileNav isAuthenticated={Boolean(user)} />
            <Link href="/" className="font-bold text-2xl tracking-tight hidden md:block">
              VibeLock
            </Link>
          </div>

          {/* Center: Brand (Mobile) & Desktop Nav */}
          <div className="flex flex-1 items-center justify-center">
            <Link href="/" className="font-bold text-xl tracking-tight md:hidden">
              VibeLock
            </Link>

            <nav className="hidden md:flex items-center space-x-8 text-sm font-medium">
              <Link
                href="/collections/men"
                className="transition-colors hover:text-primary text-muted-foreground"
              >
                MEN
              </Link>
              <Link
                href="/collections/new-arrivals"
                className="transition-colors hover:text-primary text-muted-foreground"
              >
                NEW ARRIVALS
              </Link>
              <Link
                href="/collections/clothing"
                className="transition-colors hover:text-primary text-muted-foreground"
              >
                CLOTHING
              </Link>
              <Link
                href="/collections/footwear"
                className="transition-colors hover:text-primary text-muted-foreground"
              >
                FOOTWEAR
              </Link>
              <Link
                href="/about"
                className="transition-colors hover:text-primary text-muted-foreground"
              >
                ABOUT
              </Link>
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden md:block">
              {user ? (
                <Link href="/account">
                  <Button variant="ghost" className="text-sm font-medium">
                    Account
                  </Button>
                </Link>
              ) : (
                <Link href="/login">
                  <Button variant="ghost" className="text-sm font-medium">
                    Account / Login
                  </Button>
                </Link>
              )}
            </div>

            <Link href="/cart">
              <Button variant="ghost" size="icon" aria-label="Shopping Cart">
                <ShoppingBag className="h-5 w-5" />
                <span className="sr-only">Cart</span>
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </header>
  );
}
