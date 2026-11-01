import type { ColumnOption } from "@/components/admin/shared";

export type OrderColumnKey =
  | "date"
  | "customer"
  | "items"
  | "total"
  | "payment"
  | "shipment"
  | "status";

export const orderColumnOptions: ColumnOption<OrderColumnKey>[] = [
  { key: "date", label: "Date & Channel" },
  { key: "customer", label: "Customer & Phone" },
  { key: "items", label: "Items Count" },
  { key: "total", label: "Total Amount" },
  { key: "payment", label: "Payment Info" },
  { key: "shipment", label: "Courier & Tracking" },
  { key: "status", label: "Order Status" },
];

export const DATE_RANGE_OPTIONS = [
  { value: "ALL", label: "All Time" },
  { value: "today", label: "Today (Live)" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
] as const;

export const SALES_CHANNEL_OPTIONS = [
  { value: "ALL", label: "All Channels" },
  { value: "WEBSITE", label: "Online Store (WEB)" },
  { value: "POS", label: "POS Counter" },
] as const;

export const PAYMENT_STATUS_OPTIONS = [
  { value: "ALL", label: "All Payment Statuses" },
  { value: "SUCCESS", label: "Paid (Success)" },
  { value: "PENDING", label: "Unpaid (Pending)" },
  { value: "FAILED", label: "Failed" },
  { value: "REFUNDED", label: "Refunded" },
] as const;

export const PAYMENT_METHOD_OPTIONS = [
  { value: "ALL", label: "All Payment Methods" },
  { value: "COD", label: "Cash on Delivery (COD)" },
  { value: "ONLINE", label: "Online Gateway" },
] as const;

