import { NextRequest, NextResponse } from "next/server";
import { ForbiddenError, AuthRequiredError, requireRole } from "@/lib/auth/authorization";
import { getAdminOrderProfitability, getAdminReport } from "@/lib/admin/report-queries";

export function csvCell(value: unknown) {
  const rawText = value === null || value === undefined ? "" : String(value);
  const text = /^[=+\-@]/.test(rawText.trim()) ? `'${rawText}` : rawText;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
export function csv(rows: unknown[][]) {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
function filters(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  return { range: search.get("range") ?? "30d", from: search.get("from") ?? undefined, to: search.get("to") ?? undefined, sort: search.get("sort") ?? undefined, search: search.get("q") ?? undefined };
}
function date(value: Date) { return value.toISOString().slice(0, 10); }
function filename(type: string, start: Date, end: Date) { return `vibelock-${type}-report-${date(start)}-to-${date(new Date(end.getTime() - 1))}.csv`; }

export async function GET(request: NextRequest) {
  try {
    await requireRole("ADMIN", { throw: true });
    const type = request.nextUrl.searchParams.get("type") ?? "sales";
    const report = await getAdminReport(filters(request));
    const currentFilters = filters(request);
    let rows: unknown[][] = [];
    if (type === "sales") rows = [["Date", "Orders", "Gross Sales", "Discounts", "Net Sales", "Refunds", "COGS", "Gross Profit"], ...report.trend.map((row) => [date(row.date), row.orders, row.grossSales, row.discounts, row.netSales, row.refunds, row.cogs, row.grossProfit])];
    else if (type === "products") rows = [["Product", "SKU", "Units Sold", "Gross Sales", "Discounts", "Net Sales", "Returned Units", "COGS", "Gross Profit", "Margin"], ...report.products.map((row) => [row.productName, row.sku, row.units, row.grossSales, row.discounts, row.netSales, row.returnedUnits, row.cogs, row.profit, row.margin === null ? "Unavailable" : `${row.margin.toFixed(2)}%`])];
    else if (type === "orders") {
      const firstPage = await getAdminOrderProfitability({ ...currentFilters, page: 1 });
      const pages = await Promise.all(Array.from({ length: Math.max(firstPage.totalPages, 1) - 1 }, (_, index) => getAdminOrderProfitability({ ...currentFilters, page: index + 2 })));
      const allOrders = [firstPage, ...pages].flatMap((page) => page.orders);
      rows = [["Order Number", "Date", "Customer", "Status", "Payment Method", "Gross Sales", "Discount", "Net Sales", "Refund", "COGS", "Gross Profit", "Margin"], ...allOrders.map((row) => [row.orderNumber, date(row.createdAt), row.customerName ?? "Guest", row.status, row.paymentMethod, row.grossSales, row.discount, row.grossSales - row.discount - row.refunds, row.refunds, row.cogs, row.profit, row.margin === null ? "Unavailable" : `${row.margin.toFixed(2)}%`])];
    } else return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
    return new NextResponse(csv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename(type, report.start, report.end)}"` } });
  } catch (error) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: error instanceof AuthRequiredError ? 401 : 403 });
    throw error;
  }
}
