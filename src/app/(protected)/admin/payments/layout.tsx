import { requireRole } from "@/lib/auth/authorization";

export default async function AdminPaymentsLayout({ children }: { children: React.ReactNode }) {
  await requireRole("MANAGER");
  return <>{children}</>;
}

