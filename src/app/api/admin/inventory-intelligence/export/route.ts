import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthRequiredError, ForbiddenError, requireRole } from "@/lib/auth/authorization";
import {
  getAdminInventoryIntelligenceForExport,
  type InventoryIntelligenceWindow,
} from "@/lib/admin/inventory";

const inventoryIntelligenceExportQuerySchema = z.object({
  window: z.enum(["30d", "60d", "90d"]).optional().default("90d"),
  status: z
    .enum(["all", "negative", "out-of-stock", "stockout-risk", "dead", "slow", "healthy"])
    .optional(),
  search: z.string().trim().max(100, "Search parameter must not exceed 100 characters").optional(),
  sort: z.enum(["valuation", "stock", "velocity", "age", "runout"]).optional(),
});

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

export async function GET(request: NextRequest) {
  try {
    await requireRole("MANAGER", { throw: true });

    const searchParams = request.nextUrl.searchParams;
    const rawSearch = searchParams.get("q") ?? searchParams.get("search") ?? undefined;

    const parseResult = inventoryIntelligenceExportQuerySchema.safeParse({
      window: searchParams.get("window") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      search: rawSearch || undefined,
      sort: searchParams.get("sort") ?? undefined,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid export query parameters", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { window, status, search, sort } = parseResult.data;

    const result = await getAdminInventoryIntelligenceForExport({
      window: window as InventoryIntelligenceWindow,
      status,
      search,
      sort,
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    const statusSuffix = status && status !== "all" ? `-${status}` : "";
    const filename = result.isTruncated
      ? `vibelock-inventory-intelligence-${result.window}-${dateStr}${statusSuffix}-truncated-5000-of-${result.totalCount}.csv`
      : `vibelock-inventory-intelligence-${result.window}-${dateStr}${statusSuffix}.csv`;

    const headers = [
      "Product Name",
      "SKU",
      "Size",
      "Color",
      "Physical Stock",
      "Reserved Stock",
      "Available Stock",
      "Cost Price",
      "Selling Price",
      "Available Cost Value",
      "Physical Cost Value",
      "Sold Units",
      "Returned Units",
      "Net Retained Units",
      "Daily Velocity",
      "Days Since Last Inflow",
      "Days of Supply",
      "Suggested Restock (30d)",
      "Status",
    ];

    const rows: unknown[][] = [headers];

    for (const item of result.items) {
      rows.push([
        item.productName,
        item.sku,
        item.size ?? "—",
        item.color ?? "—",
        item.physicalStock,
        item.reservedStock,
        item.availableStock,
        item.costUnavailable ? "N/A" : item.costPrice.toFixed(2),
        item.sellingPrice.toFixed(2),
        item.availableCostValue.toFixed(2),
        item.physicalCostValue.toFixed(2),
        item.soldUnits,
        item.returnedUnits,
        item.netRetainedUnits,
        item.dailyVelocity.toFixed(4),
        item.daysSinceLastInflow !== null ? item.daysSinceLastInflow : "Unavailable",
        item.daysOfSupply !== null ? item.daysOfSupply.toFixed(1) : "Unavailable",
        item.suggestedRestockQty !== null ? item.suggestedRestockQty : "—",
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
