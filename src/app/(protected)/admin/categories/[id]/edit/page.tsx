import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/admin/category-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminCategoryFormData } from "@/lib/admin/catalog-queries";

export default async function EditAdminCategoryPage({ params }: PageProps<"/admin/categories/[id]/edit">) {
  const { id } = await params;
  const { category, categories } = await getAdminCategoryFormData(id);
  if (!category) notFound();
  return <div className="mx-auto w-full max-w-3xl space-y-6"><header><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Catalog / Categories</p><h2 className="text-2xl font-semibold tracking-tight text-[#101114] sm:text-3xl">Edit category</h2></header><Card className="rounded-sm border-[#101114]/10 bg-white shadow-none"><CardHeader className="border-b border-[#101114]/10 px-4 py-4 sm:px-6"><CardTitle className="text-base text-[#101114]">{category.name}</CardTitle></CardHeader><CardContent className="p-4 sm:p-6"><CategoryForm category={category} categories={categories} /></CardContent></Card></div>;
}
