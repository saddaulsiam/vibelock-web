import { ProductForm } from "@/components/admin/products";
import { getAdminProductFormData } from "@/lib/admin/catalog";
import { notFound } from "next/navigation";

export default async function EditAdminProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { product, categories } = await getAdminProductFormData(id);
  if (!product) notFound();
  return (
    <div className="mx-auto w-full max-w-[100rem]">
      <ProductForm product={product} categories={categories} />
    </div>
  );
}
