import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AdminCategoriesTable,
  type AdminCategoryListItem,
} from "@/components/admin/admin-categories-table";

describe("AdminCategoriesTable", () => {
  const mockCategories: AdminCategoryListItem[] = [
    {
      id: "cat-1",
      name: "T-Shirts",
      slug: "t-shirts",
      description: "Heavyweight streetwear tees",
      imageUrl: "https://example.com/tshirt.jpg",
      parentId: null,
      parent: null,
      isActive: true,
      sortOrder: 1,
      _count: { products: 12, children: 2 },
    },
    {
      id: "cat-2",
      name: "Graphic Tees",
      slug: "graphic-tees",
      description: "Screen printed tees",
      imageUrl: null,
      parentId: "cat-1",
      parent: { name: "T-Shirts" },
      isActive: false,
      sortOrder: 2,
      _count: { products: 5, children: 0 },
    },
    {
      id: "cat-3",
      name: "Empty Category",
      slug: "empty-category",
      description: null,
      imageUrl: null,
      parentId: null,
      parent: null,
      isActive: true,
      sortOrder: 3,
      _count: { products: 0, children: 0 },
    },
  ];

  test("renders all categories with names, slugs, priority, and badges", () => {
    const html = renderToStaticMarkup(
      <AdminCategoriesTable initialCategories={mockCategories} />
    );

    // Names and Slugs
    expect(html).toContain("T-Shirts");
    expect(html).toContain("/t-shirts");
    expect(html).toContain("Graphic Tees");
    expect(html).toContain("/graphic-tees");
    expect(html).toContain("Empty Category");
    expect(html).toContain("/empty-category");

    // Root Department and Parent badges
    expect(html).toContain("Root Department");
    expect(html).toContain("T-Shirts");

    // Sort Order priority
    expect(html).toContain("#1");
    expect(html).toContain("#2");
    expect(html).toContain("#3");

    // Product counts
    expect(html).toContain("12 products");
    expect(html).toContain("5 products");
    expect(html).toContain("0 products");

    // Storefront Status badges
    expect(html).toContain("Active Live");
    expect(html).toContain("Hidden / Draft");

    // Actions
    expect(html).toContain("Edit");
    expect(html).toContain("Delete");
  });

  test("disables delete button for categories with products or children", () => {
    const html = renderToStaticMarkup(
      <AdminCategoriesTable initialCategories={mockCategories} />
    );

    // Should indicate deletion restriction
    expect(html).toContain("Cannot delete: category has active products or sub-categories");
  });

  test("renders empty state when no categories match", () => {
    const html = renderToStaticMarkup(
      <AdminCategoriesTable initialCategories={[]} />
    );

    expect(html).toContain("No categories found");
    expect(html).toContain("Create Category");
  });
});
