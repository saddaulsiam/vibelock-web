export type PosCustomerTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

export interface PosCustomerRecentOrder {
  orderNumber: string;
  createdAt: string;
  total: number;
  salesChannel: string;
  itemsCount: number;
}

export interface PosCustomerProfile {
  id?: string;
  phone: string;
  name: string;
  email?: string | null;
  ordersCount: number;
  totalSpent: number;
  lastVisitedAt?: string | null;
  tier: PosCustomerTier;
  loyaltyPoints: number; // 1 point per ৳100 spent
  pointsDiscountValue: number; // ৳1 per point
  recentOrders: PosCustomerRecentOrder[];
}

