import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AdminCategoriesTable,
  CategoryProductsManager,
  type AdminCategoryListItem,
} from "@/components/admin/categories";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/admin/categories",
  useSearchParams: () => new URLSearchParams(),
}));

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

import { ProductStatus } from "@prisma/client";

describe("CategoryProductsManager", () => {
  const mockAssigned = [
    {
      id: "prod-1",
      name: "Vintage Acid Wash Tee",
      slug: "vintage-acid-wash-tee",
      status: ProductStatus.PUBLISHED,
      isFeatured: true,
      primaryImage: "https://example.com/tee.jpg",
      categoryNames: ["T-Shirts", "Streetwear"],
      variantCount: 3,
      totalStock: 25,
      minSellingPrice: 1250,
      minDiscountPrice: 1050,
    },
    {
      id: "prod-2",
      name: "Out of Stock Hoodie",
      slug: "out-of-stock-hoodie",
      status: ProductStatus.DRAFT,
      isFeatured: false,
      primaryImage: null,
      categoryNames: ["T-Shirts"],
      variantCount: 1,
      totalStock: 0,
      minSellingPrice: 2400,
      minDiscountPrice: null,
    },
  ];

  const mockAvailable = [
    {
      id: "prod-3",
      name: "Cargo Pants",
      slug: "cargo-pants",
      status: ProductStatus.PUBLISHED,
      isFeatured: false,
      primaryImage: null,
      categoryNames: ["Bottoms"],
      totalStock: 15,
      minSellingPrice: 1800,
    },
  ];

  test("renders assigned products list, stock pills, and action buttons", () => {
    const html = renderToStaticMarkup(
      <CategoryProductsManager
        categoryId="cat-1"
        categoryName="T-Shirts"
        initialAssignedProducts={mockAssigned}
        availableProducts={mockAvailable}
      />
    );

    // Products
    expect(html).toContain("Vintage Acid Wash Tee");
    expect(html).toContain("/vintage-acid-wash-tee");
    expect(html).toContain("Out of Stock Hoodie");
    expect(html).toContain("/out-of-stock-hoodie");

    // Stock badges
    expect(html).toContain("25 in stock");
    expect(html).toContain("Out of stock");

    // Prices
    expect(html).toContain("1,250.00");
    expect(html).toContain("2,400.00");

    // Status
    expect(html).toContain("PUBLISHED");
    expect(html).toContain("DRAFT");

    // Action buttons
    expect(html).toContain("Remove");
    expect(html).toContain("Add Products to Category");
  });

  test("renders empty state when no products are assigned", () => {
    const html = renderToStaticMarkup(
      <CategoryProductsManager
        categoryId="cat-1"
        categoryName="T-Shirts"
        initialAssignedProducts={[]}
        availableProducts={mockAvailable}
      />
    );

    expect(html).toContain("No products assigned yet");
    expect(html).toContain("Assign Products Now");
  });
});
