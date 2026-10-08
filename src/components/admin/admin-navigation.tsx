"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, FolderTree, LayoutDashboard, Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navigation = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Products", href: "/admin/products", icon: Boxes },
  { label: "Categories", href: "/admin/categories", icon: FolderTree },
] as const;

function AdminNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin navigation" className="grid gap-1">
      {navigation.map(({ label, href, icon: Icon }) => {
        const active = href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={`inline-flex min-h-11 items-center gap-3 border-l-2 px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2 ${
              active
                ? "border-[#00D9FF] bg-white/10 text-white"
                : "border-transparent text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-[#101114] text-white lg:flex">
      <div className="border-b border-white/10 px-6 py-6">
        <Link
          href="/admin"
          className="rounded-sm text-xl font-extrabold tracking-[-0.06em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
        >
          VibeLock<span className="text-[#00D9FF]">.</span>
        </Link>
        <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-white/55">Operations</p>
      </div>
      <div className="px-3 py-5">
        <AdminNavLinks />
      </div>
    </aside>
  );
}

export function AdminMobileNavigation() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open admin navigation"
        className="inline-flex size-11 items-center justify-center border border-[#101114]/15 text-[#101114] transition-colors hover:bg-[#F3F0E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(86vw,20rem)] border-0 bg-[#101114] p-0 text-white">
        <SheetHeader className="border-b border-white/10 px-5 py-6">
          <SheetTitle className="text-left text-xl font-extrabold tracking-[-0.06em] text-white">
            VibeLock<span className="text-[#00D9FF]">.</span>
            <span className="ml-2 text-xs font-medium uppercase tracking-[0.16em] text-white/55">Operations</span>
          </SheetTitle>
        </SheetHeader>
        <div className="px-3 py-5">
          <AdminNavLinks onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
