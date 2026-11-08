import { Badge } from "@/components/ui/badge";

interface OrderStatusBadgeProps {
  status: string;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const normalized = status.toUpperCase();
  const positive = ["SUCCESS", "DELIVERED", "APPROVED", "RECEIVED", "COMPLETED"];
  const negative = ["FAILED", "CANCELLED", "REJECTED", "REFUNDED", "RETURNED"];
  const inProgress = [
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "IN_TRANSIT",
    "OUT_FOR_DELIVERY",
    "PICKED_UP",
    "CREATED",
    "INITIATED",
    "RETURN_REQUESTED",
    "RETURN_PROCESSING",
    "PARTIALLY_REFUNDED",
  ];
  const pending = ["PENDING", "AWAITING_PAYMENT", "ON_HOLD", "PAYMENT_PENDING"];
  const variant = positive.includes(normalized)
    ? "success"
    : pending.includes(normalized)
      ? "warning"
      : negative.includes(normalized)
        ? "error"
        : inProgress.includes(normalized)
          ? "cyan"
          : "secondary";
  const label = normalized
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  const isPulse = inProgress.includes(normalized) || pending.includes(normalized);

  return (
    <Badge variant={variant} dot={isPulse ? "pulse" : true}>
      {label}
    </Badge>
  );
}
