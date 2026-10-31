import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Folder,
  Layers,
  Megaphone,
  Package,
  Pencil,
  Plus,
  Sparkles,
} from "lucide-react";
import { AdminKpiCard, AdminKpiGrid } from "@/components/admin/shared";
import { AdminPageHeader } from "@/components/admin/shared";
import { CategoryProductsManager } from "@/components/admin/categories";
import { ADMIN_TABLE_CLASSES } from "@/lib/admin/shared";
import {
  getAdminAvailableProductsForCategory,
  getAdminCategoryDetail,
} from "@/lib/admin/catalog";

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

  const { category, products, banners, metrics } = detail;

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

      {/* ── Category Promotional Banners Hub ── */}
      <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Megaphone className="size-4 text-neutral-700" />
              <h2 className="text-base font-bold text-neutral-900">
                Promotional Banners
              </h2>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600">
                {banners.length} {banners.length === 1 ? "Banner" : "Banners"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-neutral-500">
              Campaign and promotional banners active for this category on the storefront.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/banners"
              className={ADMIN_TABLE_CLASSES.buttonSecondary}
            >
              <span>Manage All Banners</span>
            </Link>
            <Link
              href="/admin/banners/new"
              className={ADMIN_TABLE_CLASSES.buttonPrimary}
            >
              <Plus className="size-3.5" />
              <span>Create Banner</span>
            </Link>
          </div>
        </div>

        {banners.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50/50 p-6 text-center">
            <Megaphone className="mx-auto size-7 text-neutral-400" />
            <p className="mt-2 text-xs font-medium text-neutral-700">
              No promotional banners currently assigned to this category.
            </p>
            <p className="mt-1 text-[11px] text-neutral-400">
              Create a marketing banner in the Banners Hub and target &quot;{category.name}&quot; to display it on the storefront.
            </p>
            <div className="mt-3">
              <Link
                href="/admin/banners/new"
                className="inline-flex items-center gap-1.5 rounded-md bg-[#101114] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-neutral-800"
              >
                <Plus className="size-3.5" />
                <span>Create Campaign Banner</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="group relative flex flex-col overflow-hidden rounded-lg border border-neutral-200/90 bg-neutral-50/40 transition hover:border-neutral-300 hover:shadow-xs"
              >
                <div className="relative aspect-16/7 w-full overflow-hidden bg-neutral-100">
                  <Image
                    src={banner.imageUrl}
                    alt={banner.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-102"
                  />
                  <div className="absolute top-2 left-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-md ${
                        banner.isActive
                          ? "bg-emerald-500/90 text-white shadow-xs"
                          : "bg-neutral-800/80 text-white shadow-xs"
                      }`}
                    >
                      <span className={`size-1.5 rounded-full ${banner.isActive ? "bg-white" : "bg-neutral-400"}`} />
                      {banner.isActive ? "Active" : "Draft / Inactive"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between p-3.5">
                  <div>
                    <h3 className="line-clamp-1 text-xs font-bold text-neutral-900 group-hover:text-neutral-700">
                      {banner.title}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                      <span className="rounded bg-neutral-200/70 px-1.5 py-0.2 font-mono text-[10px] uppercase font-semibold text-neutral-700">
                        {banner.placement}
                      </span>
                      <span>Order #{banner.sortOrder}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-neutral-200/60 pt-2.5 text-xs">
                    <span className="text-[11px] text-neutral-400">
                      Targeted to {category.name}
                    </span>
                    <Link
                      href={`/admin/banners/${banner.id}/edit`}
                      className="inline-flex items-center gap-1 font-semibold text-neutral-900 underline underline-offset-4 hover:text-[#00D9FF]"
                    >
                      <span>Edit</span>
                      <ExternalLink className="size-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
