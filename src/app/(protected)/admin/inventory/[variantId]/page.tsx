import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { InventoryTransactionType } from "@prisma/client";
import { AdminInventoryDetail } from "@/components/admin/inventory/admin-inventory-detail";
import { getAdminInventoryDetail } from "@/lib/admin/inventory-queries";

export const metadata: Metadata = {
  title: "Variant Inventory Ledger | VibeLock Admin",
};

export default async function AdminInventoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ variantId: string }>;
  searchParams: Promise<{ page?: string; type?: string }>;
}) {
  const [{ variantId }, query] = await Promise.all([params, searchParams]);
  const rawPage = Number(query.page);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const type = (query.type as InventoryTransactionType | "ALL") || "ALL";

  const result = await getAdminInventoryDetail(variantId, { page, type });
  if (!result) notFound();

  return <AdminInventoryDetail data={result} />;
}
