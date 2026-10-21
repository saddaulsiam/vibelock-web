"use client";

import { useActionState } from "react";
import type { BannerPlacement } from "@prisma/client";
import { saveBannerAction, type BannerActionState } from "@/lib/admin/banner-actions";

const initialState: BannerActionState = { error: null };

type BannerFormValue = {
  id: string;
  title: string;
  imageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  placement: BannerPlacement;
  sortOrder: number;
  isActive: boolean;
  categories: { id: string }[];
};

export function BannerForm({
  banner,
  categories,
}: {
  banner?: BannerFormValue;
  categories: { id: string; name: string; slug: string }[];
}) {
  const [state, formAction, pending] = useActionState(saveBannerAction, initialState);
  const field = "mt-1 flex h-10 w-full rounded-md border border-input bg-white px-3 text-sm";
  return (
    <form action={formAction} className="space-y-6">
      {banner ? <input type="hidden" name="id" value={banner.id} /> : null}
      <div className="grid gap-5 md:grid-cols-2">
        <label className="text-sm font-medium md:col-span-2">
          Internal title
          <input
            name="title"
            required
            minLength={2}
            maxLength={120}
            defaultValue={banner?.title}
            className={field}
            placeholder="Summer collection campaign"
          />
        </label>
        <label className="text-sm font-medium md:col-span-2">
          Desktop image URL (Cloudinary)
          <input
            name="imageUrl"
            type="url"
            required
            defaultValue={banner?.imageUrl}
            className={field}
            placeholder="https://res.cloudinary.com/..."
          />
          <span className="text-muted-foreground mt-1 block text-xs">
            Use a secure Cloudinary image URL. This form stores the URL; it does not upload files.
          </span>
        </label>
        <label className="text-sm font-medium md:col-span-2">
          Mobile image URL (optional)
          <input
            name="mobileImageUrl"
            type="url"
            defaultValue={banner?.mobileImageUrl ?? ""}
            className={field}
            placeholder="https://res.cloudinary.com/..."
          />
        </label>
        <label className="text-sm font-medium md:col-span-2">
          Click-through link (optional)
          <input
            name="linkUrl"
            defaultValue={banner?.linkUrl ?? ""}
            className={field}
            placeholder="/products or https://..."
          />
        </label>
        <label className="text-sm font-medium">
          Show on
          <select name="placement" defaultValue={banner?.placement ?? "BOTH"} className={field}>
            <option value="CATEGORY">Category pages</option>
            <option value="SEARCH">Search results</option>
            <option value="BOTH">Category + search</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Sort order
          <input
            name="sortOrder"
            type="number"
            min={-99999}
            max={99999}
            step="1"
            defaultValue={banner?.sortOrder ?? 0}
            className={field}
          />
        </label>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Target categories</legend>
        <p className="text-muted-foreground text-xs">
          Leave all unchecked to show on every category/search page eligible for this placement.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {categories.map((category) => (
            <label
              key={category.id}
              className="flex items-center gap-2 rounded-md border border-[#101114]/10 px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                name="categoryIds"
                value={category.id}
                defaultChecked={banner?.categories.some((item) => item.id === category.id) ?? false}
              />
              <span>
                {category.name} <span className="text-muted-foreground">/{category.slug}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          name="isActive"
          type="checkbox"
          value="on"
          defaultChecked={banner?.isActive ?? true}
        />{" "}
        Active
      </label>
      {state.error ? (
        <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p
          role="status"
          className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
        >
          {state.message}
        </p>
      ) : null}
      <button
        disabled={pending}
        type="submit"
        className="inline-flex min-h-10 items-center justify-center border border-[#101114] bg-[#101114] px-5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save banner"}
      </button>
    </form>
  );
}
