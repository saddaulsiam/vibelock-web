export interface HeroBanner {
  id: string;
  eyebrow: string;
  headline: string;
  highlightText?: string;
  headlineSuffix?: string;
  description: string;
  ctaLabel: string;
  ctaUrl: string;
  imageUrl: string;
  mobileImageUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export const defaultHeroBanners: HeroBanner[] = [
  {
    id: "hero-drop-01",
    eyebrow: "Vibelock Streetwear",
    headline: "Wear Your",
    highlightText: "Vibe",
    headlineSuffix: "Daily",
    description: "Premium streetwear for the bold, the real, and the everyday dreamers.",
    ctaLabel: "SHOP NOW",
    ctaUrl: "/products",
    imageUrl: "/images/hero/hero-clean.png",
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "hero-drop-02",
    eyebrow: "New Drop / Dhaka",
    headline: "Heavyweight",
    highlightText: "Boxy",
    headlineSuffix: "Tees",
    description: "Built from 280 GSM combed cotton. Structured, effortless, and designed for Dhaka.",
    ctaLabel: "EXPLORE TEES",
    ctaUrl: "/category/t-shirts",
    imageUrl: "/images/hero/hero-slide-2.png",
    sortOrder: 2,
    isActive: true,
  },
  {
    id: "hero-drop-03",
    eyebrow: "Essential Series",
    headline: "Minimal",
    highlightText: "Urban",
    headlineSuffix: "Layers",
    description: "Clean silhouettes and relaxed tailoring crafted for everyday city movement.",
    ctaLabel: "SHOP COLLECTION",
    ctaUrl: "/products?sort=newest",
    imageUrl: "/images/hero/hero-slide-3.png",
    sortOrder: 3,
    isActive: true,
  },
];

export async function getHomepageHeroBanners(): Promise<HeroBanner[]> {
  try {
    return defaultHeroBanners
      .filter((banner) => banner.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  } catch {
    return defaultHeroBanners.slice(0, 1);
  }
}
