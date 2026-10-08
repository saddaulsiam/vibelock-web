import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getAdminInventory, type InventoryFilter } from "@/lib/admin/inventory-queries";

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
function currency(value: unknown) {
  return `৳${Number(value).toFixed(2)}`;
}
function validFilter(value: string | undefined): InventoryFilter {
  return value === "in-stock" || value === "low-stock" || value === "out-of-stock" ? value : "all";
}

async function InventoryTable({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const search = valueOf(searchParams.q);
  const filter = validFilter(valueOf(searchParams.filter));
  const rawPage = Number(valueOf(searchParams.page));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const { variants, total, totalPages } = await getAdminInventory({ search, filter, page });
  const query = `q=${encodeURIComponent(search ?? "")}&filter=${filter}`;

  return (
    <div className="space-y-4">
      <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input name="q" placeholder="Search product or SKU..." defaultValue={search} className="max-w-md" />
        <select name="filter" defaultValue={filter} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
          <option value="all">All inventory</option><option value="in-stock">In stock</option><option value="low-stock">Low stock</option><option value="out-of-stock">Out of stock</option>
        </select>
        <button type="submit" className="inline-flex h-9 items-center justify-center border border-[#101114] bg-[#101114] px-4 text-sm font-semibold text-white">Filter</button>
      </form>
      <p className="text-sm text-muted-foreground">{total} inventory {total === 1 ? "item" : "items"}</p>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50"><tr className="text-left"><th className="p-3 font-medium">Product</th><th className="p-3 font-medium">SKU / Variant</th><th className="p-3 font-medium">Stock</th><th className="p-3 font-medium">Reserved</th><th className="p-3 font-medium">Available</th><th className="p-3 font-medium">Status</th><th className="p-3 text-right font-medium">Action</th></tr></thead>
          <tbody className="divide-y">
            {variants.length === 0 ? <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">No inventory items found.</td></tr> : variants.map((item) => {
              const low = item.available > 0 && item.available <= 5;
              const out = item.available <= 0;
              return <tr key={item.id} className="hover:bg-muted/30"><td className="p-3 font-medium">{item.product.name}</td><td className="p-3"><div className="font-mono text-xs">{item.sku}</div><div className="text-xs text-muted-foreground">{[item.size, item.color].filter(Boolean).join(" / ") || "Default variant"}</div></td><td className="p-3">{item.totalStock}</td><td className="p-3">{item.reserved}</td><td className="p-3 font-semibold">{item.available}</td><td className="p-3"><Badge variant={out ? "destructive" : low ? "secondary" : "outline"}>{out ? "Out of stock" : low ? "Low stock" : "In stock"}</Badge></td><td className="p-3 text-right"><Link href={`/admin/inventory/${item.id}`} className="font-medium text-primary hover:underline">View</Link></td></tr>;
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 ? <nav aria-label="Inventory pages" className="flex items-center justify-center gap-3">{page > 1 ? <Link href={`/admin/inventory?${query}&page=${page - 1}`} className="inline-flex size-10 items-center justify-center rounded-sm border">←</Link> : null}<span className="text-sm font-medium">Page {page} of {totalPages}</span>{page < totalPages ? <Link href={`/admin/inventory?${query}&page=${page + 1}`} className="inline-flex size-10 items-center justify-center rounded-sm border">→</Link> : null}</nav> : null}
    </div>
  );
}

export default async function AdminInventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <div className="space-y-6"><div><h1 className="text-3xl font-bold tracking-tight">Inventory</h1><p className="text-muted-foreground">Monitor stock, reservations, and inventory movements.</p></div><Suspense fallback={<div className="p-12 text-center">Loading inventory...</div>}><InventoryTable searchParams={await searchParams} /></Suspense></div>;
}
