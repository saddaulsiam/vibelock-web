import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminProducts } from "@/lib/admin/catalog-queries";
import { AdminProductsTable } from "@/components/admin/admin-products-table";

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
      <header className="flex flex-col gap-4 border-b border-[#101114]/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.18em] uppercase">
            Catalog / Products
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-[#101114] sm:text-3xl">
            Products
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Search, filter, manage inventory stock, pricing, and publication status for all catalog
            items.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#101114] px-4 text-sm font-semibold text-white hover:bg-[#101114]/85 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
        >
          <Plus className="size-4" aria-hidden="true" /> New product
        </Link>
      </header>

      <Card className="overflow-visible rounded-sm border-[#101114]/10 bg-white shadow-none">
        <CardHeader className="border-b border-[#101114]/10 px-4 py-4 sm:px-5">
          <CardTitle className="text-base text-[#101114]">
            Catalog Inventory{" "}
            <span className="text-muted-foreground ml-1 font-normal">
              ({data.counts.total} items)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
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
        </CardContent>
      </Card>
    </div>
  );
}
