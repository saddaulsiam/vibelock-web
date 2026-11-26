import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/admin/categories";
import { getAdminCategoryFormData } from "@/lib/admin/catalog";

export default async function EditAdminCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { category, categories } = await getAdminCategoryFormData(id);
  if (!category) notFound();

  return (
    <div className="mx-auto w-full max-w-[100rem]">
      <CategoryForm category={category} categories={categories} />
    </div>
  );
}
