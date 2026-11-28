import { CategoryForm, CategoryFormPreview } from "@/components/admin/categories";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/admin/categories/new",
  useSearchParams: () => new URLSearchParams(),
}));

describe("CategoryFormPreview component", () => {
  test("renders 3:4 storefront card preview with name, status, priority, and slug", () => {
    const html = renderToStaticMarkup(
      <CategoryFormPreview
        name="Heavyweight Hoodies"
        slug="heavyweight-hoodies"
        imageUrl="https://example.com/hoodie.jpg"
        isActive={true}
        sortOrder={2}
        parentCategoryName="Apparel"
      />
    );

    expect(html).toContain("Live Storefront Card Preview");
    expect(html).toContain("3:4 catalog aspect ratio");
    expect(html).toContain("Heavyweight Hoodies");
    expect(html).toContain("Active");
    expect(html).toContain("#2");
    expect(html).toContain("Apparel");
    expect(html).toContain("/heavyweight-hoodies");
  });

  test("renders awaiting media fallback when no image is provided", () => {
    const html = renderToStaticMarkup(
      <CategoryFormPreview
        name="Empty Category"
        slug="empty-category"
        imageUrl={null}
        isActive={false}
        sortOrder={1}
      />
    );

    expect(html).toContain("Awaiting Cover Image");
    expect(html).toContain("Draft");
  });
});

describe("CategoryForm component", () => {
  const sampleCategories = [
    { id: "cat-1", name: "T-Shirts" },
    { id: "cat-2", name: "Outerwear" },
  ];

  test("renders create category workspace with master-detail layout, sticky actions, and previews", () => {
    const html = renderToStaticMarkup(
      <CategoryForm category={null} categories={sampleCategories} />
    );

    // Header & Navigation
    expect(html).toContain("Create category");
    expect(html).toContain("Back to categories");
    expect(html).toContain("Active at Store");

    // Section 1: Basic Information
    expect(html).toContain("Basic Information");
    expect(html).toContain("Category Name");
    expect(html).toContain("Category Slug");
    expect(html).toContain("vibelock.bd/category/");
    expect(html).toContain("Quick presets:");
    expect(html).toContain("T-Shirts");
    expect(html).toContain("Hoodies &amp; Sweats");

    // Section 2: Media & Hero
    expect(html).toContain("Category Hero &amp; Cover Media");
    expect(html).toContain("Click or drag &amp; drop to upload cover image");

    // Section 3: Hierarchy
    expect(html).toContain("Hierarchy &amp; Placement");
    expect(html).toContain("Parent Category");

    // Section 4: Search Engine Optimization (SEO)
    expect(html).toContain("Search Engine Optimization (SEO)");
    expect(html).toContain("Google Search Result Preview");
    expect(html).toContain("Page Title (Meta Title)");
    expect(html).toContain("Meta Description");

    // Sidebar: Sticky Actions
    expect(html).toContain("Save &amp; Add Another");
    expect(html).toContain("Cancel");

    // Sidebar: Live Storefront Card Preview
    expect(html).toContain("Storefront Card");
    expect(html).toContain("Hide preview");

    // Sidebar: Publishing Status & Priority
    expect(html).toContain("Publishing Status");
    expect(html).toContain("Storefront State");
    expect(html).toContain("Display Priority (Sort Order)");

    // Sidebar: Taxonomy Position
    expect(html).toContain("Taxonomy Position");
    expect(html).toContain("Root Category");
  });

  test("renders edit mode with existing category details, slug indicator, duplicate button, and external link", () => {
    const existingCategory = {
      id: "cat-123",
      name: "Vintage Cargos",
      slug: "vintage-cargos",
      description: "Relaxed baggy tactical cargos",
      imageUrl: "https://example.com/cargos.jpg",
      metaTitle: "Vintage Cargos | VibeLock Streetwear",
      metaDescription: "Shop relaxed baggy tactical cargos in Bangladesh",
      parentId: "cat-2",
      isActive: true,
      sortOrder: 3,
    };

    const html = renderToStaticMarkup(
      <CategoryForm category={existingCategory} categories={sampleCategories} />
    );

    expect(html).toContain("Vintage Cargos");
    expect(html).toContain("Slug: /vintage-cargos");
    expect(html).toContain("View in store");
    expect(html).toContain("Duplicate");
    expect(html).toContain("Save category");
    expect(html).not.toContain("Save &amp; Add Another");
    expect(html).toContain("Sub-category");
    expect(html).toContain("Outerwear");
  });
});
