import Link from "next/link";
import { AlertTriangle, CheckCircle2, Layers, PackageX, Plus } from "lucide-react";
import { getAdminProducts } from "@/lib/admin/catalog-queries";
import { AdminProductsTable } from "@/components/admin/admin-products-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminKpiCard, AdminKpiGrid } from "@/components/admin/admin-kpi-card";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    category?: string;
    status?: string;
    stock?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const params = (await searchParams) ?? {};
  const q = params.q ?? "";
  const category = params.category ?? "all";
  const status = params.status ?? "all";
  const stock = params.stock ?? "all";
  const sort = params.sort ?? "newest";
  const page = Math.max(1, Number(params.page) || 1);

  const data = await getAdminProducts({
    search: q,
    category,
    status,
    stockStatus: stock,
    sort,
    page,
    pageSize: 15,
  });

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      {/* Harmonized Page Header */}
      <AdminPageHeader
        eyebrow="Catalog / Products"
        title="Products"
        badgeLabel="Catalog Engine"
        badgeVariant="blue"
        description="Search, filter, manage inventory stock, pricing, and publication status for all catalog items."
      >
        <Link
          href="/admin/products/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#101114] px-4 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-[#101114]/85 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
        >
          <Plus className="size-4" aria-hidden="true" />
          <span>New product</span>
        </Link>
      </AdminPageHeader>

      {/* Operational KPI Metric Cards */}
      <AdminKpiGrid columns={4}>
        <AdminKpiCard
          label="Total Products"
          value={data.counts.total.toLocaleString()}
          description={`Across ${data.allCategories.length} catalog categories`}
          icon={Layers}
          tone="neutral"
          alert={true}
          href="/admin/products"
        />

        <AdminKpiCard
          label="Active / Published"
          value={data.counts.published.toLocaleString()}
          description={`${data.counts.draft} draft, ${data.counts.archived} archived`}
          icon={CheckCircle2}
          tone="emerald"
          alert={true}
          href="/admin/products?status=PUBLISHED"
        />

        <AdminKpiCard
          label="Low Stock Alert"
          value={data.counts.lowStock.toLocaleString()}
          description="Items at or near reorder threshold"
          icon={AlertTriangle}
          tone="amber"
          alert={true}
          href="/admin/products?stock=low-stock"
        />

        <AdminKpiCard
          label="Out of Stock"
          value={data.counts.outOfStock.toLocaleString()}
          description="Catalog items with 0 available stock"
          icon={PackageX}
          tone="rose"
          alert={true}
          href="/admin/products?stock=out-of-stock"
        />
      </AdminKpiGrid>

      {/* Main Interactive Table */}
      <AdminProductsTable
        initialData={data}
        currentFilters={{
          q,
          category,
          status,
          stock,
          sort,
          page,
        }}
      />
    </div>
  );
}
