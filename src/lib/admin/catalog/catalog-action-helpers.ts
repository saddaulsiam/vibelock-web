import { Prisma } from "@prisma/client";
import { updateTag } from "next/cache";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type AdminActionState = { error: string | null; message?: string };
export const ok: AdminActionState = { error: null, message: "Changes saved." };

export const nameField = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(120, "Name must be 120 characters or fewer.");

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugFromForm(formData: FormData, name: string) {
  const requested = String(formData.get("slug") ?? "").trim();
  const slug = slugify(requested || name);
  return z
    .string()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .safeParse(slug);
}

export function duplicateMessage(error: unknown): string | null {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
    ? "That name or slug is already in use. Choose a unique value."
    : null;
}

export function refreshCatalog(): void {
  updateTag("products");
  updateTag("categories");
  updateTag("promo-banners");
  revalidatePath("/admin/products");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/banners");
  revalidatePath("/products");
  revalidatePath("/");
  revalidatePath("/category/[slug]", "page");
}

