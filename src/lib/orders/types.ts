import { OrderStatus, PaymentStatus, PaymentMethod } from "@prisma/client";

export type OrderItemSummary = {
  id: string;
  productName: string;
  sku: string;
  size: string | null;
  color: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type OrderSummary = {
  id: string;
  orderNumber: string;
  createdAt: Date;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  total: number;
  itemCount: number;
  previewItems: OrderItemSummary[];
};

export type OrderConfirmation = Pick<
  OrderSummary,
  "orderNumber" | "createdAt" | "status" | "paymentStatus" | "paymentMethod"
> & {
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discount: number;
  total: number;
  items: Pick<
    OrderItemSummary,
    "productName" | "size" | "color" | "unitPrice" | "quantity" | "lineTotal"
  >[];
};

export type OrderDetail = {
  id: string;
  orderNumber: string;
  createdAt: Date;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;

  // Financials
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discount: number;
  total: number;

  // Customer & Shipping
  customerName: string | null;
  customerEmail: string;
  customerPhone: string | null;
  shippingStreet: string;
  shippingCity: string;
  shippingState: string | null;
  shippingZip: string | null;
  shippingCountry: string;
  shippingMethodName: string;

  items: OrderItemSummary[];

  // Return & Refund Info
  returnRequests: {
    id: string;
    status: string;
    createdAt: Date;
    items: {
      orderItemId: string;
      quantity: number;
    }[];
  }[];
  refunds: {
    id: string;
    status: string;
    amount: number;
    createdAt: Date;
  }[];
  isReturnable: boolean;
  shipment: {
    id: string;
    status: string;
    provider: string;
    trackingNumber: string | null;
    shippedAt: Date | null;
    deliveredAt: Date | null;
  } | null;
};
