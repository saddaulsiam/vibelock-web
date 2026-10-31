import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CategorySearchableSelect } from "@/components/admin/categories";

describe("CategorySearchableSelect component", () => {
  const sampleCategories = [
    { id: "cat-1", name: "T-Shirts" },
    { id: "cat-2", name: "Hoodies" },
    { id: "cat-3", name: "Pants" },
  ];

  test("renders trigger with 'No parent (Top-level category)' when value is empty", () => {
    const html = renderToStaticMarkup(
      <CategorySearchableSelect categories={sampleCategories} value="" onChange={vi.fn()} />
    );

    expect(html).toContain("No parent (Top-level category)");
    expect(html).toContain("Root");
    expect(html).toContain('<input type="hidden" name="parentId" value=""/>');
  });

  test("renders trigger with selected category name and sub-category badge", () => {
    const html = renderToStaticMarkup(
      <CategorySearchableSelect categories={sampleCategories} value="cat-2" onChange={vi.fn()} />
    );

    expect(html).toContain("Hoodies");
    expect(html).toContain("Sub-category");
    expect(html).toContain('<input type="hidden" name="parentId" value="cat-2"/>');
  });

  test("uses custom name prop when specified", () => {
    const html = renderToStaticMarkup(
      <CategorySearchableSelect
        categories={sampleCategories}
        value="cat-3"
        name="customParentField"
        onChange={vi.fn()}
      />
    );

    expect(html).toContain('<input type="hidden" name="customParentField" value="cat-3"/>');
  });
});
