import { requireRole } from "@/lib/auth/authorization";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  // Enforce at least CUSTOMER role (any authenticated user)
  await requireRole("CUSTOMER");

  return <>{children}</>;
}
