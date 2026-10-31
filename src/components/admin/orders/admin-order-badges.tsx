import { Badge } from "@/components/ui/badge";
import type { OrderStatus, PaymentStatus, SalesChannel } from "@prisma/client";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Globe,
  Package,
  Store,
  Truck,
  XCircle,
} from "lucide-react";

export function getOrderStatusBadge(status: OrderStatus | string) {
  switch (status) {
    case "PENDING":
      return (
        <Badge
          variant="outline"
          className="border-amber-300 bg-amber-50 font-semibold text-amber-800"
        >
          <Clock className="mr-1 size-3 text-amber-600" /> Pending
        </Badge>
      );
    case "CONFIRMED":
      return (
        <Badge variant="outline" className="border-blue-300 bg-blue-50 font-semibold text-blue-800">
          <CheckCircle2 className="mr-1 size-3 text-blue-600" /> Confirmed
        </Badge>
      );
    case "PROCESSING":
      return (
        <Badge
          variant="outline"
          className="border-indigo-300 bg-indigo-50 font-semibold text-indigo-800"
        >
          <Package className="mr-1 size-3 text-indigo-600" /> Processing
        </Badge>
      );
    case "SHIPPED":
      return (
        <Badge
          variant="outline"
          className="border-purple-300 bg-purple-50 font-semibold text-purple-800"
        >
          <Truck className="mr-1 size-3 text-purple-600" /> Shipped
        </Badge>
      );
    case "DELIVERED":
      return (
        <Badge
          variant="outline"
          className="border-emerald-300 bg-emerald-50 font-semibold text-emerald-800"
        >
          <CheckCircle2 className="mr-1 size-3 text-emerald-600" /> Delivered
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge
          variant="outline"
          className="border-neutral-300 bg-neutral-100 font-semibold text-neutral-700"
        >
          <XCircle className="mr-1 size-3 text-neutral-500" /> Cancelled
        </Badge>
      );
    case "RETURN_REQUESTED":
    case "RETURN_PROCESSING":
    case "RETURNED":
      return (
        <Badge
          variant="outline"
          className="border-orange-300 bg-orange-50 font-semibold text-orange-800"
        >
          <AlertCircle className="mr-1 size-3 text-orange-600" /> Return (
          {status.replace("RETURN_", "")})
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function getPaymentStatusBadge(status: PaymentStatus | string) {
  switch (status) {
    case "SUCCESS":
      return (
        <Badge
          variant="outline"
          className="border-emerald-300 bg-emerald-50 font-medium text-emerald-800"
        >
          <CheckCircle2 className="mr-1 size-3 text-emerald-600" /> Paid
        </Badge>
      );
    case "PENDING":
    case "INITIATED":
      return (
        <Badge
          variant="outline"
          className="border-amber-300 bg-amber-50 font-medium text-amber-800"
        >
          <Clock className="mr-1 size-3 text-amber-600" /> Unpaid
        </Badge>
      );
    case "FAILED":
      return (
        <Badge variant="outline" className="border-rose-300 bg-rose-50 font-medium text-rose-800">
          <AlertCircle className="mr-1 size-3 text-rose-600" /> Failed
        </Badge>
      );
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return (
        <Badge
          variant="outline"
          className="border-neutral-300 bg-neutral-50 font-medium text-neutral-700"
        >
          Refunded
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function getSalesChannelBadge(channel: SalesChannel | string) {
  if (channel === "POS") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
        <Store className="size-3 text-amber-600" /> POS Counter
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-800">
      <Globe className="size-3 text-neutral-600" /> Online Store
    </span>
  );
}

export function AdminOrderStatusBadge({ status }: { status: OrderStatus | string }) {
  return getOrderStatusBadge(status);
}

export function AdminPaymentStatusBadge({ status }: { status: PaymentStatus | string }) {
  return getPaymentStatusBadge(status);
}

export function generateWhatsAppUrl(
  phone: string,
  orderNumber: string,
  customerName?: string | null
): string {
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("880")) {
    // already has full BD country code
  } else if (clean.startsWith("0")) {
    clean = "88" + clean;
  } else if (clean.length === 10) {
    clean = "880" + clean;
  }
  const greeting = customerName ? `Hello ${customerName}` : "Hello";
  const message = `${greeting}, regarding your VibeLock order #${orderNumber}: `;
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}
