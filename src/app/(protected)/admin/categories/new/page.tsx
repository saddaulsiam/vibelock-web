import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/shared";
import { CategoryForm } from "@/components/admin/categories";
import { ADMIN_TABLE_CLASSES } from "@/lib/admin/shared";
import { getAdminCategoryFormData } from "@/lib/admin/catalog";

export default async function NewAdminCategoryPage() {
  const { categories } = await getAdminCategoryFormData();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <AdminPageHeader
        eyebrow="Catalog / Taxonomy"
        title="Create Category"
        description="Define category identity, hierarchy, media assets, and SEO-friendly slug."
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
        <CategoryForm category={null} categories={categories} />
      </div>
    </div>
  );
}
