import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ForbiddenError, AuthRequiredError, requireRole } from "@/lib/auth/authorization";
import { getAdminOrderProfitability, getAdminReport } from "@/lib/admin/reports";

const reportsExportQuerySchema = z.object({
  type: z.enum(["sales", "products", "orders"]).optional().default("sales"),
  range: z.enum(["7d", "30d", "90d", "12m", "all", "custom"]).optional().default("30d"),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (expected YYYY-MM-DD)").optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (expected YYYY-MM-DD)").optional(),
  sort: z.string().trim().max(50, "Sort parameter must not exceed 50 characters").optional(),
  search: z.string().trim().max(100, "Search parameter must not exceed 100 characters").optional(),
});

export function csvCell(value: unknown) {
  const rawText = value === null || value === undefined ? "" : String(value);
  const text = /^[=+\-@]/.test(rawText.trim()) ? `'${rawText}` : rawText;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
export function csv(rows: unknown[][]) {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
function date(value: Date) {
  return value.toISOString().slice(0, 10);
}
function filename(type: string, start: Date, end: Date) {
  return `vibelock-${type}-report-${date(start)}-to-${date(new Date(end.getTime() - 1))}.csv`;
}

export async function GET(request: NextRequest) {
  try {
    await requireRole("MANAGER", { throw: true });

    const searchParams = request.nextUrl.searchParams;
    const rawFrom = searchParams.get("from") || undefined;
    const rawTo = searchParams.get("to") || undefined;
    const rawSort = searchParams.get("sort") || undefined;
    const rawSearch = searchParams.get("q") || undefined;

    const parseResult = reportsExportQuerySchema.safeParse({
      type: searchParams.get("type") ?? undefined,
      range: searchParams.get("range") ?? undefined,
      from: rawFrom,
      to: rawTo,
      sort: rawSort,
      search: rawSearch,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid export parameters", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { type, range, from, to, sort, search } = parseResult.data;
    const currentFilters = { range, from, to, sort, search };
    const report = await getAdminReport(currentFilters);
    let rows: unknown[][] = [];
    if (type === "sales")
      rows = [
        [
          "Date",
          "Orders",
          "Gross Sales",
          "Discounts",
          "Net Sales",
          "Refunds",
          "COGS",
          "Gross Profit",
        ],
        ...report.trend.map((row) => [
          date(row.date),
          row.orders,
          row.grossSales,
          row.discounts,
          row.netSales,
          row.refunds,
          row.cogs,
          row.grossProfit,
        ]),
      ];
    else if (type === "products") {
      rows = [
        [
          "Product",
          "SKU",
          "Sold Units",
          "Returned Units",
          "Net Units",
          "Return Rate",
          "Gross Sales",
          "Discounts",
          "Net Sales",
          "COGS",
          "Gross Profit",
          "Margin",
        ],
        ...report.products.map((row) => [
          row.productName,
          row.sku,
          row.soldUnits,
          row.returnedUnits,
          row.netUnits,
          row.returnRate === null ? "—" : `${row.returnRate.toFixed(2)}%`,
          row.grossSales,
          row.discounts,
          row.netSales,
          row.cogs,
          row.profit,
          row.margin === null ? "Unavailable" : `${row.margin.toFixed(2)}%`,
        ]),
      ];
    } else if (type === "orders") {
      const firstPage = await getAdminOrderProfitability({ ...currentFilters, page: 1 });
      const allOrders = [...firstPage.orders];
      for (let page = 2; page <= firstPage.totalPages; page += 1) {
        const nextPage = await getAdminOrderProfitability({ ...currentFilters, page });
        allOrders.push(...nextPage.orders);
      }
      rows = [
        [
          "Order Number",
          "Date",
          "Customer",
          "Status",
          "Payment Method",
          "Gross Sales",
          "Discount",
          "Net Sales",
          "Refund",
          "COGS",
          "Gross Profit",
          "Margin",
        ],
        ...allOrders.map((row) => [
          row.orderNumber,
          date(row.createdAt),
          row.customerName ?? "Guest",
          row.status,
          row.paymentMethod,
          row.grossSales,
          row.discount,
          row.grossSales - row.discount - row.refunds,
          row.refunds,
          row.cogs,
          row.profit,
          row.margin === null ? "Unavailable" : `${row.margin.toFixed(2)}%`,
        ]),
      ];
    } else return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
    return new NextResponse(csv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename(type, report.start, report.end)}"`,
      },
    });
  } catch (error) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError)
      return NextResponse.json(
        { error: "Forbidden" },
        { status: error instanceof AuthRequiredError ? 401 : 403 }
      );
    throw error;
  }
}
