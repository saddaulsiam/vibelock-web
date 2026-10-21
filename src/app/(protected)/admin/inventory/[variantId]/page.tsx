import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InventoryAdjustmentForm } from "@/components/admin/inventory-adjustment-form";
import { getAdminInventoryDetail } from "@/lib/admin/inventory-queries";

function currency(value: unknown) {
  return `৳${Number(value).toFixed(2)}`;
}
function date(value: Date) {
  return new Date(value).toLocaleDateString("en-BD", { dateStyle: "medium" });
}

export default async function AdminInventoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ variantId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ variantId }, query] = await Promise.all([params, searchParams]);
  const rawPage = Number(query.page);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const result = await getAdminInventoryDetail(variantId, page);
  if (!result) notFound();
  const { variant, totalStock, reservedStock, availableStock, transactions, totalPages } = result;
  const low = availableStock > 0 && availableStock <= 5;
  const out = availableStock <= 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/inventory" className="text-primary text-sm font-medium hover:underline">
          ← Back to inventory
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{variant.product.name}</h1>
        <p className="text-muted-foreground font-mono text-sm">{variant.sku}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Product information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
            <p>
              <strong>Variant:</strong>{" "}
              {[variant.size, variant.color].filter(Boolean).join(" / ") || "Default variant"}
            </p>
            <p>
              <strong>Weight:</strong> {variant.weight ? `${variant.weight} kg` : "N/A"}
            </p>
            <p>
              <strong>Cost price:</strong> {currency(variant.costPrice)}
            </p>
            <p>
              <strong>Selling price:</strong> {currency(variant.sellingPrice)}
            </p>
            <p>
              <strong>Current stock:</strong> {totalStock}
            </p>
            <p>
              <strong>Reserved:</strong> {reservedStock}
            </p>
            <p>
              <strong>Available:</strong> {availableStock}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              <Badge variant={out ? "destructive" : low ? "secondary" : "outline"}>
                {out ? "Out of stock" : low ? "Low stock" : "In stock"}
              </Badge>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Adjust stock</CardTitle>
            <CardDescription>Positive adds stock; negative removes stock.</CardDescription>
          </CardHeader>
          <CardContent>
            <InventoryAdjustmentForm variantId={variant.id} />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Inventory history</CardTitle>
          <CardDescription>Newest movements first.</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No inventory transactions found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr className="text-left">
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Quantity</th>
                    <th className="p-3 font-medium">Reference</th>
                    <th className="p-3 font-medium">Notes</th>
                    <th className="p-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="p-3">
                        <Badge variant="outline">{transaction.type}</Badge>
                      </td>
                      <td
                        className={`p-3 font-semibold ${transaction.quantity < 0 ? "text-red-700" : "text-green-700"}`}
                      >
                        {transaction.quantity > 0
                          ? `+${transaction.quantity}`
                          : transaction.quantity}
                      </td>
                      <td className="p-3 font-mono text-xs">{transaction.referenceId || "N/A"}</td>
                      <td className="p-3">{transaction.notes || "N/A"}</td>
                      <td className="p-3">{date(transaction.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      {totalPages > 1 ? (
        <nav
          aria-label="Inventory history pages"
          className="flex items-center justify-center gap-3"
        >
          {page > 1 ? (
            <Link
              href={`/admin/inventory/${variant.id}?page=${page - 1}`}
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
              href={`/admin/inventory/${variant.id}?page=${page + 1}`}
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
