import { requireRole } from "@/lib/auth/authorization";
import { Container } from "@/components/shared/container";
import { AccountNavigation } from "@/components/storefront/layout/account-navigation";
import StorefrontLayout from "@/app/(storefront)/layout";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  // Enforce at least CUSTOMER role (any authenticated user)
  await requireRole("CUSTOMER");

  return (
    <StorefrontLayout>
      <div className="flex min-w-0 flex-1 flex-col bg-[#F3F0E8]">
        <header className="border-b border-[#101114]/10 bg-white">
          <Container className="py-4 sm:py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                VibeLock / Account
              </p>
              <AccountNavigation />
            </div>
          </Container>
        </header>
        <div className="flex-1">{children}</div>
      </div>
    </StorefrontLayout>
  );
}
