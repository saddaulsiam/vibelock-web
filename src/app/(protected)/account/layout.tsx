import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import StorefrontLayout from "@/app/(storefront)/layout";
import { AccountShell } from "@/components/account/layout/account-shell";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  // Enforce at least CUSTOMER role (any authenticated user)
  const user = await requireRole("CUSTOMER");
  const now = new Date();

  const [profile, orderCount, returnCount, activeCoupons] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        name: true,
        email: true,
        emailVerified: true,
        image: true,
      },
    }),
    prisma.order.count({ where: { userId: user.id } }),
    prisma.returnRequest.count({ where: { order: { userId: user.id } } }),
    prisma.coupon.findMany({
      where: {
        isActive: true,
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: now }, endDate: null },
          { startDate: null, endDate: { gte: now } },
          { startDate: { lte: now }, endDate: { gte: now } },
        ],
      },
      select: { usageLimit: true, usageCount: true },
    }),
  ]);

  const couponsCount = activeCoupons.filter(
    (c) => c.usageLimit === null || c.usageCount < c.usageLimit
  ).length;

  const profileData = {
    name: profile?.name ?? user.name ?? null,
    email: profile?.email ?? user.email ?? "",
    emailVerified: profile?.emailVerified ?? null,
    image: profile?.image ?? null,
  };

  const navCounts = {
    orders: orderCount,
    coupons: couponsCount,
    returns: returnCount,
  };

  return (
    <StorefrontLayout>
      <AccountShell profile={profileData} navCounts={navCounts}>
        {children}
      </AccountShell>
    </StorefrontLayout>
  );
}
