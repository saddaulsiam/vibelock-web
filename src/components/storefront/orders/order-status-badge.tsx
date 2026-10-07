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
  const color = positive.includes(normalized)
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : negative.includes(normalized)
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : inProgress.includes(normalized)
        ? "border-[#00D9FF]/40 bg-[#00D9FF]/10 text-[#101114]"
        : "border-[#101114]/15 bg-[#F3F0E8] text-[#101114]";
  const label = normalized
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return (
    <Badge variant="outline" className={`h-6 rounded-sm px-2 font-medium ${color}`}>
      {label}
    </Badge>
  );
}
