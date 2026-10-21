import Link from "next/link";
import { requireRole } from "@/lib/auth/authorization";
import { CreditCard, SlidersHorizontal } from "lucide-react";

export default async function AdminSettingsLayout({ children }: { children: React.ReactNode }) {
  // Enforce ADMIN role at settings layout level
  await requireRole("ADMIN");

  return (
    <div className="space-y-6">
      <div className="border-b border-[#101114]/10 pb-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
              VibeLock / Admin / Settings
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-[#101114] sm:text-3xl">
              Store Settings
            </h1>
          </div>
        </div>

        {/* Settings Navigation Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-[#101114]/10 pb-px">
          <Link
            href="/admin/settings/payments"
            className="inline-flex min-h-10 items-center gap-2 border-b-2 border-[#101114] px-4 text-sm font-semibold text-[#101114] transition-colors"
          >
            <CreditCard className="size-4" aria-hidden="true" />
            Payment Methods
          </Link>
          <span
            className="text-muted-foreground inline-flex min-h-10 cursor-not-allowed items-center gap-2 border-b-2 border-transparent px-4 text-sm font-medium opacity-60"
            title="General settings will be available in future releases"
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            General (Upcoming)
          </span>
        </div>
      </div>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
