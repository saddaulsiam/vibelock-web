"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const accountLinks = [
  { label: "Overview", href: "/account" },
  { label: "Orders", href: "/account/orders" },
  { label: "Returns", href: "/account/returns" },
  { label: "Addresses", href: "/account/addresses" },
  { label: "Profile", href: "/account/profile" },
  { label: "Security", href: "/account/security" },
] as const;

export function AccountNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Account navigation"
      className="-mx-1 flex min-w-0 gap-1 overflow-x-auto px-1 pb-1 sm:mx-0 sm:px-0"
    >
      {accountLinks.map((link) => {
        const active =
          pathname === link.href ||
          (link.href !== "/account" && pathname.startsWith(`${link.href}/`));

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-10 shrink-0 items-center border-b-2 px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none ${
              active
                ? "border-[#101114] text-[#101114]"
                : "text-muted-foreground border-transparent hover:text-[#101114]"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
