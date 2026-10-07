import { Order, OrderItem } from "@prisma/client";
import { OrderSummary, OrderDetail, OrderItemSummary } from "./types";

type PrismaOrderWithItems = Order & {
  items: OrderItem[];
};

export function mapOrderItem(item: OrderItem): OrderItemSummary {
  return {
    id: item.id,
    productName: item.productName,
    sku: item.sku,
    size: item.size,
    color: item.color,
    unitPrice: Number(item.unitPrice),
    quantity: item.quantity,
    lineTotal: Number(item.lineTotal),
  };
}

export function mapOrderSummary(order: PrismaOrderWithItems): OrderSummary {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    total: Number(order.total),
    itemCount: order.items.reduce((acc, item) => acc + item.quantity, 0),
    previewItems: order.items.slice(0, 3).map(mapOrderItem),
  };
}

export function mapOrderDetail(order: PrismaOrderWithItems): OrderDetail {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,

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

    items: order.items.map(mapOrderItem),
  };
}
