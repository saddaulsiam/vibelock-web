import Link from "next/link";
import { Calculator, ExternalLink, Store } from "lucide-react";
import { requireRole } from "@/lib/auth/authorization";
import { logoutAction } from "@/app/actions/auth";
import { AdminMobileNavigation, AdminSidebar, AdminSignOutButton } from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Enforce at least STAFF role (STAFF, MANAGER, ADMIN are permitted to access operations dashboard)
  const user = await requireRole("STAFF");

  const displayName = user.name || user.email?.split("@")[0] || "Staff Member";
  const initials = (user.name || user.email || "VL").slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-vl-white-300 text-vl-dark-900">
      <AdminSidebar userRole={user.role} />
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        {/* ── Top Dashboard Header ── */}
        <header className="z-30 shrink-0 border-b border-vl-dark-900/10 bg-white/95 shadow-xs backdrop-blur-md">
          <div className="flex min-h-16 items-center justify-between gap-3 px-3.5 py-2.5 sm:px-6 sm:py-3 lg:px-8">
            {/* Left: Mobile Nav Toggle & Brand on Mobile, User Profile on Desktop */}
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
              <AdminMobileNavigation userRole={user.role} />

              <Link
                href="/admin"
                className="font-heading text-base font-black tracking-tight text-vl-dark-900 lg:hidden"
              >
                <span>VibeLock</span>
                <span className="text-vl-cyan">.</span>
              </Link>

              {/* Desktop User Profile Chip */}
              <div className="hidden items-center gap-2.5 lg:flex">
                <div
                  className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-vl-dark-900 font-mono text-xs font-bold text-vl-cyan shadow-2xs ring-1 ring-black/5"
                  title={`${displayName} (${user.role})`}
                >
                  {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.image} alt={displayName} className="size-full object-cover" />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div className="text-left">
                  <p className="max-w-[150px] truncate text-xs leading-tight font-bold text-vl-dark-900 xl:max-w-[180px]">
                    {displayName}
                  </p>
                  <div className="mt-0.5">
                    {user.role === "ADMIN" && (
                      <Badge variant="cyan" className="h-4 px-1.5 font-mono text-[9px] font-bold">
                        ADMIN
                      </Badge>
                    )}
                    {user.role === "MANAGER" && (
                      <Badge
                        variant="secondary"
                        className="h-4 border-amber-300 bg-amber-100 px-1.5 font-mono text-[9px] font-bold text-amber-900 hover:bg-amber-100"
                      >
                        MANAGER
                      </Badge>
                    )}
                    {user.role === "STAFF" && (
                      <Badge
                        variant="secondary"
                        className="h-4 border-blue-200 bg-blue-100 px-1.5 font-mono text-[9px] font-bold text-blue-900 hover:bg-blue-100"
                      >
                        STAFF
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Quick Store Link + High-Impact POS Button + Logout */}
            <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
              {/* Storefront Link (Desktop) */}
              <Button
                render={<Link href="/" target="_blank" rel="noopener noreferrer" />}
                nativeButton={false}
                variant="outline"
                size="sm"
                className="hidden md:inline-flex"
                title="Open live customer storefront in a new tab"
              >
                <Store className="size-3.5 text-vl-dark-900/60" />
                <span>Live Store</span>
                <ExternalLink className="size-3 text-vl-dark-900/40" />
              </Button>

              {/* High-Impact POS Counter Button */}
              <Button
                render={<Link href="/pos" />}
                nativeButton={false}
                size="sm"
                title="Launch Counter POS Cashier Register"
              >
                <Calculator className="size-4 shrink-0" aria-hidden="true" />
                <span>POS Counter</span>
              </Button>

              {/* Sign Out Button */}
              <form action={logoutAction}>
                <input type="hidden" name="redirectTo" value="/login" />
                <AdminSignOutButton />
              </form>
            </div>
          </div>
        </header>

        {/* ── Main Content Area ── */}
        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
