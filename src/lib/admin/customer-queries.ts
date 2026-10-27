import "server-only";

import {
  getCustomerRiskProfile,
  type CombinedCustomerRiskProfile,
} from "@/lib/admin/customer-risk";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";

const DEFAULT_PAGE_SIZE = 20;
const paidStatuses: PaymentStatus[] = ["SUCCESS", "PARTIALLY_REFUNDED", "REFUNDED"];
const returnedStatuses: OrderStatus[] = ["RETURNED", "REFUNDED"];

export type CustomerSegment = "ALL" | "REPEAT" | "SINGLE" | "LEADS";
export type CustomerSortBy = "newest" | "orders" | "spent" | "oldest";

export interface AdminCustomerSummaryKPIs {
  totalCustomers: number;
  activeBuyers: number;
  repeatBuyers: number;
  retentionRate: number; // percentage, e.g. 5.5
  totalLtv: number; // sum of authoritative paid order totals
}

export interface AdminCustomerListItem {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: Date;
  orderCount: number;
  paidOrderValue: number;
  latestOrderDate: Date | null;
  latestOrderStatus: OrderStatus | null;
  latestOrderNumber: string | null;
  tier: "VIP" | "REPEAT" | "SINGLE" | "LEAD";
}

export interface AdminCustomerDetailOrder {
  id: string;
  orderNumber: string;
  createdAt: Date;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  salesChannel: string;
  shippingCity: string | null;
  total: unknown;
  itemCount: number;
  previewItems: Array<{ productName: string; size: string | null }>;
}

export interface AdminCustomerPreferences {
  preferredSize: string | null;
  topSizes: Array<{ size: string; count: number }>;
  topProducts: Array<{ name: string; quantity: number }>;
  preferredChannel: string;
  preferredPayment: string;
  daysSinceLastOrder: number | null;
}

export interface AdminCustomerStaffNote {
  id: string;
  note: string;
  authorName: string;
  authorEmail?: string;
  createdAt: Date;
}

export interface AdminCustomerAbandonedCartItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantId: string;
  sku: string;
  size: string | null;
  color: string | null;
  price: number;
  quantity: number;
  imageUrl: string | null;
}

export interface AdminCustomerAbandonedCart {
  hasCart: boolean;
  updatedAt: Date | null;
  totalItems: number;
  subtotal: number;
  items: AdminCustomerAbandonedCartItem[];
}

export interface AdminCustomerReviewItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImageUrl: string | null;
  rating: number; // 1-5
  comment: string | null;
  verified: boolean;
  createdAt: Date;
}

export type AdminCustomerTimelineEventType =
  | "ACCOUNT_CREATED"
  | "ORDER_PLACED"
  | "STAFF_NOTE"
  | "REVIEW_SUBMITTED"
  | "COD_RESTRICTED"
  | "COD_ALLOWED"
  | "ACCOUNT_SUSPENDED"
  | "ACCOUNT_ACTIVATED"
  | "PASSWORD_RESET_SENT"
  | "PROFILE_UPDATED"
  | "OTHER";

export interface AdminCustomerTimelineEvent {
  id: string;
  type: AdminCustomerTimelineEventType;
  title: string;
  description?: string | null;
  timestamp: Date;
  badge?: string | null;
  badgeVariant?: "default" | "success" | "warning" | "destructive" | "purple" | "info";
  link?: string | null;
  linkLabel?: string | null;
  actorName?: string | null;
}

export interface AdminCustomerDetailResult {
  customer: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    createdAt: Date;
    updatedAt: Date;
    addresses: Array<{
      id: string;
      label: string | null;
      street: string;
      city: string;
      state: string | null;
      zip: string | null;
      country: string;
      isDefault: boolean;
    }>;
  };
  orders: AdminCustomerDetailOrder[];
  riskProfile: CombinedCustomerRiskProfile | null;
  preferences: AdminCustomerPreferences;
  staffNotes: AdminCustomerStaffNote[];
  abandonedCart: AdminCustomerAbandonedCart;
  reviews: AdminCustomerReviewItem[];
  timeline: AdminCustomerTimelineEvent[];
  isCodBlocked: boolean;
  codBlockReason?: string | null;
  isAccountSuspended: boolean;
  suspensionReason?: string | null;
  summary: {
    totalOrders: number;
    paidOrders: number;
    totalSpent: number;
    aov: number;
    cancelledOrders: number;
    returnedOrRefundedOrders: number;
  };
  totalOrderPages: number;
  page: number;
}

function normalizePage(page: number) {
  return Number.isInteger(page) && page > 0 ? page : 1;
}

/**
 * Fetch executive overview KPIs for customer intelligence
 */
export async function getAdminCustomerSummaryKPIs(): Promise<AdminCustomerSummaryKPIs> {
  await requireRole("ADMIN");

  const [totalCustomers, activeBuyers, repeatGroup, paidAggregate] = await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({
      where: { role: "CUSTOMER", orders: { some: {} } },
    }),
    prisma.order.groupBy({
      by: ["userId"],
      where: { userId: { not: null } },
      having: { userId: { _count: { gte: 2 } } },
    }),
    prisma.order.aggregate({
      where: { paymentStatus: { in: paidStatuses } },
      _sum: { total: true },
    }),
  ]);

  const repeatBuyers = repeatGroup.length;
  const retentionRate =
    activeBuyers > 0 ? Math.round((repeatBuyers / activeBuyers) * 1000) / 10 : 0;
  const totalLtv = Number(paidAggregate._sum.total ?? 0);

  return {
    totalCustomers,
    activeBuyers,
    repeatBuyers,
    retentionRate,
    totalLtv,
  };
}

/**
 * Get paginated customers list with rich search, segmentation tabs, and sorting
 */
export async function getAdminCustomers({
  search,
  page = 1,
  segment = "ALL",
  sortBy = "newest",
  pageSize = DEFAULT_PAGE_SIZE,
}: {
  search?: string;
  page?: number;
  segment?: CustomerSegment;
  sortBy?: CustomerSortBy;
  pageSize?: number;
}) {
  await requireRole("ADMIN");

  const normalizedPage = normalizePage(page);
  const where: Prisma.UserWhereInput = { role: "CUSTOMER" };

  // 1. Text Search across user and order snapshot fields
  if (search?.trim()) {
    const value = search.trim();
    where.OR = [
      { name: { contains: value, mode: "insensitive" } },
      { email: { contains: value, mode: "insensitive" } },
      { phone: { contains: value, mode: "insensitive" } },
      { orders: { some: { customerPhone: { contains: value, mode: "insensitive" } } } },
      { orders: { some: { customerName: { contains: value, mode: "insensitive" } } } },
    ];
  }

  // 2. Segment filter handling
  if (segment === "REPEAT") {
    const repeatGroup = await prisma.order.groupBy({
      by: ["userId"],
      where: { userId: { not: null } },
      having: { userId: { _count: { gte: 2 } } },
    });
    const repeatUserIds = repeatGroup.map((g) => g.userId).filter(Boolean) as string[];
    where.id = { in: repeatUserIds };
  } else if (segment === "SINGLE") {
    const singleGroup = await prisma.order.groupBy({
      by: ["userId"],
      where: { userId: { not: null } },
      having: { userId: { _count: { equals: 1 } } },
    });
    const singleUserIds = singleGroup.map((g) => g.userId).filter(Boolean) as string[];
    where.id = { in: singleUserIds };
  } else if (segment === "LEADS") {
    where.orders = { none: {} };
  }

  // 3. Sorting configuration
  let orderBy: Prisma.UserOrderByWithRelationInput = { createdAt: "desc" };
  if (sortBy === "oldest") {
    orderBy = { createdAt: "asc" };
  } else if (sortBy === "orders") {
    orderBy = { orders: { _count: "desc" } };
  }

  const [users, total, segmentCounts] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      skip: (normalizedPage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        _count: { select: { orders: true } },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            customerPhone: true,
            customerName: true,
            createdAt: true,
            status: true,
            orderNumber: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
    Promise.all([
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.order
        .groupBy({
          by: ["userId"],
          where: { userId: { not: null } },
          having: { userId: { _count: { gte: 2 } } },
        })
        .then((res) => res.length),
      prisma.order
        .groupBy({
          by: ["userId"],
          where: { userId: { not: null } },
          having: { userId: { _count: { equals: 1 } } },
        })
        .then((res) => res.length),
      prisma.user.count({ where: { role: "CUSTOMER", orders: { none: {} } } }),
    ]).then(([allCount, repeatCount, singleCount, leadsCount]) => ({
      ALL: allCount,
      REPEAT: repeatCount,
      SINGLE: singleCount,
      LEADS: leadsCount,
    })),
  ]);

  // If sorted by spent, let's sort the loaded slice or sort in-memory
  const paidTotals = users.length
    ? await prisma.order.groupBy({
        by: ["userId"],
        where: {
          userId: { in: users.map((user) => user.id) },
          paymentStatus: { in: paidStatuses },
        },
        _sum: { total: true },
      })
    : [];

  const totalsByUserId = new Map(
    paidTotals.map((entry) => [entry.userId, Number(entry._sum.total ?? 0)])
  );

  let formattedCustomers: AdminCustomerListItem[] = users.map((user) => {
    const orderCount = user._count.orders;
    const paidOrderValue = totalsByUserId.get(user.id) ?? 0;
    const resolvedPhone = user.phone || user.orders[0]?.customerPhone || null;
    const resolvedName = user.name || user.orders[0]?.customerName || null;

    let tier: AdminCustomerListItem["tier"] = "LEAD";
    if (orderCount >= 3 || paidOrderValue >= 10000) {
      tier = "VIP";
    } else if (orderCount >= 2) {
      tier = "REPEAT";
    } else if (orderCount === 1) {
      tier = "SINGLE";
    }

    return {
      id: user.id,
      name: resolvedName,
      email: user.email,
      phone: resolvedPhone,
      createdAt: user.createdAt,
      orderCount,
      paidOrderValue,
      latestOrderDate: user.orders[0]?.createdAt ?? null,
      latestOrderStatus: user.orders[0]?.status ?? null,
      latestOrderNumber: user.orders[0]?.orderNumber ?? null,
      tier,
    };
  });

  if (sortBy === "spent") {
    formattedCustomers = formattedCustomers.sort((a, b) => b.paidOrderValue - a.paidOrderValue);
  }

  return {
    customers: formattedCustomers,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    page: normalizedPage,
    segmentCounts,
  };
}

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
      where: { ...orderWhere, paymentStatus: { in: paidStatuses } },
      _count: true,
      _sum: { total: true },
    }),
    prisma.order.count({ where: { ...orderWhere, status: "CANCELLED" } }),
    prisma.order.count({
      where: {
        ...orderWhere,
        OR: [{ status: { in: returnedStatuses } }, { paymentStatus: "REFUNDED" }],
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

  const sizeMap = new Map<string, number>();
  const productMap = new Map<string, number>();

  for (const item of allOrderItems) {
    if (item.size) {
      sizeMap.set(item.size, (sizeMap.get(item.size) || 0) + item.quantity);
    }
    productMap.set(item.productName, (productMap.get(item.productName) || 0) + item.quantity);
  }

  const sortedSizes = Array.from(sizeMap.entries())
    .map(([size, count]) => ({ size, count }))
    .sort((a, b) => b.count - a.count);

  const topProducts = Array.from(productMap.entries())
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 3);

  const channelMap = new Map<string, number>();
  const paymentMap = new Map<string, number>();

  for (const o of ordersRaw) {
    channelMap.set(o.salesChannel, (channelMap.get(o.salesChannel) || 0) + 1);
    paymentMap.set(String(o.paymentMethod), (paymentMap.get(String(o.paymentMethod)) || 0) + 1);
  }

  const preferredChannel =
    Array.from(channelMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "WEBSITE";
  const preferredPayment =
    Array.from(paymentMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "COD";

  const latestOrderDate = ordersRaw[0]?.createdAt ?? null;
  const daysSinceLastOrder = latestOrderDate
    ? Math.floor((Date.now() - new Date(latestOrderDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const preferences: AdminCustomerPreferences = {
    preferredSize: sortedSizes[0]?.size ?? null,
    topSizes: sortedSizes.slice(0, 4),
    topProducts,
    preferredChannel,
    preferredPayment,
    daysSinceLastOrder,
  };

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
      const meta = (log.metadata as { note?: string; authorName?: string; authorEmail?: string }) || {};
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
    ? ((codStatusLog?.metadata as { reason?: string })?.reason || "Restricted by store manager")
    : null;

  const suspensionLog = allAuditLogs.find(
    (l) => l.action === "CUSTOMER_ACCOUNT_SUSPENDED" || l.action === "CUSTOMER_ACCOUNT_ACTIVATED"
  );
  const isAccountSuspended = suspensionLog?.action === "CUSTOMER_ACCOUNT_SUSPENDED";
  const suspensionReason = isAccountSuspended
    ? ((suspensionLog?.metadata as { reason?: string })?.reason || "Account suspended by store manager")
    : null;

  // Map Abandoned Cart Items
  const cartItems: AdminCustomerAbandonedCartItem[] = (cartData?.items || []).map((ci) => {
    const unitPrice = Number(ci.variant.discountPrice ?? ci.variant.sellingPrice);
    return {
      id: ci.id,
      productId: ci.variant.productId,
      productName: ci.variant.product.name,
      productSlug: ci.variant.product.slug,
      variantId: ci.variantId,
      sku: ci.variant.sku,
      size: ci.variant.size,
      color: ci.variant.color,
      price: unitPrice,
      quantity: ci.quantity,
      imageUrl: ci.variant.product.images[0]?.url || null,
    };
  });

  const cartSubtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const cartTotalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const abandonedCart: AdminCustomerAbandonedCart = {
    hasCart: !!cartData && cartItems.length > 0,
    updatedAt: cartData?.updatedAt ?? null,
    totalItems: cartTotalItems,
    subtotal: cartSubtotal,
    items: cartItems,
  };

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

  // Build Unified 360 Activity Timeline
  const timeline: AdminCustomerTimelineEvent[] = [];

  // Account creation event
  timeline.push({
    id: `event-created-${customer.id}`,
    type: "ACCOUNT_CREATED",
    title: "Account Registered",
    description: "Customer joined VibeLock store",
    timestamp: customer.createdAt,
    badge: "Registration",
    badgeVariant: "info",
  });

  // Orders events
  for (const o of ordersRaw) {
    timeline.push({
      id: `event-order-${o.id}`,
      type: "ORDER_PLACED",
      title: `Placed Order #${o.orderNumber}`,
      description: `Total: ৳${Math.round(Number(o.total)).toLocaleString()} • ${o._count.items} item(s) • ${o.paymentMethod}`,
      timestamp: o.createdAt,
      badge: o.status,
      badgeVariant:
        o.status === "DELIVERED"
          ? "success"
          : o.status === "CANCELLED"
          ? "destructive"
          : "warning",
      link: `/admin/orders/${o.id}`,
      linkLabel: "View Order",
    });
  }

  // Reviews events
  for (const r of reviewData) {
    timeline.push({
      id: `event-review-${r.id}`,
      type: "REVIEW_SUBMITTED",
      title: `Reviewed "${r.product.name}"`,
      description: r.comment ? `"${r.comment}"` : `Rating: ${r.rating} / 5 stars`,
      timestamp: r.createdAt,
      badge: `⭐ ${r.rating}.0`,
      badgeVariant: "purple",
      link: `/products/${r.product.slug}`,
      linkLabel: "View Product",
    });
  }

  // Audit Logs events
  for (const log of allAuditLogs) {
    const meta = (log.metadata as Record<string, unknown>) || {};
    const actorName = log.actor?.name || "Staff Member";

    if (log.action === "CUSTOMER_STAFF_NOTE") {
      timeline.push({
        id: `event-audit-${log.id}`,
        type: "STAFF_NOTE",
        title: `Staff Note by ${actorName}`,
        description: typeof meta.note === "string" ? meta.note : "",
        timestamp: log.createdAt,
        badge: typeof meta.category === "string" ? meta.category : "Staff Note",
        badgeVariant: "default",
        actorName,
      });
    } else if (log.action === "CUSTOMER_COD_RESTRICTED") {
      timeline.push({
        id: `event-audit-${log.id}`,
        type: "COD_RESTRICTED",
        title: "COD Privilege Restricted",
        description: typeof meta.reason === "string" ? meta.reason : "Cash on delivery restricted",
        timestamp: log.createdAt,
        badge: "COD Blocked",
        badgeVariant: "destructive",
        actorName,
      });
    } else if (log.action === "CUSTOMER_COD_ALLOWED") {
      timeline.push({
        id: `event-audit-${log.id}`,
        type: "COD_ALLOWED",
        title: "COD Privilege Restored",
        description: "Cash on delivery unlocked for customer",
        timestamp: log.createdAt,
        badge: "COD Active",
        badgeVariant: "success",
        actorName,
      });
    } else if (log.action === "CUSTOMER_ACCOUNT_SUSPENDED") {
      timeline.push({
        id: `event-audit-${log.id}`,
        type: "ACCOUNT_SUSPENDED",
        title: "Account Login Suspended",
        description: typeof meta.reason === "string" ? meta.reason : "Login blocked by store admin",
        timestamp: log.createdAt,
        badge: "Suspended",
        badgeVariant: "destructive",
        actorName,
      });
    } else if (log.action === "CUSTOMER_ACCOUNT_ACTIVATED") {
      timeline.push({
        id: `event-audit-${log.id}`,
        type: "ACCOUNT_ACTIVATED",
        title: "Account Reactivated",
        description: "Customer login restored by store admin",
        timestamp: log.createdAt,
        badge: "Active",
        badgeVariant: "success",
        actorName,
      });
    } else if (log.action === "CUSTOMER_PASSWORD_RESET_EMAIL_SENT") {
      timeline.push({
        id: `event-audit-${log.id}`,
        type: "PASSWORD_RESET_SENT",
        title: "Password Reset Email Sent",
        description: `Sent to ${customer.email} by ${actorName}`,
        timestamp: log.createdAt,
        badge: "Security",
        badgeVariant: "info",
        actorName,
      });
    } else if (log.action === "CUSTOMER_PASSWORD_RESET_LINK_GENERATED") {
      timeline.push({
        id: `event-audit-${log.id}`,
        type: "PASSWORD_RESET_SENT",
        title: "WhatsApp Password Reset Link Generated",
        description: `24-hour reset link generated by ${actorName}`,
        timestamp: log.createdAt,
        badge: "WhatsApp Link",
        badgeVariant: "warning",
        actorName,
      });
    } else if (log.action === "CUSTOMER_PROFILE_UPDATED") {
      timeline.push({
        id: `event-audit-${log.id}`,
        type: "PROFILE_UPDATED",
        title: "Customer Profile Updated",
        description: `Details edited by ${actorName}`,
        timestamp: log.createdAt,
        badge: "Profile Edit",
        badgeVariant: "default",
        actorName,
      });
    }
  }

  // Sort timeline chronologically (latest events first)
  timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

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
