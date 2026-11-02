import { requireRole } from "@/lib/auth/authorization";
import { logoutAction } from "@/app/actions/auth";
import { AdminMobileNavigation, AdminSidebar } from "@/components/admin/shared";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Enforce at least STAFF role (STAFF, MANAGER, ADMIN are permitted to access operations dashboard)
  const user = await requireRole("STAFF");

  return (
    <div className="flex min-h-screen bg-[#F3F0E8] text-[#101114]">
      <AdminSidebar userRole={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-[#101114]/10 bg-white/95 shadow-xs backdrop-blur-sm">
          <div className="flex min-h-16 items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <AdminMobileNavigation userRole={user.role} />
            <div className="min-w-0">
              <p className="text-muted-foreground truncate text-xs font-medium tracking-[0.16em] uppercase">
                VibeLock / Operations
              </p>
              <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
                Dashboard
              </h1>
            </div>
            <div className="ml-auto flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="hidden min-w-0 text-right sm:block">
                <p className="max-w-48 truncate text-sm font-medium">
                  {user.name || user.email || "Staff Member"}
                </p>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  {user.role === "ADMIN" && (
                    <span className="rounded bg-[#00D9FF]/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#101114]">
                      ADMIN
                    </span>
                  )}
                  {user.role === "MANAGER" && (
                    <span className="rounded bg-amber-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-900">
                      MANAGER
                    </span>
                  )}
                  {user.role === "STAFF" && (
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-900">
                      STAFF
                    </span>
                  )}
                </div>
              </div>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center border border-[#101114]/15 px-3 text-sm font-medium transition-colors hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none sm:px-4"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
