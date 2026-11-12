import { requireRole } from "@/lib/auth/authorization";

export default async function AdminCategoriesLayout({ children }: { children: React.ReactNode }) {
  await requireRole("MANAGER");
  return <>{children}</>;
}
