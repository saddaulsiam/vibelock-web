"use client";

import * as React from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface MobileNavProps {
  isAuthenticated?: boolean;
}

export function MobileNav({ isAuthenticated = false }: MobileNavProps) {
  const [open, setOpen] = React.useState(false);

  const closeNav = () => setOpen(false);

  const navLinks = [
    { href: "/collections/men", label: "Men" },
    { href: "/collections/new-arrivals", label: "New Arrivals" },
    { href: "/collections/clothing", label: "Clothing" },
    { href: "/collections/footwear", label: "Footwear" },
    { href: "/about", label: "About" },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open Mobile Menu"
        className="inline-flex items-center justify-center rounded-md p-2 text-foreground hover:bg-muted md:hidden"
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-left font-bold tracking-tight">VibeLock</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col space-y-4 mt-8 flex-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeNav}
              className="text-lg font-medium hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col space-y-4 border-t pt-4">
          {isAuthenticated ? (
            <Link href="/account" onClick={closeNav}>
              <Button className="w-full" variant="outline">
                Account
              </Button>
            </Link>
          ) : (
            <Link href="/login" onClick={closeNav}>
              <Button className="w-full" variant="outline">
                Account / Login
              </Button>
            </Link>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
