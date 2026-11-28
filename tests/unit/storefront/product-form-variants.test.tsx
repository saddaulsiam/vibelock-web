import { ProductForm, ProductFormPreview } from "@/components/admin/products";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Mock next/navigation & next/image
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/admin/products/new",
}));

describe("ProductForm Variant Generator & Initial Stock", () => {
  it("renders the variant generator with size/color selection and initial stock field", () => {
    const html = renderToStaticMarkup(
      <ProductForm
        product={null}
        categories={[
          { id: "cat-1", name: "T-Shirts" },
          { id: "cat-2", name: "Hoodies" },
        ]}
      />
    );

    // Section title & badges
    expect(html).toContain("Variant Generator — Sizes, Colors, Stock &amp; Weight");
    expect(html).toContain("1. Select Sizes");
    expect(html).toContain("2. Select Colors");

    // Bulk applicator bar
    expect(html).toContain("Quick Fill All Variants");
    expect(html).toContain("Initial Stock (Qty)");
    expect(html).toContain("Weight (kg)");
    expect(html).toContain("Apply to all");

    // Hidden variants json input
    expect(html).toContain('name="variantsJson"');
    expect(html).toContain("&quot;stock&quot;:&quot;0&quot;");
  });

  it("renders existing variants with their initial stock values populated and profit margin", () => {
    const html = renderToStaticMarkup(
      <ProductForm
        product={{
          id: "prod-1",
          name: "Vibe Premium Tee",
          slug: "vibe-premium-tee",
          description: "Comfortable organic cotton tee",
          status: "PUBLISHED",
          categoryIds: ["cat-1"],
          variants: [
            {
              id: "var-1",
              sku: "VIBE-TEE-BLK-M",
              size: "M",
              color: "Black",
              costPrice: "450.00",
              sellingPrice: "850.00",
              discountPrice: "750.00",
              stock: "45",
            },
            {
              id: "var-2",
              sku: "VIBE-TEE-WHT-L",
              size: "L",
              color: "White",
              costPrice: "450.00",
              sellingPrice: "850.00",
              discountPrice: "",
              stock: "20",
            },
          ],
          images: [],
        }}
        categories={[{ id: "cat-1", name: "T-Shirts" }]}
      />
    );

    expect(html).toContain("Black · M");
    expect(html).toContain("White · L");
    expect(html).toContain('value="45"');
    expect(html).toContain('value="20"');
    expect(html).toContain("Existing");
    // Profit margin calculation for 750 effective - 450 cost = +300
    expect(html).toContain("Profit: +৳300.00");
  });

  it("renders cohesive section cards with auto-slug preview, presets, and live storefront preview", () => {
    const html = renderToStaticMarkup(
      <ProductForm product={null} categories={[{ id: "cat-1", name: "Hoodies" }]} />
    );

    // Live storefront preview toggle
    expect(html).toContain("Storefront Card");
    expect(html).toContain("Show preview");

    // Section 1: Basic info with live slug preview and streetwear presets
    expect(html).toContain("Basic Information");
    expect(html).toContain("Product Title / Name");
    expect(html).toContain("Product Slug");
    expect(html).toContain("Preview:");
    expect(html).toContain("vibelock.bd/products/");
    expect(html).toContain("+ Fabric &amp; GSM");
    expect(html).toContain("+ Fit &amp; Cut");

    // Section 2: Categories
    expect(html).toContain("Product Categories");

    // Section 4: Auto-SKU controls
    expect(html).toContain("Regenerate all SKUs");
    expect(html).toContain("Auto");

    // Section 5: Publication status
    expect(html).toContain("Publishing Status");
    expect(html).toContain("Draft — Hidden from store");

    // Productivity & Velocity enhancements
    expect(html).toContain("1-Click Drop Presets:");
    expect(html).toContain("Heavyweight Tee");
    expect(html).toContain("Winter Hoodie");
    expect(html).toContain("Save &amp; Add Another");
    expect(html).toContain("Matrix Stock Grid");
    expect(html).toContain("Detailed Cards");
    expect(html).toContain('id="variants"');
  });

  it("renders ProductFormPreview directly with 3:4 aspect ratio canvas and custom badge", () => {
    const html = renderToStaticMarkup(
      <ProductFormPreview
        name="Vibe Heavyweight Boxy Tee"
        primaryImageUrl="https://res.cloudinary.com/demo/tee.jpg"
        secondaryImageUrl={undefined}
        previewSelling="1250"
        previewDiscount="990"
        hasDiscount={true}
        discountPercent={21}
        totalStockCount={15}
        selectedSizes={["M", "L", "XL"]}
        selectedColors={["Black", "White"]}
        categoryName="Apparel"
        customBadgeLabel="DROP 01"
        customBadgeVariant="new"
      />
    );

    expect(html).toContain("Live Storefront Card Preview");
    expect(html).toContain("3 / 4");
    expect(html).toContain("Vibe Heavyweight Boxy Tee");
    expect(html).toContain("DROP 01");
  });

  it("renders promotional badge controls in ProductForm publishing status sidebar", () => {
    const html = renderToStaticMarkup(
      <ProductForm
        product={{
          id: "prod-badge-1",
          name: "Vibe Tech Cyber Hoodie",
          slug: "vibe-tech-cyber-hoodie",
          description: "Brutalist cyber streetwear hoodie",
          status: "PUBLISHED",
          badgeLabel: "LIMITED HYPE",
          badgeVariant: "hot",
          categoryIds: ["cat-1"],
          variants: [],
          images: [],
        }}
        categories={[{ id: "cat-1", name: "Hoodies" }]}
      />
    );

    expect(html).toContain("Promotional Badge");
    expect(html).toContain('name="badgeVariant"');
    expect(html).toContain('name="badgeLabel"');
    expect(html).toContain('value="LIMITED HYPE"');
    expect(html).toContain("Hot (Flame Amber)");
  });
});
