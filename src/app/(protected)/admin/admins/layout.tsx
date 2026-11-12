import { requireRole } from "@/lib/auth/authorization";

export default async function AdminAdminsLayout({ children }: { children: React.ReactNode }) {
  await requireRole("ADMIN");
  return <>{children}</>;
}
