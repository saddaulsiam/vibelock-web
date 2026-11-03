import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import { ProfileHub } from "@/components/account/profile";
import { getCustomerAddresses } from "@/lib/account/queries";
import { getNotificationPreferences } from "@/lib/account/notification-actions";

export const metadata: Metadata = {
  title: "Profile & Account Settings | VibeLock",
  description: "Manage your personal profile, addresses, security, and notification preferences.",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const sessionUser = await requireUser();

  const [user, addresses, notificationPrefs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        accounts: {
          select: {
            provider: true,
          },
        },
        orders: {
          where: { customerPhone: { not: null } },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { customerPhone: true },
        },
      },
    }),
    getCustomerAddresses(),
    getNotificationPreferences(),
  ]);

  const latestPhone = user?.orders[0]?.customerPhone ?? null;
  const authProvider = user?.accounts[0]?.provider ?? "credentials";
  const userEmail = user?.email ?? sessionUser.email ?? "";
  const emailVerified = user?.emailVerified ?? null;
  const createdAt = user?.createdAt ?? new Date();
  const userId = user?.id ?? sessionUser.id;

  return (
    <ProfileHub
      user={{
        id: userId,
        name: user?.name ?? sessionUser.name ?? null,
        email: userEmail,
        emailVerified,
        image: user?.image ?? null,
        createdAt,
        authProvider,
        latestPhone: user?.phone ?? latestPhone,
      }}
      addresses={addresses}
      notificationPreferences={notificationPrefs}
    />
  );
}
