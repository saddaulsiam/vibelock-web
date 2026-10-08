"use client";

import Link from "next/link";
import { AdminSaveForm } from "@/components/admin/admin-action-form";
import { saveCategoryAction } from "@/lib/admin/catalog-actions";

type CategoryFormValues = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
};

export function CategoryForm({
  category,
  categories,
}: {
  category: CategoryFormValues | null;
  categories: { id: string; name: string }[];
}) {
  const fieldClass = "mt-1.5 min-h-11 w-full border border-[#101114]/20 bg-white px-3 py-2 text-sm text-[#101114] outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]";
  return (
    <AdminSaveForm action={saveCategoryAction} submitLabel={category ? "Save category" : "Create category"}>
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <label className="block text-sm font-medium text-[#101114]">
        Name <span aria-hidden="true" className="text-red-700">*</span>
        <input className={fieldClass} name="name" required maxLength={120} defaultValue={category?.name ?? ""} autoComplete="off" />
      </label>
      <label className="block text-sm font-medium text-[#101114]">
        Slug <span className="font-normal text-muted-foreground">(leave blank to generate from name)</span>
        <input className={fieldClass} name="slug" maxLength={160} defaultValue={category?.slug ?? ""} autoComplete="off" />
      </label>
      <label className="block text-sm font-medium text-[#101114]">
        Description
        <textarea className={`${fieldClass} min-h-28 resize-y`} name="description" maxLength={1000} defaultValue={category?.description ?? ""} />
      </label>
      <label className="block text-sm font-medium text-[#101114]">
        Parent category <span className="font-normal text-muted-foreground">(optional)</span>
        <select className={fieldClass} name="parentId" defaultValue={category?.parentId ?? ""}>
          <option value="">No parent</option>
          {categories.filter((item) => item.id !== category?.id).map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/categories" className="inline-flex min-h-10 items-center border border-[#101114]/20 px-4 text-sm font-medium text-[#101114] hover:bg-[#F3F0E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]">
          Back to categories
        </Link>
      </div>
    </AdminSaveForm>
  );
}
