import "server-only";

import type { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import { getCustomerRiskProfile, type CombinedCustomerRiskProfile } from "./customer-risk";
import type {
  AdminCustomerDetailOrder,
  AdminCustomerDetailResult,
  AdminCustomerReviewItem,
  AdminCustomerStaffNote,
} from "./customer-query-types";
import {
  buildCustomerTimeline,
  calculateCustomerPreferences,
  mapCustomerAbandonedCart,
  normalizePage,
} from "./customer-detail-helpers";

const DEFAULT_PAGE_SIZE = 20;
const paidStatuses = ["SUCCESS", "PARTIALLY_REFUNDED", "REFUNDED"] as const;
const returnedStatuses = ["RETURNED", "REFUNDED"] as const;

export async function getAdminCustomerById(
  id: string,
  page = 1
): Promise<AdminCustomerDetailResult | null> {
  await requireRole("ADMIN");

  const normalizedPage = normalizePage(page);
  const customer = await prisma.user.findFirst({
    where: { id, role: "CUSTOMER" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
      addresses: {
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          label: true,
          street: true,
          city: true,
          state: true,
          zip: true,
          country: true,
          isDefault: true,
        },
      },
    },
  });

  if (!customer) return null;

  const orderWhere: Prisma.OrderWhereInput = { userId: customer.id };
  const [
    ordersRaw,
    orderCount,
    paidSummary,
    cancelledCount,
    returnedCount,
    latestPhone,
    latestName,
  ] = await Promise.all([
    prisma.order.findMany({
      where: orderWhere,
      orderBy: { createdAt: "desc" },
      skip: (normalizedPage - 1) * DEFAULT_PAGE_SIZE,
      take: DEFAULT_PAGE_SIZE,
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        salesChannel: true,
        shippingCity: true,
        total: true,
        _count: { select: { items: true } },
        items: {
          take: 2,
          select: {
            productName: true,
            size: true,
          },
        },
      },
    }),
    prisma.order.count({ where: orderWhere }),
    prisma.order.aggregate({
      where: { ...orderWhere, paymentStatus: { in: [...paidStatuses] } },
      _count: true,
      _sum: { total: true },
    }),
    prisma.order.count({ where: { ...orderWhere, status: "CANCELLED" } }),
    prisma.order.count({
      where: {
        ...orderWhere,
        OR: [{ status: { in: [...returnedStatuses] } }, { paymentStatus: "REFUNDED" }],
      },
    }),
    prisma.order.findFirst({
      where: { ...orderWhere, customerPhone: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { customerPhone: true },
    }),
    prisma.order.findFirst({
      where: { ...orderWhere, customerName: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { customerName: true },
    }),
  ]);

  const resolvedPhone = customer.phone || latestPhone?.customerPhone || null;
  const resolvedName = customer.name || latestName?.customerName || null;

  // Retrieve fraud intelligence & courier risk profile
  let riskProfile: CombinedCustomerRiskProfile | null = null;
  try {
    riskProfile = await getCustomerRiskProfile({
      phone: resolvedPhone,
      email: customer.email,
      userId: customer.id,
    });
  } catch (err) {
    console.warn("[AdminCustomer] Risk evaluation failed:", err);
    riskProfile = null;
  }

  const totalSpent = Number(paidSummary._sum.total ?? 0);
  const aov = paidSummary._count > 0 ? Math.round(totalSpent / paidSummary._count) : 0;

  // Compute Shopping Preferences from all past order items
  const allOrderItems = await prisma.orderItem.findMany({
    where: { order: { userId: customer.id } },
    select: { productName: true, size: true, quantity: true },
  });

  const preferences = calculateCustomerPreferences({
    orderItems: allOrderItems,
    ordersRaw,
  });

  // Fetch Audit Logs, Cart, and Reviews in parallel
  const [allAuditLogs, cartData, reviewData] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        entityType: "Customer",
        entityId: customer.id,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        action: true,
        metadata: true,
        createdAt: true,
        actor: { select: { name: true, email: true } },
      },
    }),
    prisma.cart.findUnique({
      where: { userId: customer.id },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: {
                      where: { isPrimary: true },
                      take: 1,
                      select: { url: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.review.findMany({
      where: { userId: customer.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const staffNotes: AdminCustomerStaffNote[] = allAuditLogs
    .filter((log) => log.action === "CUSTOMER_STAFF_NOTE")
    .map((log) => {
      const meta =
        (log.metadata as { note?: string; authorName?: string; authorEmail?: string }) || {};
      return {
        id: log.id,
        note: meta.note || "",
        authorName: meta.authorName || log.actor?.name || "Staff Member",
        authorEmail: meta.authorEmail || log.actor?.email,
        createdAt: log.createdAt,
      };
    });

  const codStatusLog = allAuditLogs.find(
    (l) => l.action === "CUSTOMER_COD_RESTRICTED" || l.action === "CUSTOMER_COD_ALLOWED"
  );
  const isCodBlocked = codStatusLog?.action === "CUSTOMER_COD_RESTRICTED";
  const codBlockReason = isCodBlocked
    ? (codStatusLog?.metadata as { reason?: string })?.reason || "Restricted by store manager"
    : null;

  const suspensionLog = allAuditLogs.find(
    (l) => l.action === "CUSTOMER_ACCOUNT_SUSPENDED" || l.action === "CUSTOMER_ACCOUNT_ACTIVATED"
  );
  const isAccountSuspended = suspensionLog?.action === "CUSTOMER_ACCOUNT_SUSPENDED";
  const suspensionReason = isAccountSuspended
    ? (suspensionLog?.metadata as { reason?: string })?.reason ||
      "Account suspended by store manager"
    : null;

  const abandonedCart = mapCustomerAbandonedCart(cartData);

  // Map Reviews
  const reviews: AdminCustomerReviewItem[] = (reviewData || []).map((r) => ({
    id: r.id,
    productId: r.productId,
    productName: r.product.name,
    productSlug: r.product.slug,
    productImageUrl: r.product.images[0]?.url || null,
    rating: r.rating,
    comment: r.comment,
    verified: r.verified,
    createdAt: r.createdAt,
  }));

  const orders: AdminCustomerDetailOrder[] = ordersRaw.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    createdAt: o.createdAt,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: String(o.paymentMethod),
    salesChannel: String(o.salesChannel),
    shippingCity: o.shippingCity,
    total: o.total,
    itemCount: o._count.items,
    previewItems: o.items.map((item) => ({
      productName: item.productName,
      size: item.size,
    })),
  }));

  const timeline = buildCustomerTimeline({
    customer,
    ordersRaw,
    reviewData,
    allAuditLogs,
  });

  return {
    customer: {
      ...customer,
      name: resolvedName,
      phone: resolvedPhone,
    },
    orders,
    riskProfile,
    preferences,
    staffNotes,
    abandonedCart,
    reviews,
    timeline,
    isCodBlocked,
    codBlockReason,
    isAccountSuspended,
    suspensionReason,
    summary: {
      totalOrders: orderCount,
      paidOrders: paidSummary._count,
      totalSpent,
      aov,
      cancelledOrders: cancelledCount,
      returnedOrRefundedOrders: returnedCount,
    },
    totalOrderPages: Math.max(1, Math.ceil(orderCount / DEFAULT_PAGE_SIZE)),
    page: normalizedPage,
  };
}
