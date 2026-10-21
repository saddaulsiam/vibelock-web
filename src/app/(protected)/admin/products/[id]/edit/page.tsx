import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminProductFormData } from "@/lib/admin/catalog-queries";

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
      <header>
        <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.18em] uppercase">
          Catalog / Products
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-[#101114] sm:text-3xl">
          Edit product
        </h2>
      </header>
      <Card className="rounded-sm border-[#101114]/10 bg-white shadow-none">
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
