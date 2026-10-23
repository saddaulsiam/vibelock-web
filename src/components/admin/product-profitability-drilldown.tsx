"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, AlertTriangle, Layers, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type {
  ProductProfitabilityProduct,
  ProductProfitabilityResult,
  ProductProfitabilityVariant,
} from "@/lib/admin/report-queries";

function formatBdt(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "number" ? value : Number(value);
  const [integerPart, fractionPart] = (Number.isFinite(num) ? num : 0).toFixed(2).split(".");
  const sign = integerPart.startsWith("-") ? "-" : "";
  const unsignedInteger = sign ? integerPart.slice(1) : integerPart;
  const groupedInteger = unsignedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `৳${sign}${groupedInteger}.${fractionPart ?? "00"}`;
}

export function ProductProfitabilityDrilldown({
  data,
  currentSort = "revenue",
  currentSearch = "",
  range,
  from,
  to,
  page,
}: {
  data: ProductProfitabilityResult;
  currentSort?: string;
  currentSearch?: string;
  range?: string;
  from?: string;
  to?: string;
  page?: string;
}) {
  const searchInputId = useId();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (productId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const allExpanded =
    data.products.length > 0 && data.products.every((p) => expandedIds.has(p.productId));

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(data.products.map((p) => p.productId)));
    }
  };

  const buildHref = (updates: Record<string, string | number | undefined>) => {
    const query = new URLSearchParams();
    const currentParams: Record<string, string | undefined> = {
      range: range ?? data.range,
      from,
      to,
      q: currentSearch || undefined,
      sort: currentSort,
      page, // preserves orders page
      pPage: data.page > 1 ? String(data.page) : undefined,
    };

    for (const [key, val] of Object.entries({ ...currentParams, ...updates })) {
      if (val !== undefined && val !== "") {
        query.set(key, String(val));
      }
    }
    return `?${query.toString()}`;
  };

  return (
    <section
      className="border border-[#101114]/10 bg-white"
      aria-labelledby="product-profitability-heading"
    >
      <div className="border-b border-[#101114]/10 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="product-profitability-heading"
                className="text-xl font-semibold tracking-tight text-[#101114]"
              >
                Product &amp; SKU profitability
              </h2>
              <Badge variant="outline" className="text-xs font-normal">
                {data.total.toLocaleString("en-BD")} {data.total === 1 ? "product" : "products"}
              </Badge>
            </div>
            <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">
              Product-level rollups with expandable SKU variant drilldown. Net sales reflects
              retained merchandise value after line discounts and order coupon allocations. Payment
              refunds are accounted for at the order summary level.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {data.products.length > 0 && (
              <button
                type="button"
                onClick={toggleAll}
                className="hover:bg-muted inline-flex h-9 items-center gap-1.5 rounded-sm border border-[#101114]/15 bg-white px-3 text-xs font-medium text-[#101114]"
                aria-label={
                  allExpanded ? "Collapse all product variants" : "Expand all product variants"
                }
              >
                <Layers className="size-3.5" aria-hidden="true" />
                {allExpanded ? "Collapse all" : "Expand all"}
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <form className="flex w-full max-w-sm items-center gap-2" method="GET">
            <label htmlFor={searchInputId} className="sr-only">
              Search by product name or SKU
            </label>
            <div className="relative flex-1">
              <Search
                className="text-muted-foreground absolute top-2.5 left-2.5 size-4"
                aria-hidden="true"
              />
              <Input
                id={searchInputId}
                name="q"
                defaultValue={currentSearch}
                placeholder="Search product or SKU..."
                className="h-9 pl-8 text-sm"
              />
            </div>
            {range ? <input type="hidden" name="range" value={range} /> : null}
            {from ? <input type="hidden" name="from" value={from} /> : null}
            {to ? <input type="hidden" name="to" value={to} /> : null}
            {currentSort ? <input type="hidden" name="sort" value={currentSort} /> : null}
            {page ? <input type="hidden" name="page" value={page} /> : null}
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-sm bg-[#101114] px-3.5 text-xs font-semibold text-white hover:bg-[#101114]/85"
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Sort:</span>
            {[
              { key: "revenue", label: "Revenue" },
              { key: "profit", label: "Profit" },
              { key: "units", label: "Units" },
              { key: "margin", label: "Margin" },
              { key: "returns", label: "Returns" },
            ].map(({ key, label }) => {
              const isActive = (currentSort || "revenue") === key;
              return (
                <Link
                  key={key}
                  href={buildHref({ sort: key, pPage: undefined })}
                  className={`rounded-sm px-2 py-1 transition-colors ${
                    isActive
                      ? "bg-[#101114] font-semibold text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-[#101114]"
                  }`}
                  aria-current={isActive ? "true" : undefined}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-210 text-left text-sm">
          <thead className="bg-muted/40 text-muted-foreground border-b border-[#101114]/10 text-xs font-semibold tracking-wider uppercase">
            <tr>
              <th scope="col" className="p-3.5">
                Product / Variant SKU
              </th>
              <th scope="col" className="p-3.5 text-right">
                Sold
              </th>
              <th scope="col" className="p-3.5 text-right">
                Returns
              </th>
              <th scope="col" className="p-3.5 text-right">
                Retained
              </th>
              <th scope="col" className="p-3.5 text-right">
                Return %
              </th>
              <th scope="col" className="p-3.5 text-right">
                Gross sales
              </th>
              <th scope="col" className="p-3.5 text-right">
                Net sales
              </th>
              <th scope="col" className="p-3.5 text-right">
                COGS
              </th>
              <th scope="col" className="p-3.5 text-right">
                Gross profit
              </th>
              <th scope="col" className="p-3.5 text-right">
                Margin
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#101114]/10">
            {data.products.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-muted-foreground p-10 text-center">
                  {currentSearch ? (
                    <div className="space-y-2">
                      <p>No products or SKUs match &ldquo;{currentSearch}&rdquo; in this period.</p>
                      <Link
                        href={buildHref({ q: undefined, pPage: undefined })}
                        className="text-primary text-xs font-medium underline underline-offset-4"
                      >
                        Clear search filter
                      </Link>
                    </div>
                  ) : (
                    <p>No product sales recorded in this period.</p>
                  )}
                </td>
              </tr>
            ) : (
              data.products.map((product) => {
                const isExpanded = expandedIds.has(product.productId);
                return (
                  <ProductRowGroup
                    key={product.productId}
                    product={product}
                    isExpanded={isExpanded}
                    onToggle={() => toggleExpand(product.productId)}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {data.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#101114]/10 p-4 text-xs">
          <p className="text-muted-foreground">
            Showing page <span className="font-semibold text-[#101114]">{data.page}</span> of{" "}
            <span className="font-semibold text-[#101114]">{data.totalPages}</span> (
            {data.total.toLocaleString("en-BD")} products)
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={buildHref({ pPage: data.page - 1 })}
              className={`inline-flex h-8 items-center justify-center rounded-sm border px-3 font-medium transition-colors ${
                data.page <= 1
                  ? "pointer-events-none opacity-40"
                  : "hover:bg-muted border-[#101114]/15 bg-white text-[#101114]"
              }`}
              aria-disabled={data.page <= 1}
            >
              Previous
            </Link>
            <span className="text-muted-foreground px-2">
              {data.page} / {data.totalPages}
            </span>
            <Link
              href={buildHref({ pPage: data.page + 1 })}
              className={`inline-flex h-8 items-center justify-center rounded-sm border px-3 font-medium transition-colors ${
                data.page >= data.totalPages
                  ? "pointer-events-none opacity-40"
                  : "hover:bg-muted border-[#101114]/15 bg-white text-[#101114]"
              }`}
              aria-disabled={data.page >= data.totalPages}
            >
              Next
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

function ProductRowGroup({
  product,
  isExpanded,
  onToggle,
}: {
  product: ProductProfitabilityProduct;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="group hover:bg-muted/30 transition-colors">
        <td className="p-3.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggle}
              className="hover:bg-muted inline-flex size-6 shrink-0 items-center justify-center rounded-sm border border-[#101114]/15 text-[#101114] transition-colors focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
              aria-expanded={isExpanded}
              aria-label={`${isExpanded ? "Collapse" : "Expand"} variants for ${product.productName}`}
            >
              {isExpanded ? (
                <ChevronDown className="size-3.5" aria-hidden="true" />
              ) : (
                <ChevronRight className="size-3.5" aria-hidden="true" />
              )}
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-[#101114]">{product.productName}</span>
                <Badge variant="outline" className="text-muted-foreground h-4.5 px-1.5 text-[10px]">
                  {product.variantCount} {product.variantCount === 1 ? "variant" : "variants"}
                </Badge>
                {product.isAnomaly && (
                  <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
                    <AlertTriangle className="mr-1 inline size-2.5" aria-hidden="true" />
                    Over-return
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="p-3.5 text-right font-medium tabular-nums">
          {product.soldUnits.toLocaleString("en-BD")}
        </td>
        <td className="p-3.5 text-right font-medium text-amber-700 tabular-nums">
          {product.returnedUnits.toLocaleString("en-BD")}
        </td>
        <td className="p-3.5 text-right font-semibold text-[#101114] tabular-nums">
          {product.retainedUnits.toLocaleString("en-BD")}
        </td>
        <td className="text-muted-foreground p-3.5 text-right tabular-nums">
          {product.returnRate !== null ? `${product.returnRate.toFixed(1)}%` : "—"}
        </td>
        <td className="text-muted-foreground p-3.5 text-right tabular-nums">
          {formatBdt(product.grossSales)}
        </td>
        <td className="p-3.5 text-right font-semibold text-[#101114] tabular-nums">
          {formatBdt(product.netSales)}
        </td>
        <td className="text-muted-foreground p-3.5 text-right tabular-nums">
          {formatBdt(product.cogs)}
        </td>
        <td className="p-3.5 text-right font-semibold text-emerald-700 tabular-nums">
          {formatBdt(product.profit)}
        </td>
        <td className="p-3.5 text-right font-semibold text-[#101114] tabular-nums">
          {product.margin !== null ? `${product.margin.toFixed(1)}%` : "—"}
        </td>
      </tr>

      {isExpanded &&
        (product.variants.length === 0 ? (
          <tr className="bg-muted/15 text-muted-foreground text-xs">
            <td colSpan={10} className="py-2.5 pr-4 pl-12 italic">
              No variant details recorded for this product.
            </td>
          </tr>
        ) : (
          product.variants.map((variant) => <VariantSubRow key={variant.sku} variant={variant} />)
        ))}
    </>
  );
}

function VariantSubRow({ variant }: { variant: ProductProfitabilityVariant }) {
  const attributes = [
    variant.size ? `Size: ${variant.size}` : null,
    variant.color ? `Color: ${variant.color}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <tr className="border-b border-[#101114]/5 bg-[#FAF9F6]/80 text-xs transition-colors hover:bg-[#FAF9F6]">
      <td className="py-2.5 pr-3 pl-11">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] font-medium text-[#101114]">{variant.sku}</span>
          {attributes ? (
            <span className="text-muted-foreground text-[11px]">({attributes})</span>
          ) : (
            <span className="text-muted-foreground text-[11px] italic">(Default variant)</span>
          )}
          {variant.isAnomaly && (
            <Badge variant="destructive" className="h-3.5 px-1 text-[9px]">
              Over-return
            </Badge>
          )}
        </div>
      </td>
      <td className="text-muted-foreground py-2.5 pr-3.5 text-right tabular-nums">
        {variant.soldUnits.toLocaleString("en-BD")}
      </td>
      <td className="py-2.5 pr-3.5 text-right text-amber-700 tabular-nums">
        {variant.returnedUnits.toLocaleString("en-BD")}
      </td>
      <td className="py-2.5 pr-3.5 text-right font-medium text-[#101114] tabular-nums">
        {variant.retainedUnits.toLocaleString("en-BD")}
      </td>
      <td className="text-muted-foreground py-2.5 pr-3.5 text-right tabular-nums">
        {variant.returnRate !== null ? `${variant.returnRate.toFixed(1)}%` : "—"}
      </td>
      <td className="text-muted-foreground py-2.5 pr-3.5 text-right tabular-nums">
        {formatBdt(variant.grossSales)}
      </td>
      <td className="py-2.5 pr-3.5 text-right font-medium text-[#101114] tabular-nums">
        {formatBdt(variant.netSales)}
      </td>
      <td className="text-muted-foreground py-2.5 pr-3.5 text-right tabular-nums">
        {formatBdt(variant.cogs)}
      </td>
      <td className="py-2.5 pr-3.5 text-right font-medium text-emerald-700 tabular-nums">
        {formatBdt(variant.profit)}
      </td>
      <td className="py-2.5 pr-3.5 text-right font-medium text-[#101114] tabular-nums">
        {variant.margin !== null ? `${variant.margin.toFixed(1)}%` : "—"}
      </td>
    </tr>
  );
}
