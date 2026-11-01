import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminTableColumnVisibility } from "@/components/admin/shared";

describe("AdminTableColumnVisibility Component Unit Tests", () => {
  const sampleColumns = [
    { key: "sku", label: "SKU" },
    { key: "stock", label: "Available Stock" },
    { key: "price", label: "Price" },
  ];

  test("renders customize columns button", () => {
    const html = renderToStaticMarkup(
      <AdminTableColumnVisibility
        columns={sampleColumns}
        visibleColumns={{ sku: true, stock: true, price: true }}
        onChange={vi.fn()}
      />
    );

    expect(html).toContain("Columns");
    expect(html).toContain('title="Customize visible columns"');
  });

  test("shows badge with count when some columns are hidden", () => {
    const html = renderToStaticMarkup(
      <AdminTableColumnVisibility
        columns={sampleColumns}
        visibleColumns={{ sku: true, stock: false, price: true }}
        onChange={vi.fn()}
      />
    );

    expect(html).toContain("2/3");
  });
});
