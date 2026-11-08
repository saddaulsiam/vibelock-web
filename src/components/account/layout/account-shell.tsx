"use client";

import { logoutAction } from "@/app/actions/auth";
import { accountNavItems } from "@/lib/account/nav";
import { Button } from "@/components/ui/button";
import { LogOut, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface AccountShellProps {
  profile: {
    name: string | null;
    email: string;
    emailVerified: Date | null;
    image: string | null;
  };
  navCounts?: {
    orders?: number;
    coupons?: number;
    returns?: number;
  };
  children: React.ReactNode;
}

export function AccountShell({ profile, navCounts, children }: AccountShellProps) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active tab into view horizontally on mobile
  useEffect(() => {
    if (!tabsContainerRef.current) return;
    const activeTab = tabsContainerRef.current.querySelector<HTMLElement>('[data-active="true"]');
    if (activeTab) {
      activeTab.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [pathname]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logoutAction({ redirect: false });
    toast.success("You've been signed out.");
    router.push("/");
    router.refresh();
  };

  return (
    <div className="bg-background relative min-h-screen">
      {/* ── Architectural Dot Matrix Background (VibeLock Technical Grid) ── */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-70"
        style={{
          backgroundImage: "radial-gradient(rgba(16, 17, 20, 0.13) 1.2px, transparent 1.2px)",
          backgroundSize: "30px 30px",
        }}
        aria-hidden="true"
      />

      {/* ── Main Canvas (Centered single column for all viewports) ── */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-24 pb-16 sm:px-6 sm:pt-28 lg:px-8">
        {/* Universal Identity Row */}
        <div className="flex items-center justify-between gap-4 pb-8">
          <div>
            <span className="text-vl-cyan text-compact tracking-streetwear font-bold uppercase">
              My Account
            </span>
            <h1 className="text-vl-black mt-0.5 text-xl font-semibold tracking-tight uppercase sm:text-2xl md:text-3xl">
              {profile.name || "Customer"}
            </h1>
          </div>

          {/* Sign Out — inline confirmation before firing */}
          {confirmLogout ? (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5">
              <span className="text-xs font-medium text-red-700">Are you sure?</span>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleLogout}
                disabled={loggingOut}
                loading={loggingOut}
                className="h-7 px-2.5 text-xs font-semibold"
              >
                {loggingOut ? "Signing out..." : "Yes, sign out"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setConfirmLogout(false)}
                disabled={loggingOut}
                className="size-7 text-red-400 hover:bg-red-100 hover:text-red-600"
                title="Cancel"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setConfirmLogout(true)}
              title="Sign out of account"
              className="border-red-200 bg-red-100/60 text-red-600 hover:border-red-300 hover:bg-red-100 hover:text-red-700"
            >
              <LogOut className="size-3.5 shrink-0 text-red-500" />
              <span>Sign Out</span>
            </Button>
          )}
        </div>

        {/* Universal Horizontal Underline Tabs */}
        <nav
          aria-label="Account navigation tabs"
          className="border-vl-black/10 mb-8 border-b bg-transparent"
        >
          <div
            ref={tabsContainerRef}
            className="-mb-px flex scrollbar-none items-center gap-4 overflow-x-auto [-ms-overflow-style:none] sm:gap-6 [&::-webkit-scrollbar]:hidden"
          >
            {accountNavItems.map((item) => {
              const isActive = item.matches
                ? item.matches(pathname)
                : item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              const badgeCount = item.badgeKey ? navCounts?.[item.badgeKey] : undefined;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  data-active={isActive ? "true" : undefined}
                  className={`focus-visible:ring-vl-cyan inline-flex min-h-10.5 shrink-0 items-center gap-1.5 border-b-2 pt-1 pb-3 text-xs tracking-wider uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                    isActive
                      ? "border-vl-black text-vl-black font-semibold"
                      : "hover:text-vl-black border-transparent font-medium text-neutral-500 hover:border-neutral-300"
                  }`}
                >
                  <Icon className={`size-3.5 ${isActive ? "text-vl-cyan" : "text-neutral-400"}`} />
                  <span>{item.label}</span>
                  {typeof badgeCount === "number" && badgeCount > 0 && (
                    <span
                      className={`text-2xs ml-0.5 rounded-full px-1.5 py-0.5 leading-none font-bold ${
                        isActive ? "bg-vl-black text-white" : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Main Account Page Content */}
        <main className="w-full">{children}</main>
      </div>
    </div>
  );
}
