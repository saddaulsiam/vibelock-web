import { AdminMutationForm } from "@/components/admin/admin-action-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteCategoryAction } from "@/lib/admin/catalog-actions";
import { getAdminCategories } from "@/lib/admin/catalog-queries";
import { FolderPlus, Pencil } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories();
  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-6">
      <header className="flex flex-col gap-4 border-b border-[#101114]/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.18em] uppercase">
            Catalog / Taxonomy
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-[#101114] sm:text-3xl">
            Categories
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Organize published catalog products with category names, slugs, and optional parent
            categories.
          </p>
        </div>
        <Link
          href="/admin/categories/new"
          className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#101114] px-4 text-sm font-semibold text-white hover:bg-[#101114]/85 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
        >
          <FolderPlus className="size-4" aria-hidden="true" /> New category
        </Link>
      </header>
      <Card className="overflow-hidden rounded-sm border-[#101114]/10 bg-white shadow-none">
        <CardHeader className="border-b border-[#101114]/10 px-4 py-4 sm:px-5">
          <CardTitle className="text-base text-[#101114]">
            All categories{" "}
            <span className="text-muted-foreground ml-1 font-normal">({categories.length})</span>
          </CardTitle>
        </CardHeader>
        {categories.length === 0 ? (
          <CardContent className="px-4 py-14 text-center sm:px-5">
            <h3 className="text-sm font-semibold text-[#101114]">No categories yet</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Create a category to organize products.
            </p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-184 text-left text-sm">
              <thead className="text-muted-foreground bg-[#F3F0E8]/70 text-xs tracking-wide uppercase">
                <tr>
                  <th scope="col" className="px-5 py-3">
                    Category
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Parent
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Products
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Children
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#101114]/10">
                {categories.map((category) => (
                  <tr key={category.id} className="align-top">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3.5">
                        {category.imageUrl ? (
                          <div className="relative size-12 shrink-0 overflow-hidden rounded border border-[#101114]/15 bg-black/5">
                            <Image
                              src={category.imageUrl}
                              alt={category.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : null}
                        <div>
                          <p className="font-semibold text-[#101114]">{category.name}</p>
                          <p className="text-muted-foreground mt-0.5 text-xs">/{category.slug}</p>
                          {category.description ? (
                            <p className="text-muted-foreground mt-1 max-w-md text-xs">
                              {category.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="text-muted-foreground px-5 py-4">
                      {category.parent?.name ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-[#101114] tabular-nums">
                      {category._count.products}
                    </td>
                    <td className="px-5 py-4 text-[#101114] tabular-nums">
                      {category._count.children}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col items-start gap-3">
                        <Link
                          href={`/admin/categories/${category.id}/edit`}
                          className="inline-flex min-h-9 items-center gap-2 border border-[#101114]/20 px-3 text-sm font-medium text-[#101114] hover:bg-[#F3F0E8] focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none"
                        >
                          <Pencil className="size-4" aria-hidden="true" /> Edit
                        </Link>
                        <AdminMutationForm
                          action={deleteCategoryAction}
                          id={category.id}
                          label="Delete"
                          destructive
                          confirmMessage={`Delete category “${category.name}”? This is allowed only when it has no products or child categories.`}
                        />
                      </div>
                    </td>
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
