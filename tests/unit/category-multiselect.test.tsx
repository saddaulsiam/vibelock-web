import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CategoryMultiSelect, type CategoryOption } from "@/components/admin/category-multiselect";

describe("CategoryMultiSelect component", () => {
  const sampleCategories: CategoryOption[] = [
    { id: "cat-1", name: "T-Shirts" },
    { id: "cat-2", name: "Hoodies & Sweatshirts" },
    { id: "cat-3", name: "Pants & Trousers" },
    { id: "cat-4", name: "Accessories" },
  ];

  test("renders dropdown trigger with placeholder", () => {
    const html = renderToStaticMarkup(
      <CategoryMultiSelect
        categories={sampleCategories}
        initialSelectedIds={[]}
        placeholder="Choose product categories..."
      />
    );

    expect(html).toContain("Choose product categories...");
    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).toContain('aria-expanded="false"');
  });

  test("renders hidden input elements for initially selected category IDs", () => {
    const html = renderToStaticMarkup(
      <CategoryMultiSelect categories={sampleCategories} initialSelectedIds={["cat-1", "cat-3"]} />
    );

    expect(html).toContain('<input type="hidden" name="categoryIds" value="cat-1"/>');
    expect(html).toContain('<input type="hidden" name="categoryIds" value="cat-3"/>');
    expect(html).toContain("T-Shirts");
    expect(html).toContain("Pants &amp; Trousers");
  });

  test("uses custom name prop if provided for hidden inputs", () => {
    const html = renderToStaticMarkup(
      <CategoryMultiSelect
        categories={sampleCategories}
        initialSelectedIds={["cat-2"]}
        name="customCategoryField"
      />
    );

    expect(html).toContain('<input type="hidden" name="customCategoryField" value="cat-2"/>');
    expect(html).toContain("Hoodies &amp; Sweatshirts");
  });
});
