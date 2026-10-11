import "server-only";

import { Prisma, OrderStatus, PaymentStatus, ShipmentStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import { resolveReportRange, ReportRange } from "@/lib/admin/report-queries";

export type ReconciliationClassification =
  | "ONLINE_SETTLED"
  | "ONLINE_REFUNDED"
  | "ONLINE_PENDING"
  | "ONLINE_CANCELLED"
  | "COD_DELIVERED"
  | "COD_IN_FLIGHT"
  | "COD_FAILED_RETURNED"
  | "COD_CANCELLED"
  | "ANOMALY";

export type ReconciliationFilter = {
  range?: string;
  from?: string;
  to?: string;
  classification?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type OrderClassificationBucket = {
  classification: ReconciliationClassification;
  label: string;
  orderCount: number;
  billedTotal: number;
  description: string;
};

export type GatewayTransactionSummary = {
  grossCapturedOnline: number;
  capturedOnlineTransactionsCount: number;
  processedRefundsTotal: number;
  processedRefundsCount: number;
  netGatewayCaptured: number;
};

export type CodSummary = {
  deliveredUnremittedBilledTotal: number;
  deliveredUnremittedOrderCount: number;
  inFlightBilledTotal: number;
  inFlightOrderCount: number;
  failedOrReturnedBilledTotal: number;
  failedOrReturnedOrderCount: number;
};

export type ReconciliationSummary = {
  range: ReportRange;
  start: Date;
  end: Date;
  totalOrders: number;
  totalBilledAmount: number;
  gateway: GatewayTransactionSummary;
  cod: CodSummary;
  classificationBuckets: OrderClassificationBucket[];
  anomaliesCount: number;
  anomaliesBilledTotal: number;
  // Financial completeness declarations (strictly null where unrecorded)
  courierExpense: null;
  gatewayMdrFees: null;
  operatingExpense: null;
  netBankPayout: null;
};

export type ReconciliationOrderItem = {
  id: string;
  orderNumber: string;
  createdAt: Date;
  customerName: string | null;
  customerEmail: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  billedTotal: number;
  successfulPaymentTotal: number;
  successfulRefundTotal: number;
  shipmentProvider: string | null;
  shipmentStatus: ShipmentStatus | null;
  hasActiveReturn: boolean;
  classification: ReconciliationClassification;
  classificationLabel: string;
  anomalyReason: string | null;
};

export type ReconciliationResult = {
  summary: ReconciliationSummary;
  orders: ReconciliationOrderItem[];
  totalOrders: number;
  totalPages: number;
  page: number;
};

function money(value: unknown): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? Math.round((num + Number.EPSILON) * 100) / 100 : 0;
}

export function classifyOrder(order: {
  paymentMethod: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  successfulPaymentTotal: number;
  successfulRefundTotal: number;
  shipmentStatus: ShipmentStatus | null;
  shipmentId: string | null;
}): { classification: ReconciliationClassification; label: string; anomalyReason: string | null } {
  const isOnline = order.paymentMethod === "ONLINE";
  const hasSuccessfulPayment = order.successfulPaymentTotal > 0;
  const isFullyRefunded =
    hasSuccessfulPayment &&
    (order.successfulRefundTotal >= order.successfulPaymentTotal ||
      order.paymentStatus === "REFUNDED");
  const isDelivered = order.orderStatus === "DELIVERED" || order.shipmentStatus === "DELIVERED";
  const isShipmentFailedOrReturned =
    order.shipmentStatus === "RETURNED" || order.shipmentStatus === "FAILED";

  if (isOnline) {
    // Online Anomaly: Delivered without recorded payment, or cancelled with unrefunded payment
    if (isDelivered && !hasSuccessfulPayment && order.paymentStatus !== "SUCCESS") {
      return {
        classification: "ANOMALY",
        label: "Online Delivered Unpaid",
        anomalyReason: "Parcel was delivered but no successful online payment record exists.",
      };
    }
    if (order.orderStatus === "CANCELLED" && hasSuccessfulPayment && !isFullyRefunded) {
      return {
        classification: "ANOMALY",
        label: "Cancelled with Unrefunded Payment",
        anomalyReason: "Order was cancelled but online payment was not fully refunded.",
      };
    }
    if (isFullyRefunded) {
      return {
        classification: "ONLINE_REFUNDED",
        label: "Online Fully Refunded",
        anomalyReason: null,
      };
    }
    if (hasSuccessfulPayment) {
      return {
        classification: "ONLINE_SETTLED",
        label: "Online Paid (Gateway Capture)",
        anomalyReason: null,
      };
    }
    if (order.orderStatus === "CANCELLED") {
      return {
        classification: "ONLINE_CANCELLED",
        label: "Online Cancelled (Unpaid)",
        anomalyReason: null,
      };
    }
    return {
      classification: "ONLINE_PENDING",
      label: "Online Payment Pending",
      anomalyReason: null,
    };
  }

  // COD branch
  if (order.paymentStatus === "SUCCESS" && !hasSuccessfulPayment) {
    return {
      classification: "ANOMALY",
      label: "COD Marked Paid Without Payment",
      anomalyReason: "COD order is marked SUCCESS in status without recorded payment transaction.",
    };
  }
  if (
    isShipmentFailedOrReturned ||
    (order.orderStatus === "CANCELLED" && order.shipmentId !== null)
  ) {
    return {
      classification: "COD_FAILED_RETURNED",
      label: "COD Refused / Returned by Courier",
      anomalyReason: null,
    };
  }
  if (order.orderStatus === "CANCELLED") {
    return {
      classification: "COD_CANCELLED",
      label: "COD Cancelled (Pre-Shipment)",
      anomalyReason: null,
    };
  }
  if (isDelivered) {
    return {
      classification: "COD_DELIVERED",
      label: "COD Delivered (Remittance Unverified)",
      anomalyReason: null,
    };
  }
  return {
    classification: "COD_IN_FLIGHT",
    label: "COD Awaiting Delivery (In-Flight)",
    anomalyReason: null,
  };
}

export async function getAdminReconciliation(
  filters: ReconciliationFilter = {}
): Promise<ReconciliationResult> {
  await requireRole("ADMIN");

  const { start, end, range } = resolveReportRange({
    range: filters.range,
    from: filters.from,
    to: filters.to,
  });

  const page = Number.isInteger(filters.page) && (filters.page ?? 0) > 0 ? filters.page! : 1;
  const limit = Number.isInteger(filters.limit) && (filters.limit ?? 0) > 0 ? filters.limit! : 25;
  const search = filters.search?.trim();

  // Single-pass CTE query aggregating without Cartesian joins
  const baseCte = Prisma.sql`
    WITH filtered_orders AS (
      SELECT o.*
      FROM "Order" o
      WHERE o."createdAt" >= ${start}
        AND o."createdAt" < ${end}
    ),
    order_payments AS (
      SELECT
        p."orderId",
        COALESCE(SUM(CASE WHEN p.status IN ('SUCCESS'::"PaymentStatus", 'PARTIALLY_REFUNDED'::"PaymentStatus", 'REFUNDED'::"PaymentStatus") THEN p.amount ELSE 0 END), 0)::float8 AS successful_payments_total,
        COUNT(CASE WHEN p.status IN ('SUCCESS'::"PaymentStatus", 'PARTIALLY_REFUNDED'::"PaymentStatus", 'REFUNDED'::"PaymentStatus") THEN 1 END)::int AS successful_payments_count,
        COALESCE(SUM(p.amount), 0)::float8 AS total_payments_amount,
        COUNT(*)::int AS total_payments_count
      FROM "Payment" p
      INNER JOIN filtered_orders fo ON fo.id = p."orderId"
      GROUP BY p."orderId"
    ),
    order_refunds AS (
      SELECT
        p."orderId",
        COALESCE(SUM(CASE WHEN r.status = 'SUCCESS'::"RefundStatus" THEN r.amount ELSE 0 END), 0)::float8 AS successful_refunds_total,
        COUNT(CASE WHEN r.status = 'SUCCESS'::"RefundStatus" THEN 1 END)::int AS successful_refunds_count
      FROM "Refund" r
      INNER JOIN "Payment" p ON p.id = r."paymentId"
      INNER JOIN filtered_orders fo ON fo.id = p."orderId"
      GROUP BY p."orderId"
    ),
    order_returns AS (
      SELECT
        rr."orderId",
        BOOL_OR(rr.status <> 'REJECTED'::"ReturnRequestStatus") AS has_active_return
      FROM "ReturnRequest" rr
      INNER JOIN filtered_orders fo ON fo.id = rr."orderId"
      GROUP BY rr."orderId"
    )
  `;

  // Fetch all orders with pre-aggregated payment and refund sums to build classification buckets
  const rawOrders = await prisma.$queryRaw<
    {
      id: string;
      orderNumber: string;
      createdAt: Date;
      customerName: string | null;
      customerEmail: string;
      orderStatus: OrderStatus;
      paymentStatus: PaymentStatus;
      paymentMethod: string;
      total: number;
      successfulPaymentTotal: number;
      successfulRefundTotal: number;
      successfulPaymentCount: number;
      successfulRefundCount: number;
      shipmentId: string | null;
      shipmentProvider: string | null;
      shipmentStatus: ShipmentStatus | null;
      hasActiveReturn: boolean | null;
    }[]
  >(Prisma.sql`
    ${baseCte}
    SELECT
      fo.id,
      fo."orderNumber",
      fo."createdAt",
      fo."customerName",
      fo."customerEmail",
      fo.status AS "orderStatus",
      fo."paymentStatus",
      fo."paymentMethod"::text AS "paymentMethod",
      fo.total::float8 AS total,
      COALESCE(op.successful_payments_total, 0)::float8 AS "successfulPaymentTotal",
      COALESCE(orf.successful_refunds_total, 0)::float8 AS "successfulRefundTotal",
      COALESCE(op.successful_payments_count, 0)::int AS "successfulPaymentCount",
      COALESCE(orf.successful_refunds_count, 0)::int AS "successfulRefundCount",
      s.id AS "shipmentId",
      s.provider AS "shipmentProvider",
      s.status AS "shipmentStatus",
      COALESCE(oret.has_active_return, false) AS "hasActiveReturn"
    FROM filtered_orders fo
    LEFT JOIN order_payments op ON op."orderId" = fo.id
    LEFT JOIN order_refunds orf ON orf."orderId" = fo.id
    LEFT JOIN order_returns oret ON oret."orderId" = fo.id
    LEFT JOIN "Shipment" s ON s."orderId" = fo.id
    ORDER BY fo."createdAt" DESC
  `);

  // Gateway transaction totals directly from the payment ledger in period
  const [gatewayAgg] = await prisma.$queryRaw<
    {
      grossCaptured: number;
      capturedCount: number;
      refundsTotal: number;
      refundsCount: number;
    }[]
  >(Prisma.sql`
    ${baseCte}
    SELECT
      COALESCE(SUM(op.successful_payments_total), 0)::float8 AS "grossCaptured",
      COALESCE(SUM(op.successful_payments_count), 0)::int AS "capturedCount",
      COALESCE(SUM(orf.successful_refunds_total), 0)::float8 AS "refundsTotal",
      COALESCE(SUM(orf.successful_refunds_count), 0)::int AS "refundsCount"
    FROM filtered_orders fo
    LEFT JOIN order_payments op ON op."orderId" = fo.id
    LEFT JOIN order_refunds orf ON orf."orderId" = fo.id
  `);

  // Classify each order into exactly one bucket
  const bucketMap: Record<
    ReconciliationClassification,
    { label: string; orderCount: number; billedTotal: number; description: string }
  > = {
    ONLINE_SETTLED: {
      label: "Online Paid (Gateway Capture)",
      orderCount: 0,
      billedTotal: 0,
      description: "Successful online gateway payment recorded. Subject to gateway settlement.",
    },
    ONLINE_REFUNDED: {
      label: "Online Fully Refunded",
      orderCount: 0,
      billedTotal: 0,
      description: "Online payment was fully refunded via payment gateway.",
    },
    ONLINE_PENDING: {
      label: "Online Payment Pending",
      orderCount: 0,
      billedTotal: 0,
      description: "Online checkout initiated or uncompleted; no successful capture recorded.",
    },
    ONLINE_CANCELLED: {
      label: "Online Cancelled (Unpaid)",
      orderCount: 0,
      billedTotal: 0,
      description: "Online order cancelled without successful payment capture.",
    },
    COD_DELIVERED: {
      label: "COD Delivered (Remittance Unverified)",
      orderCount: 0,
      billedTotal: 0,
      description: "Delivered to buyer; cash held by courier pending bank remittance.",
    },
    COD_IN_FLIGHT: {
      label: "COD Awaiting Delivery (In-Flight)",
      orderCount: 0,
      billedTotal: 0,
      description: "COD order in processing or transit; cash not yet collected.",
    },
    COD_FAILED_RETURNED: {
      label: "COD Refused / Returned by Courier",
      orderCount: 0,
      billedTotal: 0,
      description: "Courier delivery failed or parcel was returned. Zero cash collected.",
    },
    COD_CANCELLED: {
      label: "COD Cancelled (Pre-Shipment)",
      orderCount: 0,
      billedTotal: 0,
      description: "COD order cancelled prior to courier transit.",
    },
    ANOMALY: {
      label: "Reconciliation Anomaly",
      orderCount: 0,
      billedTotal: 0,
      description: "Discrepancy between delivery status and recorded payment state.",
    },
  };

  let codDeliveredTotal = 0;
  let codDeliveredCount = 0;
  let codInFlightTotal = 0;
  let codInFlightCount = 0;
  let codFailedTotal = 0;
  let codFailedCount = 0;
  let totalBilledSum = 0;

  const classifiedOrders: ReconciliationOrderItem[] = rawOrders.map((raw) => {
    const { classification, label, anomalyReason } = classifyOrder({
      paymentMethod: raw.paymentMethod,
      orderStatus: raw.orderStatus,
      paymentStatus: raw.paymentStatus,
      successfulPaymentTotal: raw.successfulPaymentTotal,
      successfulRefundTotal: raw.successfulRefundTotal,
      shipmentStatus: raw.shipmentStatus,
      shipmentId: raw.shipmentId,
    });

    const billed = money(raw.total);
    totalBilledSum += billed;

    bucketMap[classification].orderCount += 1;
    bucketMap[classification].billedTotal = money(bucketMap[classification].billedTotal + billed);

    if (classification === "COD_DELIVERED") {
      codDeliveredCount += 1;
      codDeliveredTotal = money(codDeliveredTotal + billed);
    } else if (classification === "COD_IN_FLIGHT") {
      codInFlightCount += 1;
      codInFlightTotal = money(codInFlightTotal + billed);
    } else if (classification === "COD_FAILED_RETURNED") {
      codFailedCount += 1;
      codFailedTotal = money(codFailedTotal + billed);
    }

    return {
      id: raw.id,
      orderNumber: raw.orderNumber,
      createdAt: raw.createdAt,
      customerName: raw.customerName,
      customerEmail: raw.customerEmail,
      orderStatus: raw.orderStatus,
      paymentStatus: raw.paymentStatus,
      paymentMethod: raw.paymentMethod,
      billedTotal: billed,
      successfulPaymentTotal: money(raw.successfulPaymentTotal),
      successfulRefundTotal: money(raw.successfulRefundTotal),
      shipmentProvider: raw.shipmentProvider,
      shipmentStatus: raw.shipmentStatus,
      hasActiveReturn: Boolean(raw.hasActiveReturn),
      classification,
      classificationLabel: label,
      anomalyReason,
    };
  });

  // Filter orders by classification or search for the table view
  let filteredList = classifiedOrders;

  if (filters.classification && filters.classification in bucketMap) {
    filteredList = filteredList.filter((item) => item.classification === filters.classification);
  }

  if (search) {
    const q = search.toLowerCase();
    filteredList = filteredList.filter(
      (item) =>
        item.orderNumber.toLowerCase().includes(q) ||
        item.customerEmail.toLowerCase().includes(q) ||
        (item.customerName && item.customerName.toLowerCase().includes(q))
    );
  }

  const totalFilteredOrders = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredOrders / limit));
  const offset = (page - 1) * limit;
  const paginatedOrders = filteredList.slice(offset, offset + limit);

  const grossCaptured = money(gatewayAgg?.grossCaptured);
  const refundsTotal = money(gatewayAgg?.refundsTotal);

  const summary: ReconciliationSummary = {
    range,
    start,
    end,
    totalOrders: rawOrders.length,
    totalBilledAmount: money(totalBilledSum),
    gateway: {
      grossCapturedOnline: grossCaptured,
      capturedOnlineTransactionsCount: Number(gatewayAgg?.capturedCount ?? 0),
      processedRefundsTotal: refundsTotal,
      processedRefundsCount: Number(gatewayAgg?.refundsCount ?? 0),
      netGatewayCaptured: money(grossCaptured - refundsTotal),
    },
    cod: {
      deliveredUnremittedBilledTotal: codDeliveredTotal,
      deliveredUnremittedOrderCount: codDeliveredCount,
      inFlightBilledTotal: codInFlightTotal,
      inFlightOrderCount: codInFlightCount,
      failedOrReturnedBilledTotal: codFailedTotal,
      failedOrReturnedOrderCount: codFailedCount,
    },
    classificationBuckets: (Object.keys(bucketMap) as ReconciliationClassification[]).map(
      (key) => ({
        classification: key,
        label: bucketMap[key].label,
        orderCount: bucketMap[key].orderCount,
        billedTotal: bucketMap[key].billedTotal,
        description: bucketMap[key].description,
      })
    ),
    anomaliesCount: bucketMap.ANOMALY.orderCount,
    anomaliesBilledTotal: bucketMap.ANOMALY.billedTotal,
    courierExpense: null,
    gatewayMdrFees: null,
    operatingExpense: null,
    netBankPayout: null,
  };

  return {
    summary,
    orders: paginatedOrders,
    totalOrders: totalFilteredOrders,
    totalPages,
    page,
  };
}
