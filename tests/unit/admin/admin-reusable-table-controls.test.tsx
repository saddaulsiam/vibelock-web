import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AdminTableFilterSelect,
  AdminTableMetaBar,
  buildFilterUrl,
} from "@/components/admin/shared";
import {
  buildCsvContent,
  exportToCsv,
  sanitizeCsvCell,
} from "@/lib/admin/shared";

describe("Reusable Admin Table CSV Exporter", () => {
  test("sanitizeCsvCell prevents formula injection for leading =, +, -, @", () => {
    expect(sanitizeCsvCell("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
    expect(sanitizeCsvCell("+12345")).toBe("'+12345");
    expect(sanitizeCsvCell("-50.00")).toBe("'-50.00");
    expect(sanitizeCsvCell("@malicious_cmd")).toBe("'@malicious_cmd");
    expect(sanitizeCsvCell("Normal Text")).toBe("Normal Text");
    expect(sanitizeCsvCell(1234)).toBe("1234");
    expect(sanitizeCsvCell(null)).toBe("");
    expect(sanitizeCsvCell(undefined)).toBe("");
  });

  test("sanitizeCsvCell escapes quotes and commas", () => {
    expect(sanitizeCsvCell('Product, "Special"')).toBe('"Product, ""Special"""');
    expect(sanitizeCsvCell("Multi\nLine")).toBe('"Multi\nLine"');
  });

  test("buildCsvContent includes UTF-8 BOM and joins rows properly", () => {
    const headers = ["Order #", "Customer", "Amount"];
    const rows = [
      ["VL-101", "Rahim", 1500],
      ["VL-102", "=BAD_FORMULA", 2500],
    ];

    const csv = buildCsvContent(headers, rows);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Order #,Customer,Amount");
    expect(csv).toContain("VL-101,Rahim,1500");
    expect(csv).toContain("VL-102,'=BAD_FORMULA,2500");
  });

  test("exportToCsv triggers DOM download safely in browser environment", () => {
    const mockClick = vi.fn();
    const mockAppendChild = vi.fn();
    const mockRemoveChild = vi.fn();

    vi.stubGlobal("window", {});
    vi.stubGlobal("document", {
      createElement: () => ({
        setAttribute: vi.fn(),
        click: mockClick,
        href: "",
      }),
      body: {
        appendChild: mockAppendChild,
        removeChild: mockRemoveChild,
      },
    });

    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:test-url"),
      revokeObjectURL: vi.fn(),
    });

    exportToCsv({
      filename: "test-orders",
      headers: ["ID", "Name"],
      rows: [["1", "Alice"]],
    });

    expect(mockAppendChild).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(mockRemoveChild).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});

describe("AdminTableMetaBar Reusable Component", () => {
  test("renders showing counter with singular and plural naming", () => {
    const pluralHtml = renderToStaticMarkup(
      <AdminTableMetaBar
        currentCount={15}
        totalFiltered={25}
        totalCount={50}
        itemName="order"
      />
    );
    expect(pluralHtml).toContain("Showing");
    expect(pluralHtml).toContain("15");
    expect(pluralHtml).toContain("25");
    expect(pluralHtml).toContain("orders");
    expect(pluralHtml).toContain("(filtered from 50)");

    const singularHtml = renderToStaticMarkup(
      <AdminTableMetaBar
        currentCount={1}
        totalFiltered={1}
        itemName="order"
      />
    );
    expect(singularHtml).toContain("1");
    expect(singularHtml).toContain("order");
  });

  test("shows reset filter button when active filters exist", () => {
    const htmlWithReset = renderToStaticMarkup(
      <AdminTableMetaBar
        currentCount={5}
        totalFiltered={5}
        totalCount={20}
        itemName="transaction"
        hasActiveFilters={true}
        onResetFilters={() => {}}
      />
    );
    expect(htmlWithReset).toContain("Reset filters");

    const htmlWithoutReset = renderToStaticMarkup(
      <AdminTableMetaBar
        currentCount={20}
        totalFiltered={20}
        totalCount={20}
        itemName="transaction"
        hasActiveFilters={false}
      />
    );
    expect(htmlWithoutReset).not.toContain("Reset filters");
  });
});

describe("AdminTableFilterSelect Reusable Component", () => {
  test("renders select element with all options and correct value", () => {
    const options = [
      { value: "ALL", label: "All Statuses" },
      { value: "ACTIVE", label: "Active" },
      { value: "INACTIVE", label: "Inactive" },
    ];

    const html = renderToStaticMarkup(
      <AdminTableFilterSelect
        value="ACTIVE"
        onChange={() => {}}
        options={options}
        ariaLabel="Filter by status"
      />
    );

    expect(html).toContain('aria-label="Filter by status"');
    expect(html).toContain("All Statuses");
    expect(html).toContain("Active");
    expect(html).toContain("Inactive");
  });
});

describe("buildFilterUrl Helper Function", () => {
  test("updates query parameters and automatically deletes pagination page", () => {
    const url = buildFilterUrl({
      currentSearchParams: "page=3&status=PENDING&q=hoodie",
      updates: { status: "DELIVERED" },
      basePath: "/admin/orders",
    });

    expect(url).toBe("/admin/orders?status=DELIVERED&q=hoodie");
    expect(url).not.toContain("page=");
  });

  test("removes parameters when value is null, undefined, empty, 'ALL' or 'all'", () => {
    const url = buildFilterUrl({
      currentSearchParams: "page=2&status=DELIVERED&provider=STEADFAST&q=shirt",
      updates: {
        status: "all",
        provider: "ALL",
        q: "",
      },
      basePath: "/admin/shipping",
    });

    expect(url).toBe("/admin/shipping");
  });

  test("constructs query string without basePath if omitted", () => {
    const url = buildFilterUrl({
      currentSearchParams: "page=1",
      updates: { segment: "VIP" },
    });

    expect(url).toBe("?segment=VIP");
  });
});
