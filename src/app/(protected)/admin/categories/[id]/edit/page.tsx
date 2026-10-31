import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/shared";
import { CategoryForm } from "@/components/admin/categories";
import { ADMIN_TABLE_CLASSES } from "@/lib/admin/shared";
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
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <AdminPageHeader
        eyebrow="Catalog / Taxonomy"
        title={`Edit ${category.name}`}
        description="Update category name, parent hierarchy, media assets, and description."
      >
        <Link
          href="/admin/categories"
          className={ADMIN_TABLE_CLASSES.buttonSecondary}
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Categories</span>
        </Link>
      </AdminPageHeader>

      <div className="rounded-xl border border-neutral-200/90 bg-white p-6 shadow-2xs">
        <CategoryForm category={category} categories={categories} />
      </div>
    </div>
  );
}
