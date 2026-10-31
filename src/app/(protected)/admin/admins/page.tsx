import { requireRole } from "@/lib/auth/authorization";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminKpiCard, AdminKpiGrid } from "@/components/admin/admin-kpi-card";
import {
  getAdminUsers,
  getAdminUserStats,
} from "@/lib/admin/admin-user-queries";
import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { Shield, ShieldCheck, UserCheck, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminManagementPage() {
  const currentAdmin = await requireRole("ADMIN");
  const [stats, users] = await Promise.all([
    getAdminUserStats(),
    getAdminUsers(),
  ]);

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      {/* ── Page Header ── */}
      <AdminPageHeader
        eyebrow="Operations / Access Control"
        title="Admin & Staff Management"
        badgeLabel="Role-Based Access"
        badgeVariant="blue"
        description="Manage store administrators, managers, and fulfillment staff permissions across the VibeLock dashboard."
      />

      {/* ── KPI Overview Cards ── */}
      <AdminKpiGrid columns={4}>
        <AdminKpiCard
          label="Total Team Members"
          value={stats.totalStaff.toLocaleString()}
          description="Active dashboard staff"
          icon={Users}
          tone="neutral"
          alert={true}
        />
        <AdminKpiCard
          label="Super Administrators"
          value={stats.admins.toLocaleString()}
          description="Full system & settings access"
          icon={ShieldCheck}
          tone="blue"
          alert={true}
        />
        <AdminKpiCard
          label="Store Managers"
          value={stats.managers.toLocaleString()}
          description="Catalog, inventory & order ops"
          icon={Shield}
          tone="emerald"
          alert={true}
        />
        <AdminKpiCard
          label="Operations Staff"
          value={stats.staff.toLocaleString()}
          description="Fulfillment & customer care"
          icon={UserCheck}
          tone="amber"
          alert={true}
        />
      </AdminKpiGrid>

      {/* ── User Table & Controls ── */}
      <AdminUsersTable
        initialUsers={users}
        stats={stats}
        currentAdminId={currentAdmin.id}
      />
    </div>
  );
}

