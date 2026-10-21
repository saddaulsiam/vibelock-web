import Link from "next/link";
import Form from "next/form";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  HelpCircle,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Truck,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getAdminReconciliation,
  ReconciliationClassification,
} from "@/lib/admin/reconciliation-queries";

function money(value: number | null | undefined): string {
  if (value === null || value === undefined) return "Unavailable";
  return `৳${value.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateLabel(value: Date): string {
  return new Intl.DateTimeFormat("en-BD", { dateStyle: "medium" }).format(value);
}

const ranges = [
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["7d", "Last 7 days"],
  ["30d", "Last 30 days"],
  ["this-month", "This month"],
  ["last-month", "Last month"],
  ["custom", "Custom"],
] as const;

const classificationOptions: [string, string][] = [
  ["all", "All classifications"],
  ["ONLINE_SETTLED", "Online Paid (Gateway Capture)"],
  ["COD_DELIVERED", "COD Delivered (Remittance Unverified)"],
  ["COD_IN_FLIGHT", "COD Awaiting Delivery (In-Flight)"],
  ["COD_FAILED_RETURNED", "COD Refused / Returned by Courier"],
  ["ONLINE_REFUNDED", "Online Fully Refunded"],
  ["ONLINE_PENDING", "Online Payment Pending"],
  ["ONLINE_CANCELLED", "Online Cancelled (Unpaid)"],
  ["COD_CANCELLED", "COD Cancelled (Pre-Shipment)"],
  ["ANOMALY", "Reconciliation Anomalies"],
];

function classificationBadge(classification: ReconciliationClassification) {
  switch (classification) {
    case "ONLINE_SETTLED":
      return (
        <Badge className="border-emerald-300 bg-emerald-100 text-emerald-800">
          <CheckCircle2 className="mr-1 inline size-3" /> Online Paid
        </Badge>
      );
    case "COD_DELIVERED":
      return (
        <Badge className="border-amber-300 bg-amber-100 text-amber-800">
          <Truck className="mr-1 inline size-3" /> COD Delivered (Unremitted)
        </Badge>
      );
    case "COD_IN_FLIGHT":
      return (
        <Badge className="border-sky-300 bg-sky-100 text-sky-800">
          <Clock className="mr-1 inline size-3" /> COD In-Flight
        </Badge>
      );
    case "COD_FAILED_RETURNED":
      return (
        <Badge className="border-rose-300 bg-rose-100 text-rose-800">
          <RotateCcw className="mr-1 inline size-3" /> COD Refused/Returned
        </Badge>
      );
    case "ONLINE_REFUNDED":
      return (
        <Badge className="border-purple-300 bg-purple-100 text-purple-800">
          <RotateCcw className="mr-1 inline size-3" /> Fully Refunded
        </Badge>
      );
    case "ONLINE_PENDING":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Online Pending
        </Badge>
      );
    case "ONLINE_CANCELLED":
    case "COD_CANCELLED":
      return (
        <Badge variant="outline" className="text-zinc-500">
          <XCircle className="mr-1 inline size-3" /> Cancelled
        </Badge>
      );
    case "ANOMALY":
      return (
        <Badge variant="destructive" className="bg-red-600 text-white">
          <AlertTriangle className="mr-1 inline size-3" /> Anomaly
        </Badge>
      );
    default:
      return <Badge variant="outline">{classification}</Badge>;
  }
}

export default async function AdminReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const value = (key: string) => {
    const val = params[key];
    return typeof val === "string" && val.trim() !== "" ? val.trim() : undefined;
  };
  const range = value("range") ?? "30d";
  const from = value("from");
  const to = value("to");
  const classification =
    value("classification") && value("classification") !== "all"
      ? value("classification")
      : undefined;
  const search = value("q");
  const page = Number(value("page") ?? "1");

  const buildHref = (updates: Record<string, string | number | undefined>) => {
    const query = new URLSearchParams();
    const currentParams = {
      range,
      from,
      to,
      classification,
      q: search,
      page: value("page"),
      ...updates,
    };
    for (const [k, v] of Object.entries(currentParams)) {
      if (v !== undefined && v !== "" && v !== "all") query.set(k, String(v));
    }
    return `?${query.toString()}`;
  };

  const data = await getAdminReconciliation({
    range,
    from,
    to,
    classification,
    search,
    page,
    limit: 25,
  });

  const { summary, orders, totalOrders, totalPages } = data;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <header className="flex flex-col gap-4 border-b border-[#101114]/15 pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/reports"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-semibold tracking-[0.16em] uppercase"
            >
              <ArrowLeft className="size-3" /> Back to Profitability
            </Link>
          </div>
          <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold tracking-tight text-[#101114]">
            <CreditCard className="size-7 text-[#00a8c6]" /> Payment &amp; Cash Reconciliation
          </h1>
          <p className="text-muted-foreground mt-2 max-w-3xl text-sm">
            Order-placement cohort lifecycle reconciliation tracking captured gateway payments,
            delivered COD awaiting courier remittance, in-flight parcels, and data anomalies.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            Order Cohort: {dateLabel(summary.start)} –{" "}
            {dateLabel(new Date(summary.end.getTime() - 1))}
          </Badge>
          <a
            href={buildHref({})}
            className="hover:bg-muted inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium"
          >
            <RefreshCw className="size-4" /> Refresh
          </a>
        </div>
      </header>

      {/* Filter Form */}
      <Form
        action="/admin/reports/reconciliation"
        className="grid gap-3 border border-[#101114]/10 bg-white p-4 sm:grid-cols-[1fr_1fr_auto] lg:grid-cols-[auto_1fr_1fr_auto_auto]"
      >
        <label className="text-sm font-medium">
          Cohort Period
          <select
            name="range"
            defaultValue={range}
            className="border-input bg-background mt-2 h-10 w-full border px-3 text-sm lg:w-40"
          >
            {ranges.map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          From
          <Input name="from" type="date" defaultValue={from} className="mt-2" />
        </label>
        <label className="text-sm font-medium">
          To
          <Input name="to" type="date" defaultValue={to} className="mt-2" />
        </label>
        <label className="text-sm font-medium">
          Classification
          <select
            name="classification"
            defaultValue={classification ?? "all"}
            className="border-input bg-background mt-2 h-10 w-full border px-3 text-sm lg:w-56"
          >
            {classificationOptions.map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {search ? <input type="hidden" name="q" value={search} /> : null}
        <button
          className="mt-auto inline-flex h-10 items-center justify-center bg-[#101114] px-5 text-sm font-semibold text-white hover:bg-[#101114]/85"
          type="submit"
        >
          Apply
        </button>
        <p className="text-muted-foreground col-span-full text-xs">
          Date filters select orders placed within the window to reconcile their complete lifecycle
          (gateway captures, refunds, and courier deliveries).
        </p>
      </Form>

      {/* Primary Settlement Status Cards */}
      <section className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-[#101114]">
            Settlement &amp; Courier Receivables Status
          </h2>
          <p className="text-muted-foreground text-xs">
            Cohort lifecycle tracking: payments, refunds, and deliveries for orders placed in this
            period.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Online Captured */}
          <Card className="border-[#101114]/10 bg-white shadow-none">
            <CardContent className="p-5">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Online Gateway Captured
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-700">
                {money(summary.gateway.grossCapturedOnline)}
              </p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {summary.gateway.capturedOnlineTransactionsCount} successful transactions recorded
                by SSLCommerz. Subject to gateway batch payout to bank.
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Online Refunds */}
          <Card className="border-[#101114]/10 bg-white shadow-none">
            <CardContent className="p-5">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Online Refunds Deducted
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-purple-700">
                {money(summary.gateway.processedRefundsTotal)}
              </p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {summary.gateway.processedRefundsCount} processed gateway refunds. Net captured:{" "}
                {money(summary.gateway.netGatewayCaptured)}.
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Delivered COD */}
          <Card className="border-[#101114]/10 bg-white shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  Delivered COD
                </p>
                <Badge
                  variant="outline"
                  className="border-amber-300 bg-amber-50 text-[10px] text-amber-700"
                >
                  Remittance unverified
                </Badge>
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight text-amber-800">
                {money(summary.cod.deliveredUnremittedBilledTotal)}
              </p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {summary.cod.deliveredUnremittedOrderCount} orders handed over at doorstep. Held by
                courier; carrier bank remittance is unconfirmed in database.
              </p>
            </CardContent>
          </Card>

          {/* Card 4: In-Flight COD */}
          <Card className="border-[#101114]/10 bg-white shadow-none">
            <CardContent className="p-5">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                In-Flight COD (Uncollected)
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-sky-800">
                {money(summary.cod.inFlightBilledTotal)}
              </p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {summary.cod.inFlightOrderCount} orders in transit or processing. Cash is not
                collected.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Anomaly Banner if Any Detected */}
      {summary.anomaliesCount > 0 ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-red-600" />
            <div>
              <h3 className="text-sm font-semibold text-red-900">
                {summary.anomaliesCount} Reconciliation Anomalies Detected (
                {money(summary.anomaliesBilledTotal)})
              </h3>
              <p className="mt-1 text-xs text-red-700">
                These orders exhibit a mismatch between delivery status and recorded payment
                transactions (such as online orders delivered without a successful payment record).
                Filter by &ldquo;Reconciliation Anomalies&rdquo; below to inspect individual
                records.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Mutually Exclusive Order Classification Breakdown */}
      <section className="border border-[#101114]/10 bg-white">
        <div className="border-b border-[#101114]/10 px-4 py-4 sm:px-5">
          <h2 className="text-xl font-semibold text-[#101114]">Order Classification Breakdown</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Mutually exclusive categorization. Every order in the selected time window is assigned
            to exactly one bucket. Total orders: {summary.totalOrders} (
            {money(summary.totalBilledAmount)} billed).
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">Classification</th>
                <th className="p-3">Order Count</th>
                <th className="p-3">% of Orders</th>
                <th className="p-3 text-right">Billed Amount</th>
                <th className="p-3">Accounting Description</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {summary.classificationBuckets.map((bucket) => {
                const pct =
                  summary.totalOrders > 0
                    ? ((bucket.orderCount / summary.totalOrders) * 100).toFixed(1)
                    : "0.0";
                return (
                  <tr key={bucket.classification} className="hover:bg-muted/30">
                    <td className="p-3 font-medium">
                      {classificationBadge(bucket.classification)}
                    </td>
                    <td className="p-3">{bucket.orderCount.toLocaleString()}</td>
                    <td className="text-muted-foreground p-3">{pct}%</td>
                    <td className="p-3 text-right font-medium">{money(bucket.billedTotal)}</td>
                    <td className="text-muted-foreground p-3 text-xs">{bucket.description}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Financial Completeness & Disclaimers */}
      <section className="space-y-2 rounded-md border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900">
        <div className="flex items-center gap-2 font-semibold">
          <HelpCircle className="size-4 text-amber-700" />
          Financial Limitations &amp; Unrecorded Expenses
        </div>
        <p className="leading-relaxed">
          <strong>Steadfast Courier Remittances &amp; Fees:</strong> Steadfast delivery charges
          (e.g. ৳60–130 per parcel), reverse delivery fees, and the 1% COD collection fee are not
          recorded in the application database. Billed COD amounts reflect customer totals, not net
          bank transfers.
        </p>
        <p className="leading-relaxed">
          <strong>Gateway MDR &amp; Operating Expenses:</strong> SSLCommerz card/MFS processing fees
          (2%–2.5%) and business operating expenses are unavailable in the current schema. Operating
          profit and net bank payout cannot be calculated authoritatively.
        </p>
      </section>

      {/* Order-Level Reconciliation Audit Table */}
      <section className="border border-[#101114]/10 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#101114]/10 px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-xl font-semibold text-[#101114]">Order Reconciliation Audit</h2>
            <p className="text-muted-foreground mt-1 text-xs">
              Showing {orders.length} of {totalOrders} orders matching active filters.
            </p>
          </div>
          <Form action="/admin/reports/reconciliation" className="flex gap-2">
            <Input
              name="q"
              defaultValue={search}
              placeholder="Search order #, customer, or email"
              className="w-64"
            />
            {range ? <input type="hidden" name="range" value={range} /> : null}
            {from ? <input type="hidden" name="from" value={from} /> : null}
            {to ? <input type="hidden" name="to" value={to} /> : null}
            {classification ? (
              <input type="hidden" name="classification" value={classification} />
            ) : null}
            <button
              className="border-input hover:bg-muted border px-3 text-sm font-medium"
              type="submit"
            >
              Search
            </button>
          </Form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">Order #</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Method</th>
                <th className="p-3">Order Status</th>
                <th className="p-3">Courier Status</th>
                <th className="p-3">Classification</th>
                <th className="p-3 text-right">Billed Total</th>
                <th className="p-3 text-right">Gateway Paid</th>
                <th className="p-3 text-right">Refunded</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-muted-foreground p-8 text-center">
                    No orders match the selected filters.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/30">
                    <td className="p-3 font-medium">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-primary hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                      <p className="text-muted-foreground text-xs">{dateLabel(order.createdAt)}</p>
                    </td>
                    <td className="p-3">
                      <div>{order.customerName || "Guest"}</div>
                      <p className="text-muted-foreground text-xs">{order.customerEmail}</p>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="font-mono text-xs">
                        {order.paymentMethod}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">{order.orderStatus}</Badge>
                    </td>
                    <td className="p-3">
                      {order.shipmentStatus ? (
                        <div className="space-y-0.5">
                          <Badge variant="outline" className="text-xs">
                            {order.shipmentStatus}
                          </Badge>
                          {order.shipmentProvider ? (
                            <p className="text-muted-foreground text-[10px] uppercase">
                              {order.shipmentProvider}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">No shipment</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div>{classificationBadge(order.classification)}</div>
                      {order.anomalyReason ? (
                        <p className="mt-1 text-[11px] font-medium text-red-600">
                          {order.anomalyReason}
                        </p>
                      ) : null}
                      {order.hasActiveReturn ? (
                        <p className="text-[10px] font-medium text-purple-700">
                          Post-delivery return
                        </p>
                      ) : null}
                    </td>
                    <td className="p-3 text-right font-medium">{money(order.billedTotal)}</td>
                    <td className="p-3 text-right text-emerald-700">
                      {order.successfulPaymentTotal > 0 ? money(order.successfulPaymentTotal) : "—"}
                    </td>
                    <td className="p-3 text-right text-purple-700">
                      {order.successfulRefundTotal > 0 ? money(order.successfulRefundTotal) : "—"}
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-primary text-xs font-medium hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 ? (
          <div className="flex justify-center gap-4 border-t border-[#101114]/10 p-4 text-sm">
            <Link
              className={page <= 1 ? "text-muted-foreground/50 pointer-events-none" : "font-medium"}
              href={buildHref({ page: page - 1 })}
            >
              Previous
            </Link>
            <span>
              Page {page} of {totalPages}
            </span>
            <Link
              className={
                page >= totalPages ? "text-muted-foreground/50 pointer-events-none" : "font-medium"
              }
              href={buildHref({ page: page + 1 })}
            >
              Next
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
