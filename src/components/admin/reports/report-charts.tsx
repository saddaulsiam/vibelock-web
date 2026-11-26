"use client";

import * as React from "react";
import { CreditCard, PackageCheck, Radio, RotateCcw } from "lucide-react";
import { NativeSelect } from "@/components/ui/select-native";

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

function formatBdt(value: number) {
  return `৳${Math.round(value).toLocaleString("en-BD")}`;
}

function shortBdt(val: number) {
  if (val >= 100000) return `৳${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `৳${(val / 1000).toFixed(1)}K`;
  return `৳${Math.round(val)}`;
}

function cleanProductName(name: string) {
  if (name.includes("(") && name.includes(")") && name.length > 25) {
    const cleaned = name.replace(/\([a-f0-9-]{36}\)/i, "").trim();
    if (cleaned) return cleaned;
  }
  return name;
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
  const [productMetric, setProductMetric] = React.useState<"revenue" | "profit" | "units">("revenue");
  const [hoveredPoint, setHoveredPoint] = React.useState<TrendPoint | null>(null);

  // SVG Coordinates calculation for Revenue Trend Wave (Width: 640, Height: 200)
  const svgWidth = 640;
  const svgHeight = 200;
  const paddingX = 45;
  const paddingY = 25;
  const usableW = svgWidth - paddingX - 15;
  const usableH = svgHeight - paddingY * 2;

  const trendValues = trend.map((p) => Number(p.netSales) || 0);
  const maxSales = Math.max(...trendValues, 100);
  const midSales = maxSales / 2;

  const isSinglePoint = trend.length === 1;

  const coordinates = trend.map((p, idx) => {
    const x = isSinglePoint
      ? paddingX + usableW / 2
      : paddingX + (idx / Math.max(trend.length - 1, 1)) * usableW;
    const y = svgHeight - paddingY - ((Number(p.netSales) || 0) / maxSales) * usableH;
    return { x, y, ...p };
  });

  const pathD = isSinglePoint
    ? ""
    : coordinates
        .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
        .join(" ");

  const areaD =
    !isSinglePoint && coordinates.length > 0
      ? `${pathD} L ${coordinates[coordinates.length - 1].x.toFixed(1)} ${svgHeight - paddingY} L ${coordinates[0].x.toFixed(1)} ${svgHeight - paddingY} Z`
      : "";

  const topProducts = React.useMemo(() => products.slice(0, 10), [products]);
  const maxProducts = Math.max(
    ...topProducts.map((p) =>
      productMetric === "revenue" ? p.netSales : productMetric === "profit" ? p.profit : p.units
    ),
    1
  );

  const paymentTotal = payments.reduce((sum, p) => sum + p.sales, 0);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {/* ── 1. REVENUE VELOCITY WAVE CANVAS ── */}
      <div className="border-neutral-200/90 rounded-sm border bg-white p-5 shadow-xs">
        <div className="mb-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Radio className="text-vl-cyan-700 size-3 animate-pulse" />
            <h2 className="text-vl-dark-900 font-heading text-xs font-bold tracking-wider uppercase">
              Revenue Trajectory Wave
            </h2>
          </div>
          <span className="text-muted-foreground font-mono text-[10px]">Net sales by interval</span>
        </div>

        {trend.length > 0 ? (
          <div className="relative w-full">
            {/* Dynamic Absolute Hover Tooltip */}
            {hoveredPoint && (
              <div
                className="pointer-events-none absolute z-30 transition-all duration-75 ease-out"
                style={{
                  left: `${
                    (coordinates.find((c) => c.date === hoveredPoint.date)?.x ?? 0) / svgWidth * 100
                  }%`,
                  top: `${
                    (coordinates.find((c) => c.date === hoveredPoint.date)?.y ?? 0) / svgHeight * 100
                  }%`,
                  transform: "translate(-50%, calc(-100% - 12px))",
                }}
              >
                <div className="border-vl-dark-900 bg-vl-dark-900 rounded-md border px-3 py-2 font-mono text-white shadow-2xl">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-vl-cyan font-bold">
                      {new Intl.DateTimeFormat("en-BD", { month: "short", day: "numeric" }).format(
                        new Date(hoveredPoint.date)
                      )}
                    </span>
                    <span className="text-neutral-500">·</span>
                    <span className="font-extrabold text-white">{formatBdt(hoveredPoint.netSales)}</span>
                  </div>
                  <div className="text-neutral-400 mt-0.5 text-[10px]">
                    {hoveredPoint.orders} orders · COGS: {formatBdt(hoveredPoint.cogs)}
                  </div>
                </div>
              </div>
            )}

            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="h-44 w-full overflow-visible sm:h-52"
              aria-label="Revenue and orders trend"
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <defs>
                <pattern id="reportGridPattern" width="24" height="24" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1" fill="#94a3b8" opacity="0.3" />
                </pattern>
                <linearGradient id="reportWaveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.22" />
                  <stop offset="70%" stopColor="#0284c7" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Background Micro-Dot Layer */}
              <rect x={paddingX} y={paddingY} width={usableW} height={usableH} fill="url(#reportGridPattern)" />

              {/* Grid Lines & Benchmarks */}
              <g className="font-mono text-[9px] select-none">
                <text x="4" y={paddingY + 3} fill="#64748b">
                  {shortBdt(maxSales)}
                </text>
                <line
                  x1={paddingX}
                  y1={paddingY}
                  x2={svgWidth - 10}
                  y2={paddingY}
                  stroke="#cbd5e1"
                  strokeDasharray="4 4"
                />

                <text x="4" y={svgHeight / 2 + 3} fill="#64748b">
                  {shortBdt(midSales)}
                </text>
                <line
                  x1={paddingX}
                  y1={svgHeight / 2}
                  x2={svgWidth - 10}
                  y2={svgHeight / 2}
                  stroke="#cbd5e1"
                  strokeDasharray="4 4"
                />

                <text x="16" y={svgHeight - paddingY + 3} fill="#64748b">
                  ৳0
                </text>
                <line x1={paddingX} y1={svgHeight - paddingY} x2={svgWidth - 10} y2={svgHeight - paddingY} stroke="#cbd5e1" />
              </g>

              {/* Area & Line */}
              {areaD && <path d={areaD} fill="url(#reportWaveGradient)" />}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Coordinates */}
              {coordinates.map((c, i) => (
                <circle
                  key={i}
                  cx={c.x}
                  cy={c.y}
                  r={coordinates.length <= 14 ? 4.5 : 3}
                  className="fill-white stroke-[#0284c7] hover:r-6 hover:fill-[#0284c7] hover:stroke-white cursor-pointer transition-all"
                  strokeWidth="2"
                  onMouseEnter={() => setHoveredPoint(c)}
                />
              ))}
            </svg>

            {/* X-Axis Interval Labels */}
            <div className="text-muted-foreground flex items-center justify-between px-1 pt-1 font-mono text-[10px]">
              <span>
                {trend[0]
                  ? new Intl.DateTimeFormat("en-BD", { month: "short", day: "numeric" }).format(new Date(trend[0].date))
                  : ""}
              </span>
              <span>
                {trend[trend.length - 1]
                  ? new Intl.DateTimeFormat("en-BD", { month: "short", day: "numeric" }).format(
                      new Date(trend[trend.length - 1].date)
                    )
                  : ""}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground flex h-48 items-center justify-center font-mono text-xs">
            No sales curve data for this interval
          </div>
        )}
      </div>

      {/* ── 2. SALES VS COGS REALIZATION BARS (WITH PROFIT HEADER) ── */}
      <div className="border-neutral-200/90 rounded-sm border bg-white p-5 shadow-xs">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-vl-dark-900 font-heading text-xs font-bold tracking-wider uppercase">
              Sales vs Cost Realization
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs">Net sales vs item acquisition COGS</p>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px]">
            <span className="flex items-center gap-1.5 text-neutral-700">
              <span className="size-2 rounded-full bg-cyan-600" /> Net Sales
            </span>
            <span className="flex items-center gap-1.5 text-neutral-700">
              <span className="size-2 rounded-full bg-amber-500" /> COGS
            </span>
            <span className="flex items-center gap-1.5 text-emerald-800 font-bold">
              <span className="size-2 rounded-full bg-emerald-600" /> Profit
            </span>
          </div>
        </div>

        {/* Clear Sub-Header Row to Explain the Profit Numbers on the Right */}
        <div className="mb-2.5 flex items-center justify-between border-b border-neutral-100 pb-1.5 font-mono text-[10px] text-neutral-400 uppercase">
          <span>Date</span>
          <span>Sales &amp; Cost Proportion</span>
          <span className="text-right">Daily Profit</span>
        </div>

        {trend.length ? (
          <div className="space-y-3">
            {trend.slice(-7).map((point) => (
              <div
                key={new Date(point.date).toISOString()}
                className="grid grid-cols-[4.5rem_1fr_4.5rem] items-center gap-3 text-xs"
              >
                <span className="text-muted-foreground font-mono text-[11px]">
                  {new Date(point.date).toLocaleDateString("en-BD", { month: "short", day: "numeric" })}
                </span>
                <div className="space-y-1">
                  <div className="h-2 rounded-full bg-neutral-100">
                    <div
                      className="h-2 rounded-full bg-cyan-600 transition-all"
                      style={{ width: `${Math.min((point.netSales / maxSales) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="h-2 rounded-full bg-neutral-100">
                    <div
                      className="h-2 rounded-full bg-amber-500 transition-all"
                      style={{ width: `${Math.min((point.cogs / maxSales) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <span className="text-right font-mono text-[11px] font-bold text-emerald-800">
                  +{shortBdt(point.grossProfit)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground flex h-48 items-center justify-center font-mono text-xs">
            COGS is unavailable for this period
          </div>
        )}
      </div>

      {/* ── 3. TOP PRODUCTS PERFORMANCE (COLUMN 1) ── */}
      <div className="border-neutral-200/90 rounded-sm border bg-white p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <PackageCheck className="text-vl-dark-900 size-3.5" />
                <h2 className="text-vl-dark-900 font-heading text-xs font-bold tracking-wider uppercase">
                  Top Products Performance
                </h2>
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs">Top volume and merchandise contributors</p>
            </div>
            <NativeSelect
              value={productMetric}
              onChange={(event) => setProductMetric(event.target.value as typeof productMetric)}
              size="sm"
              className="w-auto font-mono text-xs"
            >
              <option value="revenue">Net Revenue</option>
              <option value="profit">Gross Profit</option>
              <option value="units">Units Sold</option>
            </NativeSelect>
          </div>

          <div className="space-y-3">
            {topProducts.length ? (
              topProducts.map((product) => {
                const val =
                  productMetric === "revenue"
                    ? product.netSales
                    : productMetric === "profit"
                      ? product.profit
                      : product.units;
                return (
                  <div
                    key={product.sku}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(6rem,1.8fr)_auto] items-center gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="text-vl-dark-900 truncate font-semibold" title={product.productName}>
                        {cleanProductName(product.productName)}
                      </p>
                      <p className="text-muted-foreground font-mono text-[10px] truncate">{product.sku}</p>
                    </div>
                    <div className="h-2 rounded-full bg-neutral-100">
                      <div
                        className="bg-vl-cyan-700 h-2 rounded-full transition-all"
                        style={{ width: `${Math.max((val / maxProducts) * 100, 3)}%` }}
                      />
                    </div>
                    <span className="text-vl-dark-900 font-mono text-xs font-bold">
                      {productMetric === "units" ? `${val} pcs` : shortBdt(val)}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground py-8 text-center text-xs">
                No product sales in this period.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. BALANCED COLUMN 2: SETTLEMENT MIX + MERCHANDISE RETENTION PULSE ── */}
      <div className="flex flex-col gap-6">
        {/* 4A. PAYMENT CHANNEL MIX */}
        <div className="border-neutral-200/90 rounded-sm border bg-white p-5 shadow-xs">
          <div className="mb-3.5">
            <div className="flex items-center gap-2">
              <CreditCard className="text-vl-dark-900 size-3.5" />
              <h2 className="text-vl-dark-900 font-heading text-xs font-bold tracking-wider uppercase">
                Settlement Channel Mix
              </h2>
            </div>
            <p className="text-muted-foreground mt-0.5 text-xs">Sales distribution by payment provider</p>
          </div>

          <div className="space-y-3">
            {payments.length ? (
              payments.map((payment, index) => {
                const percentage = paymentTotal > 0 ? (payment.sales / paymentTotal) * 100 : 0;
                return (
                  <div
                    key={payment.method}
                    className="space-y-1.5 rounded-sm border border-neutral-100 bg-neutral-50/50 p-2.5"
                  >
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-neutral-900">
                        {payment.method === "COD" ? "Cash on Delivery (COD)" : payment.method}
                      </span>
                      <span className="font-mono font-bold">{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-neutral-200/80">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          index % 2 === 0 ? "bg-cyan-600" : "bg-emerald-600"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-muted-foreground flex justify-between font-mono text-[10px]">
                      <span>{payment.orders.toLocaleString("en-BD")} orders</span>
                      <span className="font-bold text-neutral-800">{formatBdt(payment.sales)}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground py-4 text-center text-xs">
                No payment transactions in this period.
              </p>
            )}
          </div>
        </div>

        {/* 4B. MERCHANDISE RETENTION & RETURN PULSE (ELIMINATES THE STANDALONE FULL-WIDTH CARD) */}
        <div className="border-neutral-200/90 rounded-sm border bg-white p-5 shadow-xs flex-1 flex flex-col justify-between">
          <div>
            <div className="mb-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="size-3.5 text-amber-600" />
                <h2 className="text-vl-dark-900 font-heading text-xs font-bold tracking-wider uppercase">
                  Merchandise Retention Pulse
                </h2>
              </div>
              <span className="border-amber-300 bg-amber-50 text-amber-950 font-mono text-[10px] font-bold rounded px-2 py-0.5 border">
                {returnRate.toFixed(1)}% Return Rate
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 font-mono text-xs">
              <div className="rounded border border-neutral-100 bg-neutral-50/60 p-2.5">
                <span className="text-muted-foreground text-[9px] uppercase font-sans font-semibold">
                  Sold Units
                </span>
                <p className="text-vl-dark-900 text-base font-bold mt-0.5">
                  {soldUnits.toLocaleString("en-BD")}
                </p>
              </div>
              <div className="rounded border border-neutral-100 bg-neutral-50/60 p-2.5">
                <span className="text-muted-foreground text-[9px] uppercase font-sans font-semibold">
                  Returned
                </span>
                <p className="text-amber-900 text-base font-bold mt-0.5">
                  {returnedUnits.toLocaleString("en-BD")}
                </p>
              </div>
              <div className="rounded border border-neutral-100 bg-neutral-50/60 p-2.5">
                <span className="text-muted-foreground text-[9px] uppercase font-sans font-semibold">
                  Retained
                </span>
                <p className="text-emerald-800 text-base font-bold mt-0.5">
                  {(soldUnits - returnedUnits).toLocaleString("en-BD")}
                </p>
              </div>
              <div className="rounded border border-neutral-100 bg-neutral-50/60 p-2.5">
                <span className="text-muted-foreground text-[9px] uppercase font-sans font-semibold">
                  Ret Value
                </span>
                <p className="text-red-800 text-base font-bold mt-0.5">
                  {formatBdt(returnedValue)}
                </p>
              </div>
            </div>
          </div>

          {/* Visual Retention Bar */}
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
              <span>Retained: {Math.max(100 - returnRate, 0).toFixed(1)}%</span>
              <span>Returned: {returnRate.toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 flex">
              <div
                className="bg-emerald-500 h-full transition-all"
                style={{ width: `${Math.max(100 - returnRate, 0)}%` }}
                title="Retained Volume"
              />
              <div
                className="bg-amber-500 h-full transition-all"
                style={{ width: `${Math.min(returnRate, 100)}%` }}
                title="Returned Volume"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
