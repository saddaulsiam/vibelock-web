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
            className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide transition-colors hover:text-[#101114]"
          >
            <ArrowLeft className="size-3.5" /> Back to products
          </Link>
          <h2 className="text-2xl font-semibold tracking-tight text-[#101114] sm:text-3xl">
            Edit product
          </h2>
        </div>
        <Link
          href={`/admin/products/new?duplicateFrom=${product.id}`}
          className="inline-flex min-h-9 items-center gap-1.5 border border-[#101114]/20 bg-white px-3 text-xs font-semibold text-[#101114] shadow-2xs transition-colors hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
        >
          <Copy className="size-3.5 text-[#101114]/70" />
          Duplicate as new
        </Link>
      </header>
      <Card className="overflow-visible rounded-sm border-[#101114]/10 bg-white shadow-none">
        <CardHeader className="border-b border-[#101114]/10 px-4 py-4 sm:px-6">
          <CardTitle className="text-base text-[#101114]">{product.name}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <ProductForm product={product} categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
