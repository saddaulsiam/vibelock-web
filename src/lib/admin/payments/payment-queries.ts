import "server-only";

import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import { PaymentStatus, Prisma } from "@prisma/client";

export interface AdminPaymentListItem {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  amount: number;
  gateway: string;
  status: PaymentStatus;
  merchantReferenceId: string | null;
  gatewayTransactionId: string | null;
  createdAt: Date;
  refundsCount: number;
  refundedAmount: number;
}

export interface AdminPaymentStats {
  totalRevenue: number;
  successCount: number;
  pendingCount: number;
  failedCount: number;
  refundedAmount: number;
}

export async function getAdminPaymentStats(): Promise<AdminPaymentStats> {
  await requireRole("ADMIN");

  const [
    gatewaySuccessSum,
    gatewaySuccessCount,
    gatewayPendingCount,
    gatewayFailedCount,
    refundsSum,
    codOrders,
  ] = await Promise.all([
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: "SUCCESS" },
    }),
    prisma.payment.count({ where: { status: "SUCCESS" } }),
    prisma.payment.count({ where: { status: { in: ["PENDING", "INITIATED"] } } }),
    prisma.payment.count({ where: { status: { in: ["FAILED", "CANCELLED"] } } }),
    prisma.refund.aggregate({
      _sum: { amount: true },
      where: { status: "SUCCESS" },
    }),
    prisma.order.findMany({
      where: {
        paymentMethod: "COD",
        payments: { none: {} },
      },
      select: {
        total: true,
        paymentStatus: true,
      },
    }),
  ]);

  let codSuccessRevenue = 0;
  let codSuccessCount = 0;
  let codPendingCount = 0;
  let codFailedCount = 0;

  for (const o of codOrders) {
    const val = Number(o.total || 0);
    if (o.paymentStatus === "SUCCESS") {
      codSuccessRevenue += val;
      codSuccessCount++;
    } else if (o.paymentStatus === "PENDING" || o.paymentStatus === "INITIATED") {
      codPendingCount++;
    } else if (o.paymentStatus === "FAILED" || o.paymentStatus === "CANCELLED") {
      codFailedCount++;
    }
  }

  const totalRevenue = Number(gatewaySuccessSum._sum?.amount || 0) + codSuccessRevenue;
  const successCount = gatewaySuccessCount + codSuccessCount;
  const pendingCount = gatewayPendingCount + codPendingCount;
  const failedCount = gatewayFailedCount + codFailedCount;
  const refundedAmount = Number(refundsSum._sum?.amount || 0);

  return {
    totalRevenue,
    successCount,
    pendingCount,
    failedCount,
    refundedAmount,
  };
}

export async function getAdminPayments(options?: {
  gateway?: string;
  status?: string;
  search?: string;
  take?: number;
}): Promise<AdminPaymentListItem[]> {
  await requireRole("ADMIN");

  const take = options?.take || 100;
  const search = options?.search?.trim();
  const gatewayFilter = options?.gateway?.toUpperCase();
  const statusFilter =
    options?.status && options.status !== "ALL"
      ? (options.status.toUpperCase() as PaymentStatus)
      : undefined;

  // 1. Fetch Online Gateway Payments
  const paymentWhere: Prisma.PaymentWhereInput = {};

  if (gatewayFilter && gatewayFilter !== "ALL" && gatewayFilter !== "COD") {
    paymentWhere.gateway = gatewayFilter;
  }

  if (statusFilter) {
    paymentWhere.status = statusFilter;
  }

  if (search) {
    paymentWhere.OR = [
      { merchantReferenceId: { contains: search, mode: "insensitive" } },
      { gatewayTransactionId: { contains: search, mode: "insensitive" } },
      { order: { orderNumber: { contains: search, mode: "insensitive" } } },
      { order: { customerName: { contains: search, mode: "insensitive" } } },
      { order: { customerEmail: { contains: search, mode: "insensitive" } } },
      { order: { customerPhone: { contains: search, mode: "insensitive" } } },
    ];
  }

  const onlinePaymentsPromise =
    gatewayFilter === "COD"
      ? Promise.resolve([])
      : prisma.payment.findMany({
          where: paymentWhere,
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                customerName: true,
                customerEmail: true,
                customerPhone: true,
              },
            },
            refunds: true,
          },
          orderBy: { createdAt: "desc" },
          take,
        });

  // 2. Fetch COD Orders (if not strictly filtered out)
  const codOrdersPromise =
    gatewayFilter && gatewayFilter !== "ALL" && gatewayFilter !== "COD"
      ? Promise.resolve([])
      : prisma.order.findMany({
          where: {
            paymentMethod: "COD",
            payments: { none: {} },
            ...(statusFilter ? { paymentStatus: statusFilter } : {}),
            ...(search
              ? {
                  OR: [
                    { orderNumber: { contains: search, mode: "insensitive" } },
                    { customerName: { contains: search, mode: "insensitive" } },
                    { customerEmail: { contains: search, mode: "insensitive" } },
                    { customerPhone: { contains: search, mode: "insensitive" } },
                  ],
                }
              : {}),
          },
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            total: true,
            paymentStatus: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take,
        });

  const [onlinePayments, codOrders] = await Promise.all([onlinePaymentsPromise, codOrdersPromise]);

  const items: AdminPaymentListItem[] = [];

  for (const p of onlinePayments) {
    const refunded = p.refunds.reduce((sum, r) => sum + Number(r.amount), 0);
    items.push({
      id: p.id,
      orderId: p.orderId,
      orderNumber: p.order?.orderNumber || "Unknown",
      customerName: p.order?.customerName || "Customer",
      customerEmail: p.order?.customerEmail || "N/A",
      customerPhone: p.order?.customerPhone || null,
      amount: Number(p.amount),
      gateway: p.gateway.toUpperCase(),
      status: p.status,
      merchantReferenceId: p.merchantReferenceId,
      gatewayTransactionId: p.gatewayTransactionId,
      createdAt: p.createdAt,
      refundsCount: p.refunds.length,
      refundedAmount: refunded,
    });
  }

  for (const o of codOrders) {
    items.push({
      id: `cod-${o.id}`,
      orderId: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName || "Customer",
      customerEmail: o.customerEmail || "N/A",
      customerPhone: o.customerPhone || null,
      amount: Number(o.total),
      gateway: "COD",
      status: o.paymentStatus,
      merchantReferenceId: `COD-${o.orderNumber}`,
      gatewayTransactionId: null,
      createdAt: o.createdAt,
      refundsCount: 0,
      refundedAmount: 0,
    });
  }

  // Sort unified items by newest first
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return items.slice(0, take);
}
