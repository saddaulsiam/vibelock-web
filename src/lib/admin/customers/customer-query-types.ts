import type { OrderStatus, PaymentStatus } from "@prisma/client";
import type { CombinedCustomerRiskProfile } from "./customer-risk";

export type CustomerSegment = "ALL" | "REPEAT" | "SINGLE" | "LEADS";
export type CustomerSortBy = "newest" | "orders" | "spent" | "oldest";

export interface AdminCustomerSummaryKPIs {
  totalCustomers: number;
  activeBuyers: number;
  repeatBuyers: number;
  retentionRate: number; // percentage, e.g. 5.5
  totalLtv: number; // sum of authoritative paid order totals
}

export interface AdminCustomerListItem {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: Date;
  orderCount: number;
  paidOrderValue: number;
  latestOrderDate: Date | null;
  latestOrderStatus: OrderStatus | null;
  latestOrderNumber: string | null;
  tier: "VIP" | "REPEAT" | "SINGLE" | "LEAD";
}

export interface AdminCustomerDetailOrder {
  id: string;
  orderNumber: string;
  createdAt: Date;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  salesChannel: string;
  shippingCity: string | null;
  total: unknown;
  itemCount: number;
  previewItems: Array<{ productName: string; size: string | null }>;
}

export interface AdminCustomerPreferences {
  preferredSize: string | null;
  topSizes: Array<{ size: string; count: number }>;
  topProducts: Array<{ name: string; quantity: number }>;
  preferredChannel: string;
  preferredPayment: string;
  daysSinceLastOrder: number | null;
}

export interface AdminCustomerStaffNote {
  id: string;
  note: string;
  authorName: string;
  authorEmail?: string;
  createdAt: Date;
}

export interface AdminCustomerAbandonedCartItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantId: string;
  sku: string;
  size: string | null;
  color: string | null;
  price: number;
  quantity: number;
  imageUrl: string | null;
}

export interface AdminCustomerAbandonedCart {
  hasCart: boolean;
  updatedAt: Date | null;
  totalItems: number;
  subtotal: number;
  items: AdminCustomerAbandonedCartItem[];
}

export interface AdminCustomerReviewItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImageUrl: string | null;
  rating: number; // 1-5
  comment: string | null;
  verified: boolean;
  createdAt: Date;
}

export type AdminCustomerTimelineEventType =
  | "ACCOUNT_CREATED"
  | "ORDER_PLACED"
  | "STAFF_NOTE"
  | "REVIEW_SUBMITTED"
  | "COD_RESTRICTED"
  | "COD_ALLOWED"
  | "ACCOUNT_SUSPENDED"
  | "ACCOUNT_ACTIVATED"
  | "PASSWORD_RESET_SENT"
  | "PROFILE_UPDATED"
  | "OTHER";

export interface AdminCustomerTimelineEvent {
  id: string;
  type: AdminCustomerTimelineEventType;
  title: string;
  description?: string | null;
  timestamp: Date;
  badge?: string | null;
  badgeVariant?: "default" | "success" | "warning" | "destructive" | "purple" | "info";
  link?: string | null;
  linkLabel?: string | null;
  actorName?: string | null;
}

export interface AdminCustomerDetailResult {
  customer: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    createdAt: Date;
    updatedAt: Date;
    addresses: Array<{
      id: string;
      label: string | null;
      street: string;
      city: string;
      state: string | null;
      zip: string | null;
      country: string;
      isDefault: boolean;
    }>;
  };
  orders: AdminCustomerDetailOrder[];
  riskProfile: CombinedCustomerRiskProfile | null;
  preferences: AdminCustomerPreferences;
  staffNotes: AdminCustomerStaffNote[];
  abandonedCart: AdminCustomerAbandonedCart;
  reviews: AdminCustomerReviewItem[];
  timeline: AdminCustomerTimelineEvent[];
  isCodBlocked: boolean;
  codBlockReason?: string | null;
  isAccountSuspended: boolean;
  suspensionReason?: string | null;
  summary: {
    totalOrders: number;
    paidOrders: number;
    totalSpent: number;
    aov: number;
    cancelledOrders: number;
    returnedOrRefundedOrders: number;
  };
  totalOrderPages: number;
  page: number;
}

