import { requireRole } from "@/lib/auth/authorization";

export default async function AdminReviewsLayout({ children }: { children: React.ReactNode }) {
  await requireRole("MANAGER");
  return <>{children}</>;
}

