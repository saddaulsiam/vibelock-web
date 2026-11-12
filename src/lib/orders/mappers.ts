import {
  Order,
  OrderItem,
  Payment,
  Refund,
  ReturnRequest,
  ReturnItem,
  Shipment,
} from "@prisma/client";
import { OrderSummary, OrderDetail, OrderItemSummary } from "./types";

type PrismaOrderWithItems = Order & {
  items: OrderItem[];
  payments?: Array<{ gateway: string } & Partial<Payment & { refunds: Refund[] }>>;
  returns?: (ReturnRequest & { items: ReturnItem[] })[];
  shipment?: Shipment | null;
  history?: { status: Order["status"]; notes: string | null; createdAt: Date }[];
};

export function mapOrderItem(item: OrderItem, imageUrl?: string | null): OrderItemSummary {
  return {
    id: item.id,
    productName: item.productName,
    sku: item.sku,
    size: item.size,
    color: item.color,
    unitPrice: Number(item.unitPrice),
    quantity: item.quantity,
    lineTotal: Number(item.lineTotal),
    imageUrl: imageUrl ?? null,
  };
}

export function mapOrderSummary(order: PrismaOrderWithItems): OrderSummary {
  const primaryGateway = order.payments?.[0]?.gateway;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    paymentGateway: primaryGateway || (order.paymentMethod === "COD" ? "COD" : "ONLINE"),
    total: Number(order.total),
    itemCount: order.items.reduce((acc, item) => acc + item.quantity, 0),
    previewItems: order.items.slice(0, 3).map((item) => mapOrderItem(item)),
    shipment: order.shipment
      ? {
          status: order.shipment.status,
          trackingNumber: order.shipment.trackingNumber,
        }
      : null,
  };
}

export function mapOrderDetail(
  order: PrismaOrderWithItems,
  imageBySku?: Map<string, string>
): OrderDetail {
  const primaryGateway = order.payments?.[0]?.gateway;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    paymentGateway: primaryGateway || (order.paymentMethod === "COD" ? "COD" : "ONLINE"),

    subtotal: Number(order.subtotal),
    shippingCost: Number(order.shippingCost),
    taxAmount: Number(order.taxAmount),
    discount: Number(order.discount),
    total: Number(order.total),

    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    shippingStreet: order.shippingStreet,
    shippingCity: order.shippingCity,
    shippingState: order.shippingState,
    shippingZip: order.shippingZip,
    shippingCountry: order.shippingCountry,
    shippingMethodName: order.shippingMethodName,

    items: order.items.map((item) => mapOrderItem(item, imageBySku?.get(item.sku) ?? null)),

    returnRequests:
      order.returns?.map((r) => ({
        id: r.id,
        status: r.status,
        createdAt: r.createdAt,
        items: r.items.map((i) => ({ orderItemId: i.orderItemId, quantity: i.quantity })),
      })) || [],

    refunds:
      order.payments?.flatMap(
        (p) =>
          p.refunds?.map((r) => ({
            id: r.id,
            status: r.status,
            amount: Number(r.amount),
            createdAt: r.createdAt,
          })) || []
      ) || [],

    // 3-Day Return Policy:
    // Only DELIVERED orders within 3 days (72h) of delivery are eligible for customer return.
    isReturnable: (() => {
      if (order.status !== "DELIVERED") return false;
      const deliveredAt =
        order.shipment?.deliveredAt ||
        order.history?.find((h) => h.status === "DELIVERED")?.createdAt ||
        order.updatedAt;
      const daysSinceDelivery =
        (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceDelivery <= 3;
    })(),
    shipment: order.shipment
      ? {
          id: order.shipment.id,
          status: order.shipment.status,
          provider: order.shipment.provider,
          trackingNumber: order.shipment.trackingNumber,
          shippedAt: order.shipment.shippedAt,
          deliveredAt: order.shipment.deliveredAt,
        }
      : null,
    history:
      order.history?.map((entry) => ({
        status: entry.status,
        notes: entry.notes,
        createdAt: entry.createdAt,
      })) || [],
  };
}
