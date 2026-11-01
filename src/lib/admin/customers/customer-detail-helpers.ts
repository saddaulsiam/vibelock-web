import type {
  AdminCustomerAbandonedCart,
  AdminCustomerAbandonedCartItem,
  AdminCustomerPreferences,
  AdminCustomerTimelineEvent,
} from "./customer-query-types";

export function normalizePage(page: number): number {
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function calculateCustomerPreferences({
  orderItems,
  ordersRaw,
}: {
  orderItems: Array<{ productName: string; size: string | null; quantity: number }>;
  ordersRaw: Array<{ salesChannel: string; paymentMethod: unknown; createdAt: Date }>;
}): AdminCustomerPreferences {
  const sizeMap = new Map<string, number>();
  const productMap = new Map<string, number>();

  for (const item of orderItems) {
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

  return {
    preferredSize: sortedSizes[0]?.size ?? null,
    topSizes: sortedSizes.slice(0, 4),
    topProducts,
    preferredChannel,
    preferredPayment,
    daysSinceLastOrder,
  };
}

export function mapCustomerAbandonedCart(
  cartData: {
    updatedAt: Date;
    items: Array<{
      id: string;
      variantId: string;
      quantity: number;
      variant: {
        productId: string;
        sku: string;
        size: string | null;
        color: string | null;
        sellingPrice: unknown;
        discountPrice: unknown;
        product: {
          name: string;
          slug: string;
          images: Array<{ url: string }>;
        };
      };
    }>;
  } | null
): AdminCustomerAbandonedCart {
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

  return {
    hasCart: !!cartData && cartItems.length > 0,
    updatedAt: cartData?.updatedAt ?? null,
    totalItems: cartTotalItems,
    subtotal: cartSubtotal,
    items: cartItems,
  };
}

export function buildCustomerTimeline({
  customer,
  ordersRaw,
  reviewData,
  allAuditLogs,
}: {
  customer: { id: string; email: string; createdAt: Date };
  ordersRaw: Array<{
    id: string;
    orderNumber: string;
    total: unknown;
    status: string;
    paymentMethod: unknown;
    createdAt: Date;
    _count: { items: number };
  }>;
  reviewData: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
    product: { name: string; slug: string };
  }>;
  allAuditLogs: Array<{
    id: string;
    action: string;
    metadata: unknown;
    createdAt: Date;
    actor: { name: string | null; email: string | null } | null;
  }>;
}): AdminCustomerTimelineEvent[] {
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
        o.status === "DELIVERED" ? "success" : o.status === "CANCELLED" ? "destructive" : "warning",
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

  return timeline;
}
