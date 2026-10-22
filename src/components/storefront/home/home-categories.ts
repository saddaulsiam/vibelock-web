import type { CategorySummary } from "@/lib/catalog/types";
import type { HeroCategory } from "./hero-section";

export function getCategoryImageUrl(slug: string, name: string): string {
  const s = slug.toLowerCase();
  const n = name.toLowerCase();
  if (s.includes("t-shirt") || n.includes("t-shirt")) return "/images/categories/cat-t-shirts.jpg";
  if (s.includes("shirt") || n.includes("shirt")) return "/images/categories/cat-shirts.jpg";
  if (s.includes("pant") || n.includes("pant")) return "/images/categories/cat-pants.jpg";
  if (s.includes("short") || n.includes("short")) return "/images/categories/cat-shorts.jpg";
  if (s.includes("sneaker") || n.includes("sneaker") || s.includes("shoe") || n.includes("shoe")) {
    return "/images/hero/hero-slide-1.png";
  }
  if (s.includes("slide") || n.includes("slide")) return "/images/categories/cat-shorts.jpg";
  if (s.includes("watch") || n.includes("watch")) return "/images/collection/acc-tag.png";
  if (s.includes("accessor") || n.includes("accessor")) return "/images/collection/acc-chain.png";
  if (s.includes("panjabi") || n.includes("panjabi")) return "/images/hero/hero-slide-2.jpg";
  if (s.includes("hoodie") || n.includes("hoodie"))
    return "/images/collection/collection-hoodie.png";
  return "/images/categories/cat-t-shirts.jpg";
}

export const FEATURED_FALLBACK_CATEGORIES: CategorySummary[] = [
  {
    id: "cat-fb-1",
    name: "T-Shirts",
    slug: "t-shirts",
    description: null,
    imageUrl: "/images/categories/cat-t-shirts.jpg",
  },
  {
    id: "cat-fb-2",
    name: "Pants",
    slug: "pants",
    description: null,
    imageUrl: "/images/categories/cat-pants.jpg",
  },
  {
    id: "cat-fb-3",
    name: "Shirts",
    slug: "shirts",
    description: null,
    imageUrl: "/images/categories/cat-shirts.jpg",
  },
  {
    id: "cat-fb-4",
    name: "Shorts",
    slug: "shorts",
    description: null,
    imageUrl: "/images/categories/cat-shorts.jpg",
  },
  {
    id: "cat-fb-5",
    name: "Sneakers",
    slug: "sneakers",
    description: null,
    imageUrl: "/images/hero/hero-slide-1.png",
  },
  {
    id: "cat-fb-6",
    name: "Panjabi",
    slug: "panjabi",
    description: null,
    imageUrl: "/images/hero/hero-slide-2.jpg",
  },
  {
    id: "cat-fb-7",
    name: "Accessories",
    slug: "fashion-accessories",
    description: null,
    imageUrl: "/images/collection/acc-chain.png",
  },
  {
    id: "cat-fb-8",
    name: "Watches",
    slug: "watch",
    description: null,
    imageUrl: "/images/collection/acc-tag.png",
  },
];

const FALLBACK_HERO_CATEGORIES: HeroCategory[] = [
  {
    id: "cat-fb-1",
    label: "CAT. 01",
    name: "T-SHIRTS",
    slug: "t-shirts",
    imageUrl: "/images/categories/cat-t-shirts.jpg",
  },
  {
    id: "cat-fb-2",
    label: "CAT. 02",
    name: "PANTS",
    slug: "pants",
    imageUrl: "/images/categories/cat-pants.jpg",
  },
  {
    id: "cat-fb-3",
    label: "CAT. 03",
    name: "SHIRTS",
    slug: "shirts",
    imageUrl: "/images/categories/cat-shirts.jpg",
  },
  {
    id: "cat-fb-4",
    label: "CAT. 04",
    name: "SHORTS",
    slug: "shorts",
    imageUrl: "/images/categories/cat-shorts.jpg",
  },
];

function isRealCategory(category: { name: string }): boolean {
  const name = category.name.toLowerCase();
  return (
    !name.startsWith("cat-") && !name.startsWith("existing") && !name.startsWith("new category")
  );
}

function toHeroCategory(
  category: { id: string; name: string; slug: string; imageUrl?: string | null },
  index: number
): HeroCategory {
  const cleanName = category.name.replace(/^\d+[.\s-]+/, "").toUpperCase();
  return {
    id: category.id,
    label: `CAT. ${String(index + 1).padStart(2, "0")}`,
    name: cleanName,
    slug: category.slug,
    imageUrl: category.imageUrl || getCategoryImageUrl(category.slug, category.name),
  };
}

export function getFeaturedCategories(categories: CategorySummary[]): CategorySummary[] {
  const realCategories = categories.filter(isRealCategory);
  return [
    ...realCategories,
    ...FEATURED_FALLBACK_CATEGORIES.filter(
      (fb) => !realCategories.some((rc) => rc.slug === fb.slug)
    ),
  ].slice(0, 8);
}

export function getHeroCategories(categories: CategorySummary[]): {
  heroCategories: HeroCategory[];
  typewriterWords: string[];
} {
  const heroCategories = categories.filter(isRealCategory).map(toHeroCategory);
  const finalHeroCategories = heroCategories.length > 0 ? heroCategories : FALLBACK_HERO_CATEGORIES;
  const typewriterWords = finalHeroCategories.map((c) => c.name);

  return { heroCategories: finalHeroCategories, typewriterWords };
}
