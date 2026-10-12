import { NextRequest, NextResponse } from "next/server";
import { AuthRequiredError, ForbiddenError, requireRole } from "@/lib/auth/authorization";
import {
  getAdminInventoryIntelligenceForExport,
  type InventoryIntelligenceWindow,
} from "@/lib/admin/inventory-intelligence-queries";

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
  return `﻿${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

export async function GET(request: NextRequest) {
  try {
    await requireRole("ADMIN", { throw: true });

    const searchParams = request.nextUrl.searchParams;
    const window = (searchParams.get("window") ?? "90d") as InventoryIntelligenceWindow;
    const status = searchParams.get("status") ?? undefined;
    const search = searchParams.get("q") ?? searchParams.get("search") ?? undefined;
    const sort = searchParams.get("sort") ?? undefined;

    const result = await getAdminInventoryIntelligenceForExport({
      window,
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
