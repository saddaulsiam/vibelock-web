import { CheckCircle2, Clock, Package, ShoppingBag } from "lucide-react";
import { getAdminOrders } from "@/lib/admin/order-queries";
import { AdminOrdersTable } from "@/components/admin/admin-orders-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminKpiCard, AdminKpiGrid } from "@/components/admin/admin-kpi-card";
import { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";

function valueOf(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const rawStatus = valueOf(params.status);
  const status =
    rawStatus && Object.values(OrderStatus).includes(rawStatus as OrderStatus)
      ? (rawStatus as OrderStatus)
      : undefined;

  const rawPaymentStatus = valueOf(params.paymentStatus);
  const paymentStatus =
    rawPaymentStatus && Object.values(PaymentStatus).includes(rawPaymentStatus as PaymentStatus)
      ? (rawPaymentStatus as PaymentStatus)
      : undefined;

  const rawPaymentMethod = valueOf(params.paymentMethod);
  const paymentMethod =
    rawPaymentMethod && Object.values(PaymentMethod).includes(rawPaymentMethod as PaymentMethod)
      ? (rawPaymentMethod as PaymentMethod)
      : undefined;

  const q = valueOf(params.q);
  const rawPage = Number(valueOf(params.page));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const data = await getAdminOrders({
    status,
    paymentStatus,
    paymentMethod,
    search: q,
    page,
    limit: 20,
  });

  const pendingCount = data.statusCounts.PENDING ?? 0;
  const processingCount = (data.statusCounts.CONFIRMED ?? 0) + (data.statusCounts.PROCESSING ?? 0);
  const inTransitCount = data.statusCounts.SHIPPED ?? 0;
  const deliveredCount = data.statusCounts.DELIVERED ?? 0;

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      {/* Harmonized Page Header */}
      <AdminPageHeader
        eyebrow="Operations / Sales"
        title="Order Management"
        badgeLabel="Live Dispatch"
        badgeVariant="emerald"
        description="Review incoming customer orders, manage fulfillment stages, verify payments, and inspect audit trails."
      />

      {/* Operational KPI Metric Cards */}
      <AdminKpiGrid columns={4}>
        <AdminKpiCard
          label="Total Orders"
          value={data.statusCounts.ALL.toLocaleString()}
          description="Lifetime orders across all sales channels"
          icon={ShoppingBag}
          tone="neutral"
          alert={true}
          href="/admin/orders"
        />

        <AdminKpiCard
          label="Pending Confirmation"
          value={pendingCount.toLocaleString()}
          description={
            pendingCount > 0
              ? "Requires merchant review or customer call"
              : "No pending orders waiting"
          }
          icon={Clock}
          tone="amber"
          alert={true}
          href="/admin/orders?status=PENDING"
        />

        <AdminKpiCard
          label="In Fulfillment"
          value={processingCount.toLocaleString()}
          description={`Confirmed or packaging (${inTransitCount} in transit)`}
          icon={Package}
          tone="blue"
          alert={true}
          href="/admin/orders?status=CONFIRMED"
        />

        <AdminKpiCard
          label="Completed Orders"
          value={deliveredCount.toLocaleString()}
          description="Successfully delivered to customers"
          icon={CheckCircle2}
          tone="emerald"
          alert={true}
          href="/admin/orders?status=DELIVERED"
        />
      </AdminKpiGrid>

      {/* Main Interactive Table */}
      <AdminOrdersTable
        initialData={data}
        currentFilters={{
          q,
          status: rawStatus,
          paymentStatus: rawPaymentStatus,
          paymentMethod: rawPaymentMethod,
        }}
      />
    </div>
  );
}
