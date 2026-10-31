import Link from "next/link";
import { requireRole } from "@/lib/auth/authorization";
import { AdminPageHeader } from "@/components/admin/shared";
import { AdminKpiCard, AdminKpiGrid } from "@/components/admin/shared";
import { ADMIN_TABLE_CLASSES } from "@/lib/admin/admin-table-styles";
import {
  getAdminPayments,
  getAdminPaymentStats,
} from "@/lib/admin/payment-queries";
import { AdminPaymentsTable } from "@/components/admin/payments";
import {
  CheckCircle2,
  Clock,
  DollarSign,
  Settings,
  XCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

function formatCurrency(val: number): string {
  const [intPart, decPart] = val.toFixed(2).split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `৳${grouped}.${decPart}`;
}

export default async function AdminPaymentsPage() {
  await requireRole("ADMIN");

  const [stats, payments] = await Promise.all([
    getAdminPaymentStats(),
    getAdminPayments(),
  ]);

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      {/* ── Page Header ── */}
      <AdminPageHeader
        eyebrow="Operations / Financial Ledger"
        title="Payment Management & Transactions"
        badgeLabel="Real-Time Ledger"
        badgeVariant="emerald"
        description="Monitor customer payment transactions, gateway settlements (bKash, Nagad, SSLCommerz, COD), and transaction verification."
      >
        <Link
          href="/admin/settings/payments"
          className={ADMIN_TABLE_CLASSES.buttonSecondary}
        >
          <Settings className="size-3.5" />
          <span>Gateway Settings</span>
        </Link>
      </AdminPageHeader>

      {/* ── KPI Overview Cards ── */}
      <AdminKpiGrid columns={4}>
        <AdminKpiCard
          label="Total Collected"
          value={formatCurrency(stats.totalRevenue)}
          description="Authoritative settled revenue"
          icon={DollarSign}
          tone="emerald"
          alert={true}
        />
        <AdminKpiCard
          label="Successful Payments"
          value={stats.successCount.toLocaleString()}
          description="Verified settled transactions"
          icon={CheckCircle2}
          tone="blue"
          alert={true}
        />
        <AdminKpiCard
          label="Pending / In Flight"
          value={stats.pendingCount.toLocaleString()}
          description="Awaiting gateway or COD delivery"
          icon={Clock}
          tone="amber"
          alert={true}
        />
        <AdminKpiCard
          label="Failed / Cancelled"
          value={stats.failedCount.toLocaleString()}
          description="Interrupted or gateway rejections"
          icon={XCircle}
          tone="rose"
          alert={true}
        />
      </AdminKpiGrid>

      {/* ── Payments Ledger Table & Filters ── */}
      <AdminPaymentsTable initialPayments={payments} />
    </div>
  );
}
