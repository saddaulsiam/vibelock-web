import { requireRole } from "@/lib/auth/authorization";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  // Enforce at least STAFF role
  await requireRole("STAFF");

  return <>{children}</>;
}
