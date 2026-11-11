import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Copy } from "lucide-react";
import { ProductForm } from "@/components/admin/products";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminProductFormData } from "@/lib/admin/catalog";

export default async function EditAdminProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { product, categories } = await getAdminProductFormData(id);
  if (!product) notFound();
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Link
            href="/admin/products"
            className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide transition-colors hover:text-vl-dark-900"
          >
            <ArrowLeft className="size-3.5" /> Back to products
          </Link>
          <h2 className="text-2xl font-semibold tracking-tight text-vl-dark-900 sm:text-3xl">
            Edit product
          </h2>
        </div>
        <Link
          href={`/admin/products/new?duplicateFrom=${product.id}`}
          className="inline-flex min-h-9 items-center gap-1.5 border border-vl-dark-900/20 bg-white px-3 text-xs font-semibold text-vl-dark-900 shadow-2xs transition-colors hover:bg-vl-white-300 focus-visible:ring-2 focus-visible:ring-vl-cyan"
        >
          <Copy className="size-3.5 text-vl-dark-900/70" />
          Duplicate as new
        </Link>
      </header>
      <Card className="overflow-visible rounded-sm border-vl-dark-900/10 bg-white shadow-none">
        <CardHeader className="border-b border-vl-dark-900/10 px-4 py-4 sm:px-6">
          <CardTitle className="text-base text-vl-dark-900">{product.name}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <ProductForm product={product} categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
