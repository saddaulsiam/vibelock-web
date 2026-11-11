"use client";

import { AccountMetrics } from "./account-metrics";
import { AccountRecentOrders } from "./account-recent-orders";

interface AccountDashboardViewProps {
  account: {
    orderCount: number;
    returnCount: number;
    addressCount: number;
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
    totalSpent: number;
    activeCouponsCount: number;
    recentOrders: Array<{
      id: string;
      orderNumber: string;
      createdAt: Date;
      status: string;
      paymentStatus: string;
      total: number;
      itemCount: number;
      items: Array<{
        id: string;
        productName: string;
        quantity: number;
        sku: string;
        unitPrice: number;
      }>;
    }>;
    profile: {
      name: string | null;
    };
  };
}

export function AccountDashboardView({ account }: AccountDashboardViewProps) {
  return (
    <div className="flex min-w-0 flex-col">
      {/* 4 Summary Cards */}
      <AccountMetrics
        orderCount={account.orderCount}
        totalSpent={account.totalSpent}
        wishlistCount={0}
        activeCouponsCount={account.activeCouponsCount}
      />

      {/* Recent Orders Section */}
      <AccountRecentOrders orders={account.recentOrders} />
    </div>
  );
}
