import { requireRole } from "@/lib/auth/authorization";
import { AdminPageHeader } from "@/components/admin/shared";
import { SettingsNavTabs } from "@/components/admin/settings/settings-nav-tabs";
import { ShieldCheck } from "lucide-react";

export default async function AdminSettingsLayout({ children }: { children: React.ReactNode }) {
  // Enforce ADMIN role at settings layout level
  await requireRole("ADMIN");

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-8">
      <AdminPageHeader
        eyebrow="Operations / Store Infrastructure"
        title="Store Settings"
        badgeLabel="Authoritative Sync"
        badgeVariant="emerald"
        description="Configure store policies, legal DBID, payment gateways, courier rules, and security controls."
      >
        <div className="hidden items-center gap-2 rounded-lg border border-neutral-200/80 bg-white px-3 py-1.5 text-xs text-neutral-600 shadow-2xs sm:flex">
          <ShieldCheck className="size-4 text-emerald-600" />
          <span className="font-medium">Audit Log Enforced</span>
        </div>
      </AdminPageHeader>

      {/* Dynamic Navigation Tabs */}
      <SettingsNavTabs />

      <div className="min-w-0">{children}</div>
    </div>
  );
}
