import { ProductForm } from "@/components/admin/product-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminProductFormData } from "@/lib/admin/catalog-queries";

export default async function NewAdminProductPage({
  searchParams,
}: {
  searchParams?: Promise<{ duplicateFrom?: string }>;
}) {
  const { duplicateFrom } = (await searchParams) ?? {};
  const { categories, product: sourceProduct } = duplicateFrom
    ? await getAdminProductFormData(duplicateFrom)
    : await getAdminProductFormData();

  const initialProduct = sourceProduct
    ? {
        ...sourceProduct,
        id: "",
        name: `${sourceProduct.name} (Copy)`,
        slug: `${sourceProduct.slug}-copy`,
        variants: sourceProduct.variants.map((v) => ({
          ...v,
          id: undefined,
          sku: v.sku ? `${v.sku}-COPY`.slice(0, 50) : "",
        })),
      }
    : null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header>
        <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.18em] uppercase">
          Catalog / Products
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-[#101114] sm:text-3xl">
          {initialProduct ? "Duplicate product" : "Create product"}
        </h2>
        {initialProduct && (
          <p className="text-muted-foreground mt-1 text-xs">
            Cloned from <strong>{sourceProduct?.name}</strong>. Adjust details and save to create a
            new product.
          </p>
        )}
      </header>
      <Card className="rounded-sm border-[#101114]/10 bg-white shadow-none">
        <CardHeader className="border-b border-[#101114]/10 px-4 py-4 sm:px-6">
          <CardTitle className="text-base text-[#101114]">
            {initialProduct ? "Cloned product details" : "Product details"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <ProductForm product={initialProduct} categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
