"use client";

import { logoutAction } from "@/app/actions/auth";
import { accountNavItems } from "@/lib/account/nav";
import { Loader2, LogOut, X } from "lucide-react";
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
            <span className="text-vl-cyan text-[11px] font-bold tracking-[0.2em] uppercase">
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
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="inline-flex min-h-7 cursor-pointer items-center gap-1 rounded-md bg-red-500 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                {loggingOut ? <Loader2 className="size-3 animate-spin" /> : null}
                {loggingOut ? "Signing out..." : "Yes, sign out"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmLogout(false)}
                disabled={loggingOut}
                className="inline-flex size-6 items-center justify-center rounded-md text-red-400 hover:bg-red-100 hover:text-red-600"
                title="Cancel"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmLogout(true)}
              title="Sign out of account"
              className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded border-[1.5px] border-red-200 bg-red-100/60 px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:border-red-300 hover:bg-red-100 hover:text-red-600"
            >
              <LogOut className="size-3.5 shrink-0 text-red-500" />
              <span>Sign Out</span>
            </button>
          )}
        </div>

        {/* Universal Horizontal Underline Tabs */}
        <nav
          aria-label="Account navigation tabs"
          className="mb-8 border-b border-[#101114]/10 bg-transparent"
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
                  className={`inline-flex min-h-10.5 shrink-0 items-center gap-1.5 border-b-2 pt-1 pb-3 text-xs tracking-wider uppercase transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none ${
                    isActive
                      ? "border-[#101114] font-semibold text-[#101114]"
                      : "border-transparent font-medium text-neutral-500 hover:border-neutral-300 hover:text-[#101114]"
                  }`}
                >
                  <Icon
                    className={`size-3.5 ${isActive ? "text-[#00D9FF]" : "text-neutral-400"}`}
                  />
                  <span>{item.label}</span>
                  {typeof badgeCount === "number" && badgeCount > 0 && (
                    <span
                      className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] leading-none font-bold ${
                        isActive ? "bg-[#101114] text-white" : "bg-neutral-100 text-neutral-600"
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
