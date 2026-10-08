import Link from "next/link";
import { FolderPlus, Pencil, Trash2 } from "lucide-react";
import { AdminMutationForm } from "@/components/admin/admin-action-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteCategoryAction } from "@/lib/admin/catalog-actions";
import { getAdminCategories } from "@/lib/admin/catalog-queries";

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories();
  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      <header className="flex flex-col gap-4 border-b border-[#101114]/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Catalog / Taxonomy</p>
          <h2 className="text-2xl font-semibold tracking-tight text-[#101114] sm:text-3xl">Categories</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Organize published catalog products with category names, slugs, and optional parent categories.</p>
        </div>
        <Link href="/admin/categories/new" className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#101114] px-4 text-sm font-semibold text-white hover:bg-[#101114]/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]">
          <FolderPlus className="size-4" aria-hidden="true" /> New category
        </Link>
      </header>
      <Card className="overflow-hidden rounded-sm border-[#101114]/10 bg-white shadow-none">
        <CardHeader className="border-b border-[#101114]/10 px-4 py-4 sm:px-5">
          <CardTitle className="text-base text-[#101114]">All categories <span className="ml-1 font-normal text-muted-foreground">({categories.length})</span></CardTitle>
        </CardHeader>
        {categories.length === 0 ? (
          <CardContent className="px-4 py-14 text-center sm:px-5">
            <h3 className="text-sm font-semibold text-[#101114]">No categories yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Create a category to organize products.</p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <thead className="bg-[#F3F0E8]/70 text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th scope="col" className="px-5 py-3">Category</th><th scope="col" className="px-5 py-3">Parent</th><th scope="col" className="px-5 py-3">Products</th><th scope="col" className="px-5 py-3">Children</th><th scope="col" className="px-5 py-3">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-[#101114]/10">
                {categories.map((category) => (
                  <tr key={category.id} className="align-top">
                    <td className="px-5 py-4"><p className="font-semibold text-[#101114]">{category.name}</p><p className="mt-1 text-xs text-muted-foreground">/{category.slug}</p>{category.description ? <p className="mt-1 max-w-md text-xs text-muted-foreground">{category.description}</p> : null}</td>
                    <td className="px-5 py-4 text-muted-foreground">{category.parent?.name ?? "—"}</td>
                    <td className="px-5 py-4 tabular-nums text-[#101114]">{category._count.products}</td>
                    <td className="px-5 py-4 tabular-nums text-[#101114]">{category._count.children}</td>
                    <td className="px-5 py-4"><div className="flex flex-col items-start gap-3">
                      <Link href={`/admin/categories/${category.id}/edit`} className="inline-flex min-h-9 items-center gap-2 border border-[#101114]/20 px-3 text-sm font-medium text-[#101114] hover:bg-[#F3F0E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"><Pencil className="size-4" aria-hidden="true" /> Edit</Link>
                      <AdminMutationForm action={deleteCategoryAction} id={category.id} label="Delete" destructive confirmMessage={`Delete category “${category.name}”? This is allowed only when it has no products or child categories.`} />
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
