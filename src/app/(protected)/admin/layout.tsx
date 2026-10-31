import { requireRole } from "@/lib/auth/authorization";
import { logoutAction } from "@/app/actions/auth";
import { AdminMobileNavigation, AdminSidebar } from "@/components/admin/shared";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Enforce ADMIN role
  const admin = await requireRole("ADMIN");

  return (
    <div className="flex min-h-screen bg-[#F3F0E8] text-[#101114]">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-[#101114]/10 bg-white/95 backdrop-blur-sm shadow-xs">
          <div className="flex min-h-16 items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <AdminMobileNavigation />
            <div className="min-w-0">
              <p className="text-muted-foreground truncate text-xs font-medium tracking-[0.16em] uppercase">
                VibeLock / Admin
              </p>
              <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
                Dashboard
              </h1>
            </div>
            <div className="ml-auto flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="hidden min-w-0 text-right sm:block">
                <p className="max-w-48 truncate text-sm font-medium">
                  {admin.name || admin.email || "Administrator"}
                </p>
                <p className="text-muted-foreground text-xs">Administrator</p>
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
