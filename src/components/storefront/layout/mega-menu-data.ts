import type { CategorySummary } from "@/lib/catalog/types";

export interface MegaMenuChild {
  id: string;
  name: string;
  slug: string;
}

export interface MegaMenuSubCategory {
  id: string;
  name: string;
  slug: string;
  children: MegaMenuChild[];
}

/**
 * Builds the hierarchical Sub-Category -> Child-Category structure exclusively from the DATABASE.
 * Returns `null` if no sub-categories exist in the database for the given category.
 *
 * Rule: NO dummy/mock data.
 * - If a category has sub-categories in DB -> returns them for the Mega-Menu flyout.
 * - If a category has NO sub-categories in DB -> returns `null` (no flyout, normal direct link).
 */
export function getCategoryMegaMenuData(
  categorySlug: string,
  categories: CategorySummary[] = []
): MegaMenuSubCategory[] | null {
  const normalizedSlug = categorySlug.toLowerCase().trim();

  // Find root category in database
  const rootCategory = categories.find(
    (c) => c.slug.toLowerCase() === normalizedSlug || c.name.toLowerCase() === normalizedSlug
  );

  if (!rootCategory) return null;

  // Look for real DB sub-categories (where parentId matches rootCategory.id) sorted by Priority starting from 1 (1, 2, 3...)
  const dbSubCategories = categories
    .filter((c) => c.parentId === rootCategory.id)
    .sort((a, b) => {
      const orderA = a.sortOrder && a.sortOrder >= 1 ? a.sortOrder : Number.MAX_SAFE_INTEGER;
      const orderB = b.sortOrder && b.sortOrder >= 1 ? b.sortOrder : Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });

  if (dbSubCategories.length === 0) {
    return null;
  }

  return dbSubCategories.map((sub) => {
    // Look for real DB child-categories (where parentId matches sub.id) sorted by Priority starting from 1 (1, 2, 3...)
    const dbChildren = categories
      .filter((c) => c.parentId === sub.id)
      .sort((a, b) => {
        const orderA = a.sortOrder && a.sortOrder >= 1 ? a.sortOrder : Number.MAX_SAFE_INTEGER;
        const orderB = b.sortOrder && b.sortOrder >= 1 ? b.sortOrder : Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      });

    return {
      id: sub.id,
      name: sub.name
        .replace(/^\d+[.\s-]+/, "")
        .trim()
        .toUpperCase(),
      slug: sub.slug,
      children: dbChildren.map((ch) => ({
        id: ch.id,
        name: ch.name
          .replace(/^\d+[.\s-]+/, "")
          .trim()
          .toUpperCase(),
        slug: ch.slug,
      })),
    };
  });
}
