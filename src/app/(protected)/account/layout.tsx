import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import StorefrontLayout from "@/app/(storefront)/layout";
import { AccountShell } from "@/components/account/account-shell";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  // Enforce at least CUSTOMER role (any authenticated user)
  const user = await requireRole("CUSTOMER");
  const now = new Date();

  const [profile, activeCoupons] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        name: true,
        email: true,
        emailVerified: true,
        image: true,
      },
    }),
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
      select: {
        id: true,
        code: true,
        discountType: true,
        discountValue: true,
        minOrderValue: true,
        endDate: true,
      },
    }),
  ]);

  const profileData = {
    name: profile?.name ?? user.name ?? null,
    email: profile?.email ?? user.email ?? "",
    emailVerified: profile?.emailVerified ?? null,
    image: profile?.image ?? null,
  };

  const couponData = activeCoupons.map((c) => ({
    id: c.id,
    code: c.code,
    discountType: c.discountType,
    discountValue: Number(c.discountValue),
    minOrderValue: c.minOrderValue ? Number(c.minOrderValue) : null,
    endDate: c.endDate,
  }));

  return (
    <StorefrontLayout>
      <AccountShell profile={profileData} coupons={couponData}>
        {children}
      </AccountShell>
    </StorefrontLayout>
  );
}
