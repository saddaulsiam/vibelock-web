import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import { ProfileForm } from "@/components/account/profile-form";
import { NotificationPreferencesCard } from "@/components/account/notification-preferences-card";
import { AccountMembershipCard } from "@/components/account/account-membership-card";
import { getNotificationPreferences } from "@/lib/account/notification-actions";

export const metadata: Metadata = {
  title: "Profile & Account Settings | VibeLock",
  description: "Manage your personal profile, notification preferences, and account security.",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const sessionUser = await requireUser();

  const [user, notificationPrefs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        role: true,
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
    getNotificationPreferences(),
  ]);

  const latestPhone = user?.orders[0]?.customerPhone ?? null;
  const authProvider = user?.accounts[0]?.provider ?? "credentials";
  const userEmail = user?.email ?? sessionUser.email ?? "";
  const emailVerified = user?.emailVerified ?? null;
  const createdAt = user?.createdAt ?? new Date();
  const userId = user?.id ?? sessionUser.id;

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Personal & Contact Info Card */}
      <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
        <div className="mb-6 border-b border-[#101114]/10 pb-5">
          <h1 className="text-xl font-black tracking-tight text-[#101114] uppercase sm:text-2xl">
            Personal & Contact Info
          </h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Manage your personal profile, streetwear avatar, contact details, and display
            preferences.
          </p>
        </div>

        <ProfileForm
          initialName={user?.name ?? sessionUser.name ?? ""}
          email={userEmail}
          emailVerified={emailVerified}
          initialImage={user?.image ?? null}
          phone={latestPhone}
          createdAt={createdAt}
          authProvider={authProvider}
        />
      </div>

      {/* 2. Notification Preferences Card */}
      <NotificationPreferencesCard initialPreferences={notificationPrefs} />

      {/* 3. Account Membership & Login Security Card */}
      <AccountMembershipCard
        email={userEmail}
        emailVerified={emailVerified}
        createdAt={createdAt}
        authProvider={authProvider}
        userId={userId}
      />
    </div>
  );
}
