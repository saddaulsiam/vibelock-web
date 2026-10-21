"use client";

import { useMemo, useState } from "react";

type TrendPoint = {
  date: Date;
  netSales: number;
  orders: number;
  cogs: number;
  grossProfit: number;
};
type ProductPoint = {
  productName: string;
  sku: string;
  netSales: number;
  profit: number;
  units: number;
};
type PaymentPoint = { method: string; orders: number; sales: number };

const currency = (value: number) =>
  `৳${value.toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
const shortCurrency = (value: number) =>
  value >= 1000 ? `৳${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K` : currency(value);

function axisPoints(values: number[], width: number, height: number, max = Math.max(...values, 1)) {
  return values
    .map(
      (value, index) =>
        `${(index / Math.max(values.length - 1, 1)) * width},${height - (value / max) * height}`
    )
    .join(" ");
}

export function ReportCharts({
  trend,
  products,
  payments,
  soldUnits,
  returnedUnits,
  returnRate,
  returnedValue,
}: {
  trend: TrendPoint[];
  products: ProductPoint[];
  payments: PaymentPoint[];
  soldUnits: number;
  returnedUnits: number;
  returnRate: number;
  returnedValue: number;
}) {
  const [productMetric, setProductMetric] = useState<"revenue" | "profit" | "units">("revenue");
  const trendValues = trend.map((point) => point.netSales);
  const maxSales = Math.max(...trendValues, 1);
  const maxProducts = Math.max(
    ...products
      .slice(0, 10)
      .map(
        (product) =>
          product[
            productMetric === "revenue"
              ? "netSales"
              : productMetric === "profit"
                ? "profit"
                : "units"
          ]
      ),
    1
  );
  const paymentTotal = payments.reduce((sum, payment) => sum + payment.sales, 0);
  const topProducts = useMemo(() => products.slice(0, 10), [products]);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="bg-card rounded-2xl border p-5 shadow-sm">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Revenue trend</h2>
            <p className="text-muted-foreground mt-1 text-sm">Net sales and order volume by day</p>
          </div>
          <span className="text-muted-foreground text-xs">৳ / orders</span>
        </div>
        {trend.length ? (
          <div className="relative h-64">
            <svg
              viewBox="0 0 640 220"
              className="h-full w-full overflow-visible"
              role="img"
              aria-label="Revenue and orders trend"
            >
              <path
                d={`M ${axisPoints(trendValues, 640, 190, maxSales)}`}
                fill="none"
                stroke="#00a8c6"
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
              />
              {trend.map((point, index) => {
                const x = (index / Math.max(trend.length - 1, 1)) * 640;
                const y = 190 - (point.netSales / maxSales) * 190;
                return (
                  <circle key={point.date.toISOString()} cx={x} cy={y} r="4" fill="#00a8c6">
                    <title>{`${point.date.toLocaleDateString("en-BD")}: ${currency(point.netSales)}, ${point.orders} orders`}</title>
                  </circle>
                );
              })}
            </svg>
            <div className="text-muted-foreground absolute inset-x-0 bottom-0 flex justify-between text-[10px]">
              <span>{trend[0]?.date.toLocaleDateString("en-BD")}</span>
              <span>{trend.at(-1)?.date.toLocaleDateString("en-BD")}</span>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
            No sales in this period.
          </div>
        )}
        <div className="text-muted-foreground mt-3 flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-2">
            <i className="size-2 rounded-full bg-[#00a8c6]" /> Net sales
          </span>
          <span>Hover points for exact values</span>
        </div>
      </div>

      <div className="bg-card rounded-2xl border p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="font-semibold">Sales vs cost</h2>
          <p className="text-muted-foreground mt-1 text-sm">Historical COGS and gross profit</p>
        </div>
        {trend.length ? (
          <div className="space-y-4">
            {trend.slice(-8).map((point) => (
              <div
                key={point.date.toISOString()}
                className="grid grid-cols-[5rem_1fr_auto] items-center gap-3 text-xs"
              >
                <span className="text-muted-foreground">
                  {point.date.toLocaleDateString("en-BD", { month: "short", day: "numeric" })}
                </span>
                <div className="space-y-1">
                  <div className="h-2 rounded-full bg-cyan-100">
                    <div
                      className="h-2 rounded-full bg-cyan-500"
                      style={{ width: `${(point.netSales / maxSales) * 100}%` }}
                    />
                  </div>
                  <div className="h-2 rounded-full bg-amber-100">
                    <div
                      className="h-2 rounded-full bg-amber-500"
                      style={{ width: `${(point.cogs / maxSales) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-right">{shortCurrency(point.grossProfit)}</span>
              </div>
            ))}
            <div className="text-muted-foreground flex gap-4 pt-2 text-xs">
              <span className="inline-flex items-center gap-2">
                <i className="size-2 rounded-full bg-cyan-500" /> Net sales
              </span>
              <span className="inline-flex items-center gap-2">
                <i className="size-2 rounded-full bg-amber-500" /> COGS
              </span>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground flex h-48 items-center justify-center text-sm">
            COGS is unavailable for this period.
          </div>
        )}
      </div>

      <div className="bg-card rounded-2xl border p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Top products</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Top 10 from the existing product aggregation
            </p>
          </div>
          <select
            value={productMetric}
            onChange={(event) => setProductMetric(event.target.value as typeof productMetric)}
            className="bg-background h-8 rounded-md border px-2 text-xs"
          >
            <option value="revenue">Revenue</option>
            <option value="profit">Gross profit</option>
            <option value="units">Units sold</option>
          </select>
        </div>
        <div className="space-y-3">
          {topProducts.length ? (
            topProducts.map((product) => {
              const value =
                product[
                  productMetric === "revenue"
                    ? "netSales"
                    : productMetric === "profit"
                      ? "profit"
                      : "units"
                ];
              return (
                <div
                  key={product.sku}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(7rem,2fr)_auto] items-center gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{product.productName}</p>
                    <p className="text-muted-foreground truncate">{product.sku}</p>
                  </div>
                  <div className="bg-muted h-2 rounded-full">
                    <div
                      className="h-2 rounded-full bg-[#00a8c6]"
                      style={{ width: `${Math.max((value / maxProducts) * 100, 2)}%` }}
                    />
                  </div>
                  <span className="text-right font-medium">
                    {productMetric === "units" ? value.toLocaleString() : shortCurrency(value)}
                  </span>
                </div>
              );
            })
          ) : (
            <p className="text-muted-foreground py-10 text-center text-sm">
              No product sales in this period.
            </p>
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl border p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="font-semibold">Payment mix</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Sales by method from the selected period
          </p>
        </div>
        <div className="space-y-4">
          {payments.length ? (
            payments.map((payment, index) => {
              const percentage = paymentTotal > 0 ? (payment.sales / paymentTotal) * 100 : 0;
              return (
                <div key={payment.method} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{payment.method === "COD" ? "Cash on delivery" : payment.method}</span>
                    <span className="font-medium">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="bg-muted h-2 rounded-full">
                    <div
                      className={`h-2 rounded-full ${index % 2 ? "bg-amber-500" : "bg-[#00a8c6]"}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-muted-foreground flex justify-between text-xs">
                    <span>{payment.orders.toLocaleString()} orders</span>
                    <span>{currency(payment.sales)}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-muted-foreground py-10 text-center text-sm">
              No payment data in this period.
            </p>
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl border p-5 shadow-sm xl:col-span-2">
        <div className="mb-5">
          <h2 className="font-semibold">Return performance</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Returned units compared with sold units
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground text-xs">Sold units</p>
            <p className="mt-1 text-2xl font-semibold">{soldUnits.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Returned units</p>
            <p className="mt-1 text-2xl font-semibold">{returnedUnits.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Return rate</p>
            <p className="mt-1 text-2xl font-semibold">{returnRate.toFixed(2)}%</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Returned value</p>
            <p className="mt-1 text-2xl font-semibold">{currency(returnedValue)}</p>
          </div>
        </div>
        <div className="bg-muted mt-5 h-3 overflow-hidden rounded-full">
          <div
            className="h-full rounded-full bg-rose-400"
            style={{ width: `${Math.min(returnRate, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
