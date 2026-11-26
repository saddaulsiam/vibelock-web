import { requireRole } from "@/lib/auth/authorization";
import { AdminPageHeader } from "@/components/admin/shared";
import { SettingsNavTabs } from "@/components/admin/settings/settings-nav-tabs";

export default async function AdminSettingsLayout({ children }: { children: React.ReactNode }) {
  // Enforce ADMIN role at settings layout level
  await requireRole("ADMIN");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Operations / Store Infrastructure"
        title="Store Settings"
        badgeLabel="Settings Engine Active"
        badgeVariant="cyan"
        description="Configure store policies, legal DBID, payment gateways, checkout rules, and operational modes."
      />

      {/* Dynamic Navigation Tabs */}
      <SettingsNavTabs />

      <div className="min-w-0">{children}</div>
    </div>
  );
}

