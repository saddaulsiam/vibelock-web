import { ProductForm } from "@/components/admin/products";
import { getAdminProductFormData } from "@/lib/admin/catalog";

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
    <div className="mx-auto w-full max-w-[100rem]">
      <ProductForm
        product={initialProduct}
        categories={categories}
        isDuplicate={Boolean(sourceProduct)}
        duplicateFromName={sourceProduct?.name}
      />
    </div>
  );
}
