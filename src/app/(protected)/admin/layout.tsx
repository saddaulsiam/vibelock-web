import { requireRole } from "@/lib/auth/authorization";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Enforce ADMIN role
  await requireRole("ADMIN");

  return <>{children}</>;
}
