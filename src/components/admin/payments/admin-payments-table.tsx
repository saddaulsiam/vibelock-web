"use client";

import { useState } from "react";
import Link from "next/link";
import { PaymentStatus } from "@prisma/client";
import type { AdminPaymentListItem } from "@/lib/admin/payments/payment-queries";
import { ADMIN_TABLE_CLASSES } from "@/lib/admin/shared";
import {
  AdminTableFilterSelect,
  AdminTableMetaBar,
  AdminTableSearchInput,
  AdminTableTabItem,
  AdminTableTabs,
} from "@/components/admin/shared";
import { AdminTableInfiniteScroll } from "@/components/admin/shared";
import {
  AdminTableColumnVisibility,
  useAdminTableColumns,
  type ColumnOption,
} from "@/components/admin/shared";
import { exportToCsv } from "@/lib/admin/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  Mail,
  Phone,
  RotateCcw,
  Smartphone,
  XCircle,
} from "lucide-react";

export type PaymentColumnKey =
  | "ref"
  | "order"
  | "customer"
  | "method"
  | "amount"
  | "status"
  | "date";

const paymentColumnOptions: ColumnOption<PaymentColumnKey>[] = [
  { key: "ref", label: "Transaction / Ref" },
  { key: "order", label: "Order Number" },
  { key: "customer", label: "Customer Details" },
  { key: "method", label: "Payment Gateway" },
  { key: "amount", label: "Amount (BDT)" },
  { key: "status", label: "Payment Status" },
  { key: "date", label: "Date & Time" },
];

interface AdminPaymentsTableProps {
  initialPayments: AdminPaymentListItem[];
}

export function AdminPaymentsTable({ initialPayments }: AdminPaymentsTableProps) {
  const [search, setSearch] = useState("");
  const [gatewayFilter, setGatewayFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [visibleCount, setVisibleCount] = useState(25);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Column Visibility Hook
  const { visibleColumns, handleColumnChange, handleColumnReset, totalVisibleCols } =
    useAdminTableColumns(paymentColumnOptions);

  // When filters or search change, reset pagination
  const [prevSearch, setPrevSearch] = useState(search);
  const [prevGateway, setPrevGateway] = useState(gatewayFilter);
  const [prevStatus, setPrevStatus] = useState(statusFilter);

  if (search !== prevSearch || gatewayFilter !== prevGateway || statusFilter !== prevStatus) {
    setPrevSearch(search);
    setPrevGateway(gatewayFilter);
    setPrevStatus(statusFilter);
    setVisibleCount(25);
  }

  const filteredPayments = initialPayments.filter((item) => {
    // Gateway matching
    if (gatewayFilter !== "ALL" && item.gateway !== gatewayFilter) {
      return false;
    }

    // Status matching
    if (statusFilter !== "ALL") {
      if (statusFilter === "PENDING" && !["PENDING", "INITIATED"].includes(item.status)) {
        return false;
      }
      if (statusFilter === "FAILED" && !["FAILED", "CANCELLED"].includes(item.status)) {
        return false;
      }
      if (
        statusFilter === "REFUNDED" &&
        !["REFUNDED", "PARTIALLY_REFUNDED"].includes(item.status)
      ) {
        return false;
      }
      if (statusFilter === "SUCCESS" && item.status !== "SUCCESS") {
        return false;
      }
    }

    // Search query matching
    const q = search.toLowerCase().trim();
    if (q) {
      const matchOrder = item.orderNumber.toLowerCase().includes(q);
      const matchName = item.customerName.toLowerCase().includes(q);
      const matchEmail = item.customerEmail.toLowerCase().includes(q);
      const matchPhone = item.customerPhone?.toLowerCase().includes(q);
      const matchTrx = item.gatewayTransactionId?.toLowerCase().includes(q);
      const matchRef = item.merchantReferenceId?.toLowerCase().includes(q);
      if (
        !matchOrder &&
        !matchName &&
        !matchEmail &&
        !matchPhone &&
        !matchTrx &&
        !matchRef
      ) {
        return false;
      }
    }

    return true;
  });

  const visiblePayments = filteredPayments.slice(0, visibleCount);
  const hasMore = visiblePayments.length < filteredPayments.length;

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + 25, filteredPayments.length));
      setIsLoadingMore(false);
    }, 200);
  };

  const getGatewayBadge = (gateway: string) => {
    const gw = gateway.toUpperCase();
    if (gw === "BKASH") {
      return (
        <Badge className="border border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100 font-semibold text-xs gap-1">
          <Smartphone className="size-3" />
          bKash
        </Badge>
      );
    }
    if (gw === "NAGAD") {
      return (
        <Badge className="border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 font-semibold text-xs gap-1">
          <Smartphone className="size-3" />
          Nagad
        </Badge>
      );
    }
    if (gw === "SSLCOMMERZ" || gw === "ONLINE") {
      return (
        <Badge className="border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 font-semibold text-xs gap-1">
          <CreditCard className="size-3" />
          SSLCommerz
        </Badge>
      );
    }
    if (gw === "COD") {
      return (
        <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold text-xs gap-1">
          <Banknote className="size-3" />
          Cash on Delivery
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs">
        {gateway}
      </Badge>
    );
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case "SUCCESS":
        return (
          <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold text-xs gap-1">
            <CheckCircle2 className="size-3 text-emerald-600" />
            SUCCESS
          </Badge>
        );
      case "INITIATED":
      case "PENDING":
        return (
          <Badge className="border border-amber-200 bg-amber-50 text-amber-800 font-semibold text-xs gap-1">
            <Clock className="size-3 text-amber-600" />
            {status}
          </Badge>
        );
      case "FAILED":
      case "CANCELLED":
        return (
          <Badge className="border border-rose-200 bg-rose-50 text-rose-800 font-semibold text-xs gap-1">
            <XCircle className="size-3 text-rose-600" />
            {status}
          </Badge>
        );
      case "REFUNDED":
      case "PARTIALLY_REFUNDED":
        return (
          <Badge className="border border-purple-200 bg-purple-50 text-purple-800 font-semibold text-xs gap-1">
            <RotateCcw className="size-3 text-purple-600" />
            {status}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {status}
          </Badge>
        );
    }
  };

  const formatCurrency = (val: number) => {
    const [intPart, decPart] = val.toFixed(2).split(".");
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `৳${grouped}.${decPart}`;
  };

  // Calculate live counts for Status Tabs
  const allCount = initialPayments.length;
  const successCount = initialPayments.filter((p) => p.status === "SUCCESS").length;
  const pendingCount = initialPayments.filter((p) =>
    ["PENDING", "INITIATED"].includes(p.status)
  ).length;
  const failedCount = initialPayments.filter((p) =>
    ["FAILED", "CANCELLED"].includes(p.status)
  ).length;
  const refundedCount = initialPayments.filter((p) =>
    ["REFUNDED", "PARTIALLY_REFUNDED"].includes(p.status)
  ).length;

  const statusTabs: AdminTableTabItem<string>[] = [
    { key: "ALL", label: "All", count: allCount },
    { key: "SUCCESS", label: "Success", count: successCount, dotColor: "bg-emerald-500" },
    { key: "PENDING", label: "Pending", count: pendingCount, dotColor: "bg-amber-500" },
    { key: "FAILED", label: "Failed", count: failedCount, dotColor: "bg-rose-500" },
    { key: "REFUNDED", label: "Refunded", count: refundedCount, dotColor: "bg-purple-500" },
  ];

  const hasActiveFilters = Boolean(
    search.trim() || gatewayFilter !== "ALL" || statusFilter !== "ALL"
  );

  const handleResetFilters = () => {
    setSearch("");
    setGatewayFilter("ALL");
    setStatusFilter("ALL");
    setVisibleCount(25);
  };

  const handleExportCsv = () => {
    exportToCsv({
      filename: `vibelock-payments-${new Date().toISOString().slice(0, 10)}`,
      headers: [
        "Transaction ID",
        "Merchant Ref",
        "Order Number",
        "Customer Name",
        "Customer Email",
        "Customer Phone",
        "Gateway",
        "Amount (BDT)",
        "Status",
        "Refunded Amount",
        "Date",
      ],
      rows: filteredPayments.map((p) => [
        p.gatewayTransactionId || "",
        p.merchantReferenceId || "",
        p.orderNumber,
        p.customerName,
        p.customerEmail,
        p.customerPhone || "",
        p.gateway,
        p.amount,
        p.status,
        p.refundedAmount,
        new Date(p.createdAt).toISOString().replace("T", " ").slice(0, 19),
      ]),
    });
  };

  return (
    <div className="space-y-4">
      {/* ── 1. Shared AdminTableTabs Pattern ── */}
      <AdminTableTabs
        tabs={statusTabs}
        activeKey={statusFilter}
        onChange={setStatusFilter}
      />

      {/* ── 2. Search & Toolbar Controls ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-md">
          <AdminTableSearchInput
            value={search}
            onChange={setSearch}
            onClear={() => setSearch("")}
            placeholder="Search by order #, transaction ID, customer, email, or phone..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Gateway Method Dropdown */}
          <AdminTableFilterSelect
            ariaLabel="Filter by payment gateway"
            value={gatewayFilter}
            onChange={setGatewayFilter}
            options={[
              { value: "ALL", label: "All Gateways" },
              { value: "BKASH", label: "bKash" },
              { value: "NAGAD", label: "Nagad" },
              { value: "SSLCOMMERZ", label: "SSLCommerz / Cards" },
              { value: "COD", label: "Cash on Delivery (COD)" },
            ]}
            icon={CreditCard}
          />

          {/* Column Visibility */}
          <AdminTableColumnVisibility<PaymentColumnKey>
            columns={paymentColumnOptions}
            visibleColumns={visibleColumns}
            onChange={handleColumnChange}
            onReset={handleColumnReset}
            buttonClassName={ADMIN_TABLE_CLASSES.buttonSecondary}
          />

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredPayments.length === 0}
            className={ADMIN_TABLE_CLASSES.buttonSecondary}
            title="Export filtered transactions to CSV"
          >
            <Download className="size-3.5 text-neutral-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Meta Counter & Active Filter Reset */}
      <AdminTableMetaBar
        currentCount={visiblePayments.length}
        totalFiltered={filteredPayments.length}
        totalCount={initialPayments.length}
        itemName="transaction"
        hasActiveFilters={hasActiveFilters}
        onResetFilters={handleResetFilters}
      />

      {/* ── Transactions Table ── */}
      <Table>
        <TableHeader>
          <TableRow>
            {visibleColumns.ref && <TableHead>Transaction / Ref</TableHead>}
            {visibleColumns.order && <TableHead>Order Number</TableHead>}
            {visibleColumns.customer && <TableHead>Customer</TableHead>}
            {visibleColumns.method && <TableHead>Method</TableHead>}
            {visibleColumns.amount && <TableHead className="text-right">Amount</TableHead>}
            {visibleColumns.status && <TableHead>Payment Status</TableHead>}
            {visibleColumns.date && <TableHead>Date</TableHead>}
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPayments.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={totalVisibleCols + 1}
                className="py-8 text-center text-xs text-neutral-500"
              >
                No payment transactions found matching the selected filters.
              </TableCell>
            </TableRow>
          ) : (
            visiblePayments.map((p) => {
              const trxDisplay =
                p.gatewayTransactionId || p.merchantReferenceId || p.id.slice(0, 8);

              return (
                <TableRow key={p.id}>
                  {/* Transaction Reference */}
                  {visibleColumns.ref && (
                    <TableCell>
                      <div>
                        <p className="font-mono text-xs font-semibold text-neutral-900">
                          {trxDisplay}
                        </p>
                        {p.gatewayTransactionId && p.merchantReferenceId && (
                          <p className="font-mono text-[10px] text-neutral-400">
                            Ref: {p.merchantReferenceId}
                          </p>
                        )}
                      </div>
                    </TableCell>
                  )}

                  {/* Order Reference */}
                  {visibleColumns.order && (
                    <TableCell>
                      <Link
                        href={`/admin/orders/${p.orderId}`}
                        className="font-semibold text-neutral-900 hover:text-[#00B4D8] hover:underline"
                      >
                        {p.orderNumber}
                      </Link>
                    </TableCell>
                  )}

                  {/* Customer */}
                  {visibleColumns.customer && (
                    <TableCell>
                      <div>
                        <p className="font-medium text-xs text-neutral-900">
                          {p.customerName}
                        </p>
                        <p className="text-[11px] text-neutral-500 flex items-center gap-1">
                          <Mail className="size-3 text-neutral-400" />
                          {p.customerEmail}
                        </p>
                        {p.customerPhone && (
                          <p className="text-[10px] text-neutral-400 flex items-center gap-1">
                            <Phone className="size-2.5 text-neutral-400" />
                            {p.customerPhone}
                          </p>
                        )}
                      </div>
                    </TableCell>
                  )}

                  {/* Method / Gateway */}
                  {visibleColumns.method && (
                    <TableCell>{getGatewayBadge(p.gateway)}</TableCell>
                  )}

                  {/* Amount */}
                  {visibleColumns.amount && (
                    <TableCell className="text-right font-semibold text-xs text-neutral-900">
                      {formatCurrency(p.amount)}
                      {p.refundedAmount > 0 && (
                        <p className="text-[10px] font-normal text-purple-600">
                          Refunded: {formatCurrency(p.refundedAmount)}
                        </p>
                      )}
                    </TableCell>
                  )}

                  {/* Status */}
                  {visibleColumns.status && (
                    <TableCell>{getStatusBadge(p.status)}</TableCell>
                  )}

                  {/* Date */}
                  {visibleColumns.date && (
                    <TableCell className="text-xs text-neutral-500 whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      <p className="text-[10px] text-neutral-400">
                        {new Date(p.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </TableCell>
                  )}

                  {/* Action */}
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/orders/${p.orderId}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-neutral-950 hover:underline"
                    >
                      <span>Order</span>
                      <ExternalLink className="size-3" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* ── Infinite Scroll Sentinel & Load More Controls ── */}
      <AdminTableInfiniteScroll
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={handleLoadMore}
        loadedCount={visiblePayments.length}
        totalCount={filteredPayments.length}
        itemName="transactions"
        filterSummary={
          filteredPayments.length !== initialPayments.length
            ? `filtered from ${initialPayments.length} total`
            : null
        }
      />
    </div>
  );
}

