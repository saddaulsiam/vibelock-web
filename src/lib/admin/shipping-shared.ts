import { ShipmentStatus, PaymentMethod, PaymentStatus } from "@prisma/client";

export type ShipmentFilter = "all" | "in_transit" | "delivered" | "returned" | "pending";

export type ShipmentProviderFilter = "ALL" | "STEADFAST" | "MANUAL" | "PATHAO";

export interface AdminShipmentListItem {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string;
  customerPhone: string | null;
  shippingMethodName: string;
  shippingAmount: number;
  orderTotal: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  provider: string;
  providerShipmentId: string | null;
  trackingNumber: string | null;
  status: ShipmentStatus;
  failureReason: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  shippedAt: Date | string | null;
  deliveredAt: Date | string | null;
  cancelledAt: Date | string | null;
}

export interface AdminShippingKPIs {
  totalShipments: number;
  inTransitCount: number;
  deliveredCount: number;
  returnedOrFailedCount: number;
  pendingCodAmount: number;
  successRate: number;
  providerBreakdown: {
    steadfast: number;
    manual: number;
    other: number;
  };
}

export function isShipmentInTransit(status: ShipmentStatus): boolean {
  return (
    status === ShipmentStatus.IN_TRANSIT ||
    status === ShipmentStatus.OUT_FOR_DELIVERY ||
    status === ShipmentStatus.PICKED_UP ||
    status === ShipmentStatus.CREATED
  );
}

export function isShipmentReturnedOrFailed(status: ShipmentStatus): boolean {
  return (
    status === ShipmentStatus.RETURNED ||
    status === ShipmentStatus.FAILED ||
    status === ShipmentStatus.CANCELLED
  );
}

export function getShipmentStatusBadgeInfo(status: ShipmentStatus): {
  label: string;
  badgeClass: string;
  dotColor: string;
  tone: "neutral" | "emerald" | "blue" | "purple" | "cyan" | "rose" | "amber";
} {
  switch (status) {
    case ShipmentStatus.DELIVERED:
      return {
        label: "Delivered",
        badgeClass: "border-emerald-300 bg-emerald-50 text-emerald-800",
        dotColor: "bg-emerald-500",
        tone: "emerald",
      };
    case ShipmentStatus.OUT_FOR_DELIVERY:
      return {
        label: "Out for Delivery",
        badgeClass: "border-cyan-300 bg-cyan-50 text-cyan-800",
        dotColor: "bg-cyan-500 animate-pulse",
        tone: "cyan",
      };
    case ShipmentStatus.IN_TRANSIT:
      return {
        label: "In Transit",
        badgeClass: "border-purple-300 bg-purple-50 text-purple-800",
        dotColor: "bg-purple-500",
        tone: "purple",
      };
    case ShipmentStatus.PICKED_UP:
      return {
        label: "Picked Up",
        badgeClass: "border-indigo-300 bg-indigo-50 text-indigo-800",
        dotColor: "bg-indigo-500",
        tone: "blue",
      };
    case ShipmentStatus.CREATED:
      return {
        label: "Booked",
        badgeClass: "border-blue-300 bg-blue-50 text-blue-800",
        dotColor: "bg-blue-500",
        tone: "blue",
      };
    case ShipmentStatus.PENDING:
      return {
        label: "Pending Dispatch",
        badgeClass: "border-amber-300 bg-amber-50 text-amber-800",
        dotColor: "bg-amber-500",
        tone: "amber",
      };
    case ShipmentStatus.RETURNED:
      return {
        label: "Returned (RTO)",
        badgeClass: "border-rose-300 bg-rose-50 text-rose-800",
        dotColor: "bg-rose-500",
        tone: "rose",
      };
    case ShipmentStatus.FAILED:
      return {
        label: "Failed",
        badgeClass: "border-rose-300 bg-rose-50 text-rose-800",
        dotColor: "bg-rose-500",
        tone: "rose",
      };
    case ShipmentStatus.CANCELLED:
      return {
        label: "Cancelled",
        badgeClass: "border-neutral-300 bg-neutral-100 text-neutral-600",
        dotColor: "bg-neutral-400",
        tone: "neutral",
      };
    default:
      return {
        label: String(status),
        badgeClass: "border-neutral-200 bg-neutral-100 text-neutral-700",
        dotColor: "bg-neutral-400",
        tone: "neutral",
      };
  }
}
