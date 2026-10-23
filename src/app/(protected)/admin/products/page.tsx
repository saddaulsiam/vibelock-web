import Link from "next/link";
import { Boxes, Pencil, Plus, RadioTower } from "lucide-react";
import { AdminMutationForm } from "@/components/admin/admin-action-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteProductAction, toggleProductPublishedAction } from "@/lib/admin/catalog-actions";
import { getAdminProducts } from "@/lib/admin/catalog-queries";

function formatPrice(value: number | null) {
  if (value === null) return "—";
  return `৳${new Intl.NumberFormat("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
}

export default async function AdminProductsPage() {
  const products = await getAdminProducts();
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
            Manage product details, category assignments, pricing, and publication status.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#101114] px-4 text-sm font-semibold text-white hover:bg-[#101114]/85 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
        >
          <Plus className="size-4" aria-hidden="true" /> New product
        </Link>
      </header>
      <Card className="overflow-hidden rounded-sm border-[#101114]/10 bg-white shadow-none">
        <CardHeader className="border-b border-[#101114]/10 px-4 py-4 sm:px-5">
          <CardTitle className="text-base text-[#101114]">
            All products{" "}
            <span className="text-muted-foreground ml-1 font-normal">({products.length})</span>
          </CardTitle>
        </CardHeader>
        {products.length === 0 ? (
          <CardContent className="px-4 py-14 text-center sm:px-5">
            <Boxes className="text-muted-foreground mx-auto mb-3 size-7" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-[#101114]">No products yet</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Create a product to start building the catalog.
            </p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-5xl text-left text-sm">
              <thead className="text-muted-foreground bg-[#F3F0E8]/70 text-xs tracking-wide uppercase">
                <tr>
                  <th scope="col" className="px-5 py-3">
                    Product
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Category
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Selling price
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Discount
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#101114]/10">
                {products.map((product) => (
                  <tr key={product.id} className="align-top">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#101114]">{product.name}</p>
                      <p className="text-muted-foreground mt-1 text-xs">/{product.slug}</p>
                    </td>
                    <td className="px-5 py-4 text-[#101114]">
                      {product.categories.length ? (
                        product.categories.join(", ")
                      ) : (
                        <span className="text-muted-foreground">Uncategorized</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-[#101114] tabular-nums">
                      {formatPrice(product.minSellingPrice)}
                    </td>
                    <td className="px-5 py-4 text-[#101114] tabular-nums">
                      {formatPrice(product.minDiscountPrice)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center border px-2 py-1 text-xs font-semibold ${product.status === "PUBLISHED" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : product.status === "DRAFT" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-[#101114]/15 bg-[#F3F0E8] text-[#101114]"}`}
                      >
                        {product.status === "PUBLISHED"
                          ? "Published"
                          : product.status === "DRAFT"
                            ? "Draft"
                            : "Archived"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col items-start gap-3">
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="inline-flex min-h-9 items-center gap-2 border border-[#101114]/20 px-3 text-sm font-medium text-[#101114] hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
                        >
                          <Pencil className="size-4" aria-hidden="true" /> Edit
                        </Link>
                        <AdminMutationForm
                          action={toggleProductPublishedAction}
                          id={product.id}
                          label={product.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                        />
                        <AdminMutationForm
                          action={deleteProductAction}
                          id={product.id}
                          label="Delete"
                          destructive
                          confirmMessage={`Delete “${product.name}”? This is blocked if it has inventory history, cart items, or reviews.`}
                        />
                        <RadioTower className="sr-only" aria-hidden="true" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
