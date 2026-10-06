import { requireRole } from "@/lib/auth/authorization";

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  // Enforce at least MANAGER role
  await requireRole("MANAGER");

  return <>{children}</>;
}
