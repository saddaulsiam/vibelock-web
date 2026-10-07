"use client";

import * as React from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { storefrontShopLinks } from "./navigation";

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
        className="inline-flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 xl:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(88vw,24rem)] overflow-y-auto bg-background p-5">
        <SheetHeader className="border-b border-border px-0 pb-5 pt-1">
          <SheetTitle className="text-left text-xl font-extrabold tracking-[-0.06em]">
            VibeLock<span className="text-brand-cyan">.</span>
          </SheetTitle>
        </SheetHeader>

        <nav aria-label="Mobile shop navigation" className="mt-5 flex flex-col">
          {storefrontShopLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeNav}
              className="border-b border-border/70 py-3.5 text-sm font-semibold uppercase tracking-wide text-foreground transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-6 grid gap-3 border-t border-border pt-5">
          <Link
            href={isAuthenticated ? "/account" : "/login"}
            onClick={closeNav}
            className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2"
          >
            {isAuthenticated ? "My account" : "Sign in"}
          </Link>
          {!isAuthenticated && (
            <Link
              href="/register"
              onClick={closeNav}
              className="inline-flex min-h-11 items-center rounded-md px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2"
            >
              Create account
            </Link>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
