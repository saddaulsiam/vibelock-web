import Link from "next/link";
import { Folder, FolderPlus, Layers, Package, Plus } from "lucide-react";
import { AdminKpiCard, AdminKpiGrid } from "@/components/admin/shared";
import { AdminPageHeader } from "@/components/admin/shared";
import { AdminCategoriesTable } from "@/components/admin/categories";
import { ADMIN_TABLE_CLASSES } from "@/lib/admin/shared";
import { getAdminCategories } from "@/lib/admin/catalog";

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories();

  const totalCategories = categories.length;
  const totalProducts = categories.reduce((sum, c) => sum + c._count.products, 0);
  const rootCategories = categories.filter((c) => !c.parentId).length;
  const subCategories = categories.filter((c) => Boolean(c.parentId)).length;

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      {/* ── Page Header ── */}
      <AdminPageHeader
        eyebrow="Catalog / Taxonomy"
        title="Category Taxonomy"
        badgeLabel="Catalog Hierarchy"
        badgeVariant="blue"
        description="Structure catalog navigation, manage parent/child hierarchy, monitor product counts, and curate category assets."
      >
        <Link href="/admin/categories/new" className={ADMIN_TABLE_CLASSES.buttonPrimary}>
          <Plus className="size-3.5" />
          <span>New Category</span>
        </Link>
      </AdminPageHeader>

      {/* ── KPI Overview Cards ── */}
      <AdminKpiGrid columns={4}>
        <AdminKpiCard
          label="Total Categories"
          value={totalCategories.toLocaleString()}
          description="Active catalog departments"
          icon={Layers}
          tone="neutral"
          alert={true}
        />
        <AdminKpiCard
          label="Catalog Products"
          value={totalProducts.toLocaleString()}
          description="Assigned across categories"
          icon={Package}
          tone="emerald"
          alert={true}
          href="/admin/products"
        />
        <AdminKpiCard
          label="Root Departments"
          value={rootCategories.toLocaleString()}
          description="Top-level primary tiers"
          icon={Folder}
          tone="blue"
          alert={true}
        />
        <AdminKpiCard
          label="Sub-Categories"
          value={subCategories.toLocaleString()}
          description="Nested child category nodes"
          icon={FolderPlus}
          tone="amber"
          alert={true}
        />
      </AdminKpiGrid>

      {/* ── Categories Table Component ── */}
      <AdminCategoriesTable initialCategories={categories} />
    </div>
  );
}
