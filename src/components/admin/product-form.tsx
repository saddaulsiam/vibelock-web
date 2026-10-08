"use client";

import Link from "next/link";
import { AdminSaveForm } from "@/components/admin/admin-action-form";
import { saveProductAction } from "@/lib/admin/catalog-actions";

type ProductFormValues = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  categoryIds: string[];
  variants: { costPrice: string; sellingPrice: string; discountPrice: string }[];
};

export function ProductForm({
  product,
  categories,
}: {
  product: ProductFormValues | null;
  categories: { id: string; name: string }[];
}) {
  const primaryVariant = product?.variants[0];
  const fieldClass = "mt-1.5 min-h-11 w-full border border-[#101114]/20 bg-white px-3 py-2 text-sm text-[#101114] outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]";
  return (
    <AdminSaveForm action={saveProductAction} submitLabel={product ? "Save product" : "Create product"}>
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <label className="block text-sm font-medium text-[#101114]">
        Name <span aria-hidden="true" className="text-red-700">*</span>
        <input className={fieldClass} name="name" required maxLength={120} defaultValue={product?.name ?? ""} autoComplete="off" />
      </label>
      <label className="block text-sm font-medium text-[#101114]">
        Slug <span className="font-normal text-muted-foreground">(leave blank to generate from name)</span>
        <input className={fieldClass} name="slug" maxLength={160} defaultValue={product?.slug ?? ""} autoComplete="off" />
      </label>
      <label className="block text-sm font-medium text-[#101114]">
        Description / details
        <textarea className={`${fieldClass} min-h-36 resize-y`} name="description" maxLength={5000} defaultValue={product?.description ?? ""} />
      </label>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-[#101114]">Categories</legend>
        <p className="text-xs text-muted-foreground">Select all categories that apply.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {categories.map((category) => (
            <label key={category.id} className="flex min-h-11 items-center gap-3 border border-[#101114]/10 bg-white px-3 text-sm text-[#101114]">
              <input type="checkbox" name="categoryIds" value={category.id} defaultChecked={product?.categoryIds.includes(category.id)} className="size-4 accent-[#101114] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]" />
              {category.name}
            </label>
          ))}
          {categories.length === 0 ? <p className="text-sm text-muted-foreground">Create a category before assigning one.</p> : null}
        </div>
      </fieldset>
      <fieldset className="space-y-3 border border-[#101114]/10 bg-white p-4 sm:p-5">
        <legend className="px-1 text-sm font-semibold text-[#101114]">Product pricing</legend>
        <p className="text-xs leading-5 text-muted-foreground">
          Pricing is stored on variants. These values apply to every existing variant; a product without variants receives one default variant. SKU, size, color, and stock remain outside this phase.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium text-[#101114]">
            Cost price <span className="text-xs font-normal text-muted-foreground">(admin only)</span>
            <input className={fieldClass} name="costPrice" type="number" min="0" step="0.01" required defaultValue={primaryVariant?.costPrice ?? "0.00"} />
          </label>
          <label className="block text-sm font-medium text-[#101114]">
            Selling price <span aria-hidden="true" className="text-red-700">*</span>
            <input className={fieldClass} name="sellingPrice" type="number" min="0.01" step="0.01" required defaultValue={primaryVariant?.sellingPrice ?? ""} />
          </label>
          <label className="block text-sm font-medium text-[#101114]">
            Discount price <span className="font-normal text-muted-foreground">(optional)</span>
            <input className={fieldClass} name="discountPrice" type="number" min="0" step="0.01" defaultValue={primaryVariant?.discountPrice ?? ""} />
          </label>
        </div>
      </fieldset>
      <label className="block text-sm font-medium text-[#101114]">
        Publication status
        <select className={fieldClass} name="status" defaultValue={product?.status ?? "DRAFT"}>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/products" className="inline-flex min-h-10 items-center border border-[#101114]/20 px-4 text-sm font-medium text-[#101114] hover:bg-[#F3F0E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]">
          Back to products
        </Link>
      </div>
    </AdminSaveForm>
  );
}
