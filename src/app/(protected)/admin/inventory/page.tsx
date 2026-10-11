import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle, Boxes, Download, Lock, PackageCheck, Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getAdminInventory,
  getAdminInventorySummary,
  type InventoryFilter,
} from "@/lib/admin/inventory-queries";

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function currency(value: unknown) {
  return `৳${Number(value).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function validFilter(value: string | undefined): InventoryFilter {
  return value === "in-stock" || value === "low-stock" || value === "out-of-stock" ? value : "all";
}

async function InventorySummarySection() {
  const summary = await getAdminInventorySummary();

  return (
    <div className="space-y-4">
      {summary.negativeStockCount > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold">Negative stock anomaly detected</p>
            <p className="mt-0.5 text-red-800">
              {summary.negativeStockCount}{" "}
              {summary.negativeStockCount === 1 ? "variant reports" : "variants report"} negative
              physical or available stock. Ledger transactions require review or stock adjustment
              reconciliation.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="rounded-xl border border-[#101114]/10 bg-white shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Physical Stock
            </CardTitle>
            <Boxes className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {summary.totalPhysicalStock.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Total physical units on hand ({summary.totalVariants.toLocaleString()} variants)
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-[#101114]/10 bg-white shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Reserved Stock
            </CardTitle>
            <Lock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {summary.totalReservedStock.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Active unexpired checkout reservations
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-[#101114]/10 bg-white shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Available Stock
            </CardTitle>
            <PackageCheck className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {summary.totalAvailableStock.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Physical stock minus active reservations
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-[#101114]/10 bg-white shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Est. Inventory Cost
            </CardTitle>
            <Coins className="size-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {currency(summary.estimatedCostValue)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Estimated: positive physical stock × current variant cost (not historical batch cost)
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-[#101114]/10 bg-white shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Low Stock Items
            </CardTitle>
            <AlertTriangle className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {summary.lowStockCount.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Available stock between 1 and 5 units ({summary.outOfStockCount.toLocaleString()} out
              of stock)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function InventoryTable({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const search = valueOf(searchParams.q);
  const filter = validFilter(valueOf(searchParams.filter));
  const rawPage = Number(valueOf(searchParams.page));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const { variants, total, totalPages } = await getAdminInventory({ search, filter, page });
  const query = `q=${encodeURIComponent(search ?? "")}&filter=${filter}`;
  const exportHref = `/api/admin/inventory/export?${query}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form method="get" className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            name="q"
            placeholder="Search product or SKU..."
            defaultValue={search}
            className="max-w-md"
          />
          <select
            name="filter"
            defaultValue={filter}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="all">All inventory</option>
            <option value="in-stock">In stock</option>
            <option value="low-stock">Low stock</option>
            <option value="out-of-stock">Out of stock</option>
          </select>
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-sm border border-[#101114] bg-[#101114] px-4 text-sm font-semibold text-white hover:bg-[#101114]/90"
          >
            Filter
          </button>
        </form>

        <a
          href={exportHref}
          download
          className="inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-input bg-background px-3 text-sm font-medium hover:bg-muted"
          title={
            total > 5000
              ? "Export capped at first 5,000 matching items"
              : "Export current inventory to CSV"
          }
        >
          <Download className="size-4" />
          Export CSV {total > 5000 ? "(Capped at 5k)" : ""}
        </a>
      </div>

      <p className="text-sm text-muted-foreground">
        {total} inventory {total === 1 ? "item" : "items"}
        {total > 5000 ? " · CSV export limited to first 5,000 items" : ""}
      </p>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr className="text-left">
              <th className="p-3 font-medium">Product</th>
              <th className="p-3 font-medium">SKU / Variant</th>
              <th className="p-3 font-medium">Stock</th>
              <th className="p-3 font-medium">Reserved</th>
              <th className="p-3 font-medium">Available</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {variants.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-muted-foreground">
                  No inventory items found.
                </td>
              </tr>
            ) : (
              variants.map((item) => {
                const low = item.available > 0 && item.available <= 5;
                const out = item.available <= 0;
                return (
                  <tr key={item.id} className="hover:bg-muted/30">
                    <td className="p-3 font-medium">{item.product.name}</td>
                    <td className="p-3">
                      <div className="font-mono text-xs">{item.sku}</div>
                      <div className="text-xs text-muted-foreground">
                        {[item.size, item.color].filter(Boolean).join(" / ") || "Default variant"}
                      </div>
                    </td>
                    <td className="p-3">{item.totalStock}</td>
                    <td className="p-3">{item.reserved}</td>
                    <td className="p-3 font-semibold">{item.available}</td>
                    <td className="p-3">
                      <Badge variant={out ? "destructive" : low ? "secondary" : "outline"}>
                        {out ? "Out of stock" : low ? "Low stock" : "In stock"}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/admin/inventory/${item.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <nav aria-label="Inventory pages" className="flex items-center justify-center gap-3">
          {page > 1 ? (
            <Link
              href={`/admin/inventory?${query}&page=${page - 1}`}
              className="inline-flex size-10 items-center justify-center rounded-sm border"
            >
              ←
            </Link>
          ) : null}
          <span className="text-sm font-medium">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/admin/inventory?${query}&page=${page + 1}`}
              className="inline-flex size-10 items-center justify-center rounded-sm border"
            >
              →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground">
          Monitor stock, reservations, and inventory movements.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/40" />
            ))}
          </div>
        }
      >
        <InventorySummarySection />
      </Suspense>

      <Suspense fallback={<div className="p-12 text-center">Loading inventory...</div>}>
        <InventoryTable searchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  );
}
