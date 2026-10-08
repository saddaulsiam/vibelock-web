import { OrderStatus, PaymentStatus } from "@prisma/client";

const orderTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "PROCESSING", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
  RETURN_REQUESTED: ["RETURN_PROCESSING"],
  RETURN_PROCESSING: ["RETURNED"],
  RETURNED: ["REFUNDED"],
  REFUNDED: [],
};

const paymentTransitions: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ["INITIATED", "FAILED", "CANCELLED"],
  INITIATED: ["SUCCESS", "FAILED", "CANCELLED"],
  SUCCESS: ["PARTIALLY_REFUNDED", "REFUNDED"],
  FAILED: [],
  CANCELLED: [],
  PARTIALLY_REFUNDED: ["REFUNDED"],
  REFUNDED: [],
};

export function getOrderStatusTransitionError(current: OrderStatus, next: OrderStatus) {
  if (current === next) return null;
  if (current === "DELIVERED" || current === "CANCELLED") {
    return `${current[0]}${current.slice(1).toLowerCase()} orders cannot be changed.`;
  }
  return orderTransitions[current].includes(next)
    ? null
    : `Order cannot transition from ${current} to ${next}.`;
}

export function getPaymentStatusTransitionError(current: PaymentStatus, next: PaymentStatus) {
  if (current === next) return null;
  return paymentTransitions[current].includes(next)
    ? null
    : `Payment cannot transition from ${current} to ${next}.`;
}

export function getAuthoritativePaymentStatus(
  payments: Array<{ status: PaymentStatus }>
): PaymentStatus {
  if (payments.some((payment) => payment.status === "REFUNDED")) return "REFUNDED";
  if (payments.some((payment) => payment.status === "PARTIALLY_REFUNDED")) {
    return "PARTIALLY_REFUNDED";
  }
  if (payments.some((payment) => payment.status === "SUCCESS")) return "SUCCESS";
  if (payments.some((payment) => payment.status === "INITIATED")) return "INITIATED";
  if (payments.some((payment) => payment.status === "FAILED")) return "FAILED";
  if (payments.some((payment) => payment.status === "CANCELLED")) return "CANCELLED";
  return "PENDING";
}
