import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import StorefrontLayout from "@/app/(storefront)/layout";
import { AccountShell } from "@/components/account/layout/account-shell";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  // Enforce at least CUSTOMER role (any authenticated user)
  const user = await requireRole("CUSTOMER");

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      email: true,
      emailVerified: true,
      image: true,
    },
  });

  const profileData = {
    name: profile?.name ?? user.name ?? null,
    email: profile?.email ?? user.email ?? "",
    emailVerified: profile?.emailVerified ?? null,
    image: profile?.image ?? null,
  };

  return (
    <StorefrontLayout>
      <AccountShell profile={profileData}>
        {children}
      </AccountShell>
    </StorefrontLayout>
  );
}
