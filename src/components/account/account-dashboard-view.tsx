"use client";

import { AccountMetrics } from "./account-metrics";
import { AccountRecentOrders } from "./account-recent-orders";
import { AccountAddressesCard } from "./account-addresses-card";
import { AccountQuickActions } from "./account-quick-actions";
import { AccountCollectionBanner } from "./account-collection-banner";

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
    <div className="flex flex-col min-w-0">
      {/* 4 Summary Cards */}
      <AccountMetrics
        orderCount={account.orderCount}
        totalSpent={account.totalSpent}
        wishlistCount={0}
        activeCouponsCount={account.activeCouponsCount}
      />

      {/* Recent Orders Section */}
      <div className="mt-6">
        <AccountRecentOrders orders={account.recentOrders} />
      </div>

      {/* Bottom Two-Column: Shipping Addresses & Quick Actions */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <AccountAddressesCard
          addresses={account.addresses}
          userName={account.profile.name}
        />
        <AccountQuickActions />
      </div>

      {/* Collection Promotion Campaign Banner */}
      <AccountCollectionBanner />
    </div>
  );
}
