import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import StorefrontLayout from "@/app/(storefront)/layout";
import { AccountShell } from "@/components/account/account-shell";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  // Enforce at least CUSTOMER role (any authenticated user)
  const user = await requireRole("CUSTOMER");
  const now = new Date();

  const [profile, activeCoupons, userReturnRequests] = await Promise.all([
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
        usageLimit: true,
        usageCount: true,
        endDate: true,
      },
    }),
    prisma.returnRequest.findMany({
      where: {
        order: {
          OR: [
            { userId: user.id },
            ...(user.email ? [{ customerEmail: user.email }] : []),
          ],
        },
      },
      select: { id: true },
    }),
  ]);

  // Extract user return request IDs
  const userReturnIds = userReturnRequests.map((r) => r.id);

  // Find store credit voucher codes issued specifically for this user's returns
  const userCreditAuditLogs =
    userReturnIds.length > 0
      ? await prisma.auditLog.findMany({
          where: {
            action: "STORE_CREDIT_ISSUED",
            entityType: "ReturnRequest",
            entityId: { in: userReturnIds },
          },
          select: { metadata: true },
        })
      : [];

  const userCreditCodes = new Set<string>();
  for (const log of userCreditAuditLogs) {
    const meta = (log.metadata as Record<string, unknown> | null) || {};
    if (meta.couponCode && typeof meta.couponCode === "string") {
      userCreditCodes.add(meta.couponCode.toUpperCase());
    }
  }

  // Filter out redeemed/exhausted coupons (usageCount >= usageLimit)
  // and isolate personal store credit vouchers (VL-CREDIT-) so only the rightful customer sees them
  const eligibleCoupons = activeCoupons.filter((c) => {
    // 1. Remove if redeemed/exhausted
    if (c.usageLimit !== null && c.usageCount >= c.usageLimit) {
      return false;
    }
    // 2. Personal store credit vouchers must belong to this customer
    if (c.code.toUpperCase().startsWith("VL-CREDIT-")) {
      return userCreditCodes.has(c.code.toUpperCase());
    }
    // 3. General public coupons
    return true;
  });

  const profileData = {
    name: profile?.name ?? user.name ?? null,
    email: profile?.email ?? user.email ?? "",
    emailVerified: profile?.emailVerified ?? null,
    image: profile?.image ?? null,
  };

  const couponData = eligibleCoupons.map((c) => ({
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
