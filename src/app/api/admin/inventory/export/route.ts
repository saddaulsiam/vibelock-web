import { NextRequest, NextResponse } from "next/server";
import { AuthRequiredError, ForbiddenError, requireRole } from "@/lib/auth/authorization";
import { getAdminInventoryForExport, type InventoryFilter } from "@/lib/admin/inventory-queries";

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  const rawText = String(value);
  const text = /^\s*[=+\-@]/.test(rawText) ? `'${rawText}` : rawText;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csv(rows: unknown[][]): string {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

function parseFilter(filter: string | null): InventoryFilter {
  if (filter === "in-stock" || filter === "low-stock" || filter === "out-of-stock") {
    return filter;
  }
  return "all";
}

export async function GET(request: NextRequest) {
  try {
    await requireRole("ADMIN", { throw: true });

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("q") ?? searchParams.get("search") ?? undefined;
    const filter = parseFilter(searchParams.get("filter"));

    const result = await getAdminInventoryForExport({ search, filter });

    const dateStr = new Date().toISOString().slice(0, 10);
    const filterSuffix = filter !== "all" ? `-${filter}` : "";
    const filename = result.isTruncated
      ? `vibelock-inventory-${dateStr}${filterSuffix}-truncated-5000-of-${result.totalCount}.csv`
      : `vibelock-inventory-${dateStr}${filterSuffix}.csv`;

    const rows: unknown[][] = [
      [
        "Product Name",
        "SKU",
        "Size",
        "Color",
        "Physical Stock",
        "Reserved Stock",
        "Available Stock",
        "Cost Price",
        "Selling Price",
        "Estimated Cost Value (Current Cost)",
        "Estimated Retail Value",
        "Status",
      ],
    ];

    for (const item of result.items) {
      rows.push([
        item.productName,
        item.sku,
        item.size ?? "—",
        item.color ?? "—",
        item.physicalStock,
        item.reservedStock,
        item.availableStock,
        item.costPrice.toFixed(2),
        item.sellingPrice.toFixed(2),
        item.estimatedCostValue.toFixed(2),
        item.estimatedRetailValue.toFixed(2),
        item.status,
      ]);
    }

    return new NextResponse(csv(rows), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Inventory-Total-Count": String(result.totalCount),
        "X-Inventory-Export-Limit": String(result.limit),
        "X-Inventory-Truncated": result.isTruncated ? "true" : "false",
      },
    });
  } catch (error) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: error instanceof AuthRequiredError ? 401 : 403 }
      );
    }
    throw error;
  }
}
