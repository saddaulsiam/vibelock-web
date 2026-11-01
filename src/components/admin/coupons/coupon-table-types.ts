import type { ColumnOption } from "@/components/admin/shared";

export type CouponColumnKey = "benefit" | "usage" | "validity" | "status";

export const couponColumnOptions: ColumnOption<CouponColumnKey>[] = [
  { key: "benefit", label: "Discount Benefit" },
  { key: "usage", label: "Usage / Redemptions" },
  { key: "validity", label: "Validity Schedule" },
  { key: "status", label: "Status" },
];
