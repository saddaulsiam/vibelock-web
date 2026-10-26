import { CheckCircle2, Clock, Package, ShoppingBag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminOrders } from "@/lib/admin/order-queries";
import { AdminOrdersTable } from "@/components/admin/admin-orders-table";
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
    rawPaymentStatus &&
    Object.values(PaymentStatus).includes(rawPaymentStatus as PaymentStatus)
      ? (rawPaymentStatus as PaymentStatus)
      : undefined;

  const rawPaymentMethod = valueOf(params.paymentMethod);
  const paymentMethod =
    rawPaymentMethod &&
    Object.values(PaymentMethod).includes(rawPaymentMethod as PaymentMethod)
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
  const processingCount =
    (data.statusCounts.CONFIRMED ?? 0) + (data.statusCounts.PROCESSING ?? 0);
  const inTransitCount = data.statusCounts.SHIPPED ?? 0;
  const deliveredCount = data.statusCounts.DELIVERED ?? 0;

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      {/* Page Header */}
      <header className="flex flex-col gap-4 border-b border-[#101114]/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.18em] uppercase">
            Operations / Sales
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[#101114] sm:text-3xl">
            Order Management
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Review incoming customer orders, manage fulfillment stages, verify payments, and inspect
            audit trails.
          </p>
        </div>
      </header>

      {/* Operational KPI Metric Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Orders */}
        <Card className="rounded-sm border border-[#101114]/10 bg-white shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Total Orders
            </CardTitle>
            <ShoppingBag className="size-4 text-[#101114]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-[#101114]">
              {data.statusCounts.ALL.toLocaleString()}
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Lifetime orders across all sales channels
            </p>
          </CardContent>
        </Card>

        {/* Pending Confirmation */}
        <Card
          className={`rounded-sm border shadow-none ${
            pendingCount > 0 ? "border-amber-300 bg-amber-50/40" : "border-[#101114]/10 bg-white"
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle
              className={`text-xs font-semibold tracking-wider uppercase ${
                pendingCount > 0 ? "text-amber-800" : "text-muted-foreground"
              }`}
            >
              Pending Confirmation
            </CardTitle>
            <Clock
              className={`size-4 ${pendingCount > 0 ? "text-amber-600" : "text-neutral-400"}`}
            />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold tracking-tight ${
                pendingCount > 0 ? "text-amber-800" : "text-[#101114]"
              }`}
            >
              {pendingCount.toLocaleString()}
            </div>
            <p
              className={`mt-1 text-[11px] ${
                pendingCount > 0 ? "font-medium text-amber-700" : "text-muted-foreground"
              }`}
            >
              {pendingCount > 0
                ? "Requires merchant review or customer call"
                : "No pending orders waiting"}
            </p>
          </CardContent>
        </Card>

        {/* Processing / In Fulfillment */}
        <Card className="rounded-sm border border-[#101114]/10 bg-white shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              In Fulfillment
            </CardTitle>
            <Package className="size-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-[#101114]">
              {processingCount.toLocaleString()}
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Confirmed or packaging ({inTransitCount} in transit)
            </p>
          </CardContent>
        </Card>

        {/* Delivered Orders */}
        <Card className="rounded-sm border border-[#101114]/10 bg-white shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Completed Orders
            </CardTitle>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-emerald-800">
              {deliveredCount.toLocaleString()}
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Successfully delivered to customers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Interactive Table */}
      <Card className="rounded-sm border border-[#101114]/10 bg-white p-4 shadow-none sm:p-5">
        <AdminOrdersTable
          initialData={data}
          currentFilters={{
            q,
            status: rawStatus,
            paymentStatus: rawPaymentStatus,
            paymentMethod: rawPaymentMethod,
          }}
        />
      </Card>
    </div>
  );
}
