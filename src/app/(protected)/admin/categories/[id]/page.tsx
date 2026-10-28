import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Folder,
  Layers,
  Package,
  Pencil,
  Sparkles,
} from "lucide-react";
import { AdminKpiCard, AdminKpiGrid } from "@/components/admin/admin-kpi-card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CategoryProductsManager } from "@/components/admin/category-products-manager";
import { ADMIN_TABLE_CLASSES } from "@/lib/admin/admin-table-styles";
import {
  getAdminAvailableProductsForCategory,
  getAdminCategoryDetail,
} from "@/lib/admin/catalog-queries";

export default async function AdminCategoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [detail, availableProducts] = await Promise.all([
    getAdminCategoryDetail(id),
    getAdminAvailableProductsForCategory(id),
  ]);

  if (!detail) {
    notFound();
  }

  const { category, products, metrics } = detail;

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      {/* ── Page Header ── */}
      <AdminPageHeader
        eyebrow="Catalog / Category Hub"
        title={category.name}
        badgeLabel={category.isActive ? "Storefront Active" : "Storefront Hidden"}
        badgeVariant={category.isActive ? "emerald" : "amber"}
        description={
          category.description ||
          `Merchandising hub for "${category.name}". Manage product assignments, monitor stock availability, and curate category taxonomy.`
        }
      >
        <Link
          href="/admin/categories"
          className={ADMIN_TABLE_CLASSES.buttonSecondary}
        >
          <ArrowLeft className="size-3.5" />
          <span>All Categories</span>
        </Link>

        <a
          href={`/category/${category.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          title={`View "${category.name}" on live storefront`}
          className={ADMIN_TABLE_CLASSES.buttonSecondary}
        >
          <ExternalLink className="size-3.5" />
          <span>View on Store</span>
        </a>

        <Link
          href={`/admin/categories/${category.id}/edit`}
          className={ADMIN_TABLE_CLASSES.buttonPrimary}
        >
          <Pencil className="size-3.5" />
          <span>Edit Category</span>
        </Link>
      </AdminPageHeader>

      {/* ── Category KPI Grid ── */}
      <AdminKpiGrid columns={4}>
        <AdminKpiCard
          label="Assigned Products"
          value={metrics.totalProducts.toLocaleString()}
          description={`${metrics.inStockCount} in stock • ${metrics.outOfStockCount} out of stock`}
          icon={Package}
          tone="blue"
          alert={true}
        />
        <AdminKpiCard
          label="Total Stock Units"
          value={metrics.totalStockUnits.toLocaleString()}
          description="Total units across all variants"
          icon={Layers}
          tone="emerald"
          alert={true}
        />
        <AdminKpiCard
          label="Merchandising Priority"
          value={`#${category.sortOrder}`}
          description={
            category.sortOrder === 0
              ? "Standard priority (0)"
              : `Sort weight #${category.sortOrder}`
          }
          icon={Sparkles}
          tone="neutral"
          alert={true}
        />
        <AdminKpiCard
          label="Category Hierarchy"
          value={
            category.parent ? category.parent.name : "Root Department"
          }
          description={
            metrics.subCategoryCount > 0
              ? `${metrics.subCategoryCount} nested sub-categories`
              : category.parent
              ? `Child of ${category.parent.name}`
              : "Top-level department"
          }
          icon={Folder}
          tone="purple"
          alert={true}
        />
      </AdminKpiGrid>

      {/* ── Nested Sub-Categories Pill Grid (if any exist) ── */}
      {category.children.length > 0 && (
        <div className="rounded-xl border border-neutral-200/90 bg-white p-4 shadow-2xs">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-600">
              Sub-Categories in {category.name} ({category.children.length})
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {category.children.map((child) => (
              <Link
                key={child.id}
                href={`/admin/categories/${child.id}`}
                className="group inline-flex items-center gap-2 rounded-lg border border-neutral-200/90 bg-neutral-50/70 px-3 py-1.5 text-xs font-semibold text-neutral-800 transition hover:border-neutral-300 hover:bg-neutral-100"
              >
                <Folder className="size-3.5 text-neutral-400 group-hover:text-neutral-600" />
                <span>{child.name}</span>
                <span className="rounded bg-neutral-200/80 px-1.5 py-0.2 text-[10px] font-mono text-neutral-600">
                  {child.productCount} products
                </span>
                <span className="text-[10px] text-neutral-400 group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Product Merchandising & Assignment Manager ── */}
      <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
        <div className="mb-4">
          <h2 className="text-base font-bold text-neutral-900">
            Assigned Products Hub
          </h2>
          <p className="text-xs text-neutral-500">
            Assign products to this category, review stock status, and curate the merchandise displayed to customers.
          </p>
        </div>

        <CategoryProductsManager
          categoryId={category.id}
          categoryName={category.name}
          initialAssignedProducts={products}
          availableProducts={availableProducts}
        />
      </div>
    </div>
  );
}
