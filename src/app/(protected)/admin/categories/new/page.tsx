import { CategoryForm } from "@/components/admin/categories";
import { getAdminCategoryFormData } from "@/lib/admin/catalog";

export default async function NewAdminCategoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ duplicateFrom?: string }>;
}) {
  const { duplicateFrom } = (await searchParams) ?? {};
  const { categories, category: sourceCategory } = duplicateFrom
    ? await getAdminCategoryFormData(duplicateFrom)
    : await getAdminCategoryFormData();

  const initialCategory = sourceCategory
    ? {
        ...sourceCategory,
        id: "",
        name: `${sourceCategory.name} (Copy)`,
        slug: `${sourceCategory.slug}-copy`,
      }
    : null;

  return (
    <div className="mx-auto w-full max-w-[100rem]">
      <CategoryForm
        category={initialCategory}
        categories={categories}
        isDuplicate={Boolean(sourceCategory)}
        duplicateFromName={sourceCategory?.name}
      />
    </div>
  );
}
