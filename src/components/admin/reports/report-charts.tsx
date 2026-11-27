"use client";

import * as React from "react";
import {
  BarChart2,
  Layers,
  PackageCheck,
  PieChart,
  Radio,
  RotateCcw,
  TrendingUp,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

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
  const [productMetric, setProductMetric] = React.useState<"revenue" | "profit" | "units">(
    "revenue"
  );
  const [chartMode, setChartMode] = React.useState<"wave" | "bars" | "cumulative">("wave");
  const [trendMetric, setTrendMetric] = React.useState<"netSales" | "grossProfit" | "orders">(
    "netSales"
  );
  const [hoveredPoint, setHoveredPoint] = React.useState<
    (TrendPoint & { x: number; y: number; val: number }) | null
  >(null);
  const svgRef = React.useRef<SVGSVGElement | null>(null);

  // SVG Coordinates calculation for Revenue Trend Wave (Width: 640, Height: 200)
  const svgWidth = 640;
  const svgHeight = 200;
  const paddingX = 45;
  const paddingY = 25;
  const usableW = svgWidth - paddingX - 15;
  const usableH = svgHeight - paddingY * 2;

  const getMetricValue = React.useCallback(
    (p: TrendPoint) => {
      if (trendMetric === "grossProfit") return Number(p.grossProfit) || 0;
      if (trendMetric === "orders") return Number(p.orders) || 0;
      return Number(p.netSales) || 0;
    },
    [trendMetric]
  );

  const cumulativeValues = React.useMemo(() => {
    return trend.reduce<number[]>((acc, p) => {
      const last = acc.length > 0 ? acc[acc.length - 1] : 0;
      return [...acc, last + getMetricValue(p)];
    }, []);
  }, [trend, getMetricValue]);

  const activeValues =
    chartMode === "cumulative" ? cumulativeValues : trend.map((p) => getMetricValue(p));
  const maxVal = Math.max(...activeValues, 10);
  const midVal = maxVal / 2;

  const isSinglePoint = trend.length === 1;

  const coordinates = trend.map((p, idx) => {
    const val = chartMode === "cumulative" ? cumulativeValues[idx] : getMetricValue(p);
    const x = isSinglePoint
      ? paddingX + usableW / 2
      : paddingX + (idx / Math.max(trend.length - 1, 1)) * usableW;
    const y = svgHeight - paddingY - (val / maxVal) * usableH;
    return { x, y, val, ...p };
  });

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || coordinates.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const relativeX = (mouseX / rect.width) * svgWidth;

    let closest = coordinates[0];
    let minDiff = Math.abs(relativeX - closest.x);

    for (let i = 1; i < coordinates.length; i++) {
      const diff = Math.abs(relativeX - coordinates[i].x);
      if (diff < minDiff) {
        minDiff = diff;
        closest = coordinates[i];
      }
    }

    setHoveredPoint(closest);
  };

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
  const onlinePayment = payments.find((p) => p.method !== "COD")?.sales ?? 0;
  const codPayment = payments.find((p) => p.method === "COD")?.sales ?? 0;
  const onlinePct = paymentTotal > 0 ? (onlinePayment / paymentTotal) * 100 : 0;
  const codPct = paymentTotal > 0 ? (codPayment / paymentTotal) * 100 : 0;

  return (
    <div className="grid gap-6 xl:grid-cols-2 print:grid-cols-2 print:gap-4">
      {/* ── 1. REVENUE VELOCITY WAVE CANVAS (WITH CHART TYPE SWITCHER) ── */}
      <div className="rounded-sm border border-neutral-200/90 bg-white p-5 shadow-xs print:break-inside-avoid print:border-neutral-300 print:shadow-none">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Radio className="text-vl-cyan-700 size-3 animate-pulse" />
            <h2 className="text-vl-dark-900 font-heading text-xs font-bold tracking-wider uppercase">
              {chartMode === "bars"
                ? "Daily Trajectory Columns"
                : chartMode === "cumulative"
                  ? "Cumulative Revenue Progression"
                  : "Revenue Trajectory Wave"}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {/* Chart Mode Toggle via design-system Tabs */}
            <Tabs
              value={chartMode}
              size="sm"
              onValueChange={(val) => {
                if (val) setChartMode(val as typeof chartMode);
              }}
            >
              <TabsList>
                <TabsTrigger value="wave" title="Continuous Area Wave">
                  <TrendingUp className="size-3" />
                  <span>Wave</span>
                </TabsTrigger>
                <TabsTrigger value="bars" title="Discrete Daily Columns">
                  <BarChart2 className="size-3" />
                  <span>Columns</span>
                </TabsTrigger>
                <TabsTrigger value="cumulative" title="Running Cumulative Total">
                  <Layers className="size-3" />
                  <span>Cumulative</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Metric Selector */}
            <Select
              value={trendMetric}
              onValueChange={(val) => {
                if (val) setTrendMetric(val as typeof trendMetric);
              }}
            >
              <SelectTrigger
                size="sm"
                className="h-7 w-auto min-w-32.5 bg-white font-mono text-[11px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="netSales">Net Sales (৳)</SelectItem>
                <SelectItem value="grossProfit">Gross Profit (৳)</SelectItem>
                <SelectItem value="orders">Orders (#)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {trend.length > 0 ? (
          <div className="relative w-full">
            {/* Dynamic Absolute Hover Tooltip (Stripe Glassmorphism Card) */}
            {hoveredPoint && (
              <div
                className="pointer-events-none absolute z-30 transition-all duration-75 ease-out print:hidden"
                style={{
                  left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                  top: `${(hoveredPoint.y / svgHeight) * 100}%`,
                  transform:
                    hoveredPoint.x > svgWidth * 0.72
                      ? "translate(-90%, calc(-100% - 14px))"
                      : hoveredPoint.x < svgWidth * 0.28
                        ? "translate(-10%, calc(-100% - 14px))"
                        : "translate(-50%, calc(-100% - 14px))",
                }}
              >
                <div className="border-vl-dark-900 bg-vl-dark-950/95 min-w-48 rounded-lg border p-3 font-mono text-white shadow-2xl backdrop-blur-md">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5 text-xs">
                    <span className="font-semibold text-neutral-300">
                      {new Intl.DateTimeFormat("en-BD", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      }).format(new Date(hoveredPoint.date))}
                    </span>
                    <span className="bg-vl-cyan-950 py-0.2 text-vl-cyan-400 rounded px-1.5 text-[10px] font-bold">
                      {hoveredPoint.orders} {hoveredPoint.orders === 1 ? "order" : "orders"}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between gap-4">
                      <span className="text-[11px] text-neutral-400">Net Sales:</span>
                      <span className="font-bold text-white">
                        {formatBdt(hoveredPoint.netSales)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-[11px] text-neutral-400">COGS:</span>
                      <span className="font-medium text-amber-300">
                        {formatBdt(hoveredPoint.cogs)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-neutral-800/80 pt-1 font-bold">
                      <span className="text-[11px] text-emerald-400">Daily Profit:</span>
                      <span className="text-emerald-400">
                        +{formatBdt(hoveredPoint.grossProfit)}
                      </span>
                    </div>
                    {chartMode === "cumulative" && (
                      <div className="flex justify-between gap-4 border-t border-neutral-800/60 pt-1 text-[10px] text-cyan-300">
                        <span>Cumulative:</span>
                        <span className="font-bold">{formatBdt(hoveredPoint.val)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <svg
              ref={svgRef}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="h-44 w-full cursor-crosshair overflow-visible sm:h-52"
              aria-label="Revenue and orders trend"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <defs>
                <pattern
                  id="reportGridPattern"
                  width="24"
                  height="24"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="2" cy="2" r="1" fill="#94a3b8" opacity="0.3" />
                </pattern>
                <linearGradient id="reportWaveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.22" />
                  <stop offset="70%" stopColor="#0284c7" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Background Micro-Dot Layer */}
              <rect
                x={paddingX}
                y={paddingY}
                width={usableW}
                height={usableH}
                fill="url(#reportGridPattern)"
              />

              {/* Grid Lines & Benchmarks */}
              <g className="font-mono text-[9px] select-none" fontSize="9">
                <text x="4" y={paddingY + 3} fill="#64748b" fontSize="9">
                  {trendMetric === "orders" ? `${Math.round(maxVal)}` : shortBdt(maxVal)}
                </text>
                <line
                  x1={paddingX}
                  y1={paddingY}
                  x2={svgWidth - 10}
                  y2={paddingY}
                  stroke="#cbd5e1"
                  strokeDasharray="4 4"
                />

                <text x="4" y={svgHeight / 2 + 3} fill="#64748b" fontSize="9">
                  {trendMetric === "orders" ? `${Math.round(midVal)}` : shortBdt(midVal)}
                </text>
                <line
                  x1={paddingX}
                  y1={svgHeight / 2}
                  x2={svgWidth - 10}
                  y2={svgHeight / 2}
                  stroke="#cbd5e1"
                  strokeDasharray="4 4"
                />

                <text x="16" y={svgHeight - paddingY + 3} fill="#64748b" fontSize="9">
                  0
                </text>
                <line
                  x1={paddingX}
                  y1={svgHeight - paddingY}
                  x2={svgWidth - 10}
                  y2={svgHeight - paddingY}
                  stroke="#cbd5e1"
                />
              </g>

              {/* Stripe-style Vertical Crosshair Line */}
              {hoveredPoint && (
                <line
                  x1={hoveredPoint.x}
                  y1={paddingY}
                  x2={hoveredPoint.x}
                  y2={svgHeight - paddingY}
                  stroke="#0284c7"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  opacity="0.8"
                />
              )}

              {/* ── MODE 1 & 3: WAVE / CUMULATIVE AREA & LINE ── */}
              {chartMode !== "bars" && areaD && <path d={areaD} fill="url(#reportWaveGradient)" />}
              {chartMode !== "bars" && pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke={chartMode === "cumulative" ? "#0891b2" : "#0284c7"}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* ── MODE 2: VERTICAL DAILY HISTOGRAM BARS ── */}
              {chartMode === "bars" &&
                coordinates.map((c, i) => {
                  const barWidth = Math.max(Math.min(usableW / trend.length - 3, 24), 4);
                  const barH = (c.val / maxVal) * usableH;
                  const barX = c.x - barWidth / 2;
                  const barY = svgHeight - paddingY - barH;
                  const isHovered = hoveredPoint?.date === c.date;

                  return (
                    <g key={i} className="transition-all duration-150">
                      <rect
                        x={barX}
                        y={paddingY}
                        width={barWidth}
                        height={usableH}
                        className="fill-neutral-100/50"
                        rx="2"
                      />
                      <rect
                        x={barX}
                        y={barY}
                        width={barWidth}
                        height={Math.max(barH, 2)}
                        rx="2"
                        className={
                          isHovered
                            ? "fill-vl-cyan-500"
                            : trendMetric === "grossProfit"
                              ? "fill-emerald-600"
                              : trendMetric === "orders"
                                ? "fill-amber-500"
                                : "fill-[#0284c7]"
                        }
                      />
                    </g>
                  );
                })}

              {/* Data Coordinates (Wave Mode) */}
              {chartMode !== "bars" &&
                coordinates.map((c, i) => (
                  <circle
                    key={i}
                    cx={c.x}
                    cy={c.y}
                    r={coordinates.length <= 14 ? 4 : 2.5}
                    className="pointer-events-none fill-white stroke-[#0284c7] transition-all"
                    strokeWidth="2"
                  />
                ))}

              {/* Active Stripe Halo Dot */}
              {hoveredPoint && (
                <g className="pointer-events-none">
                  <circle
                    cx={hoveredPoint.x}
                    cy={hoveredPoint.y}
                    r="9"
                    className="fill-vl-cyan-500/20"
                  />
                  <circle
                    cx={hoveredPoint.x}
                    cy={hoveredPoint.y}
                    r="5.5"
                    className="stroke-vl-cyan-600 fill-white"
                    strokeWidth="2.5"
                  />
                </g>
              )}
            </svg>

            {/* X-Axis Interval Labels */}
            <div className="text-muted-foreground flex items-center justify-between px-1 pt-1 font-mono text-[10px]">
              <span>
                {trend[0]
                  ? new Intl.DateTimeFormat("en-BD", { month: "short", day: "numeric" }).format(
                      new Date(trend[0].date)
                    )
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
      <div className="rounded-sm border border-neutral-200/90 bg-white p-5 shadow-xs print:break-inside-avoid print:border-neutral-300 print:shadow-none">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-vl-dark-900 font-heading text-xs font-bold tracking-wider uppercase">
              Sales vs Cost Realization
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Net sales vs item acquisition COGS
            </p>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px]">
            <span className="flex items-center gap-1.5 text-neutral-700">
              <span className="size-2 rounded-full bg-cyan-600" /> Net Sales
            </span>
            <span className="flex items-center gap-1.5 text-neutral-700">
              <span className="size-2 rounded-full bg-amber-500" /> COGS
            </span>
            <span className="flex items-center gap-1.5 font-bold text-emerald-800">
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
            {trend.slice(-7).map((point) => {
              const maxTrendSales = Math.max(...trend.map((p) => Number(p.netSales) || 0), 100);
              return (
                <div
                  key={new Date(point.date).toISOString()}
                  className="grid grid-cols-[4.5rem_1fr_4.5rem] items-center gap-3 text-xs"
                >
                  <span className="text-muted-foreground font-mono text-[11px]">
                    {new Date(point.date).toLocaleDateString("en-BD", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <div className="space-y-1">
                    <div className="h-2 rounded-full bg-neutral-100">
                      <div
                        className="h-2 rounded-full bg-cyan-600 transition-all"
                        style={{
                          width: `${Math.min((point.netSales / maxTrendSales) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <div className="h-2 rounded-full bg-neutral-100">
                      <div
                        className="h-2 rounded-full bg-amber-500 transition-all"
                        style={{ width: `${Math.min((point.cogs / maxTrendSales) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-right font-mono text-[11px] font-bold text-emerald-800">
                    +{shortBdt(point.grossProfit)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-muted-foreground flex h-48 items-center justify-center font-mono text-xs">
            COGS is unavailable for this period
          </div>
        )}
      </div>

      {/* ── 3. TOP PRODUCTS PERFORMANCE (COLUMN 1) ── */}
      <div className="flex flex-col justify-between rounded-sm border border-neutral-200/90 bg-white p-5 shadow-xs print:break-inside-avoid print:border-neutral-300 print:shadow-none">
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <PackageCheck className="text-vl-dark-900 size-3.5" />
                <h2 className="text-vl-dark-900 font-heading text-xs font-bold tracking-wider uppercase">
                  Top Products Performance
                </h2>
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Top volume and merchandise contributors
              </p>
            </div>
            <div className="print:hidden">
              <Select
                value={productMetric}
                onValueChange={(val) => {
                  if (val) setProductMetric(val as typeof productMetric);
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="h-7 w-auto min-w-31.25 bg-white font-mono text-xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="revenue">Net Revenue</SelectItem>
                  <SelectItem value="profit">Gross Profit</SelectItem>
                  <SelectItem value="units">Units Sold</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                      <p
                        className="text-vl-dark-900 truncate font-semibold"
                        title={product.productName}
                      >
                        {cleanProductName(product.productName)}
                      </p>
                      <p className="text-muted-foreground truncate font-mono text-[10px]">
                        {product.sku}
                      </p>
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
        {/* 4A. PAYMENT CHANNEL MIX (WITH SVG DONUT RING CHART) */}
        <div className="rounded-sm border border-neutral-200/90 bg-white p-5 shadow-xs print:break-inside-avoid print:border-neutral-300 print:shadow-none">
          <div className="mb-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <PieChart className="text-vl-dark-900 size-3.5" />
                <h2 className="text-vl-dark-900 font-heading text-xs font-bold tracking-wider uppercase">
                  Settlement Channel Mix
                </h2>
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Sales distribution by payment provider
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-neutral-800">
              Total {shortBdt(paymentTotal)}
            </span>
          </div>

          <div className="flex flex-col items-center gap-5 sm:flex-row">
            {/* SVG Donut Ring Chart */}
            <div className="relative size-28 shrink-0">
              <svg viewBox="0 0 100 100" className="size-full">
                <circle cx="50" cy="50" r="36" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                {onlinePct > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="36"
                    fill="none"
                    stroke="#0891b2"
                    strokeWidth="12"
                    strokeDasharray={`${(onlinePct / 100) * 226.19} 226.19`}
                    strokeDashoffset={0}
                    transform="rotate(-90 50 50)"
                    className="transition-all duration-500"
                  />
                )}
                {codPct > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="36"
                    fill="none"
                    stroke="#059669"
                    strokeWidth="12"
                    strokeDasharray={`${(codPct / 100) * 226.19} 226.19`}
                    strokeDashoffset={`-${(onlinePct / 100) * 226.19}`}
                    transform="rotate(-90 50 50)"
                    className="transition-all duration-500"
                  />
                )}
                <text
                  x="50"
                  y="47"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-neutral-900 font-mono text-[11px] font-black"
                >
                  {shortBdt(paymentTotal)}
                </text>
                <text
                  x="50"
                  y="59"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-neutral-400 font-sans text-[7.5px] font-bold tracking-wider uppercase"
                >
                  Settled
                </text>
              </svg>
            </div>

            {/* Provider Breakdown Cards */}
            <div className="w-full flex-1 space-y-2.5">
              {payments.length ? (
                payments.map((payment) => {
                  const percentage = paymentTotal > 0 ? (payment.sales / paymentTotal) * 100 : 0;
                  const isOnline = payment.method !== "COD";
                  return (
                    <div
                      key={payment.method}
                      className="space-y-1 rounded border border-neutral-100 bg-neutral-50/50 p-2.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "size-2 rounded-full",
                              isOnline ? "bg-cyan-600" : "bg-emerald-600"
                            )}
                          />
                          <span className="font-semibold text-neutral-900">
                            {payment.method === "COD" ? "Cash on Delivery (COD)" : payment.method}
                          </span>
                        </div>
                        <span className="font-mono font-bold">{percentage.toFixed(1)}%</span>
                      </div>
                      <div className="text-muted-foreground flex justify-between font-mono text-[10px]">
                        <span>{payment.orders.toLocaleString("en-BD")} orders</span>
                        <span className="font-bold text-neutral-800">
                          {formatBdt(payment.sales)}
                        </span>
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
        </div>

        {/* 4B. MERCHANDISE RETENTION PULSE (WITH SVG RADIAL RETENTION RING) */}
        <div className="flex flex-1 flex-col justify-between rounded-sm border border-neutral-200/90 bg-white p-5 shadow-xs print:break-inside-avoid print:border-neutral-300 print:shadow-none">
          <div>
            <div className="mb-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="size-3.5 text-amber-600" />
                <h2 className="text-vl-dark-900 font-heading text-xs font-bold tracking-wider uppercase">
                  Merchandise Retention Pulse
                </h2>
              </div>
              <span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-950">
                {returnRate.toFixed(1)}% Return Rate
              </span>
            </div>

            <div className="flex flex-col items-center gap-4 sm:flex-row">
              {/* Radial Arc Gauge */}
              <div className="relative size-24 shrink-0">
                <svg viewBox="0 0 100 100" className="size-full">
                  <circle cx="50" cy="50" r="36" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                  {/* Retained Portion */}
                  <circle
                    cx="50"
                    cy="50"
                    r="36"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="10"
                    strokeDasharray={`${(Math.max(100 - returnRate, 0) / 100) * 226.19} 226.19`}
                    strokeDashoffset={0}
                    transform="rotate(-90 50 50)"
                    className="transition-all duration-500"
                  />
                  {/* Returned Portion */}
                  {returnRate > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="36"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="10"
                      strokeDasharray={`${(Math.min(returnRate, 100) / 100) * 226.19} 226.19`}
                      strokeDashoffset={`-${(Math.max(100 - returnRate, 0) / 100) * 226.19}`}
                      transform="rotate(-90 50 50)"
                      className="transition-all duration-500"
                    />
                  )}
                  <text
                    x="50"
                    y="47"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-emerald-800 font-mono text-xs font-black"
                  >
                    {Math.max(100 - returnRate, 0).toFixed(0)}%
                  </text>
                  <text
                    x="50"
                    y="59"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-neutral-400 font-sans text-[7.5px] font-bold tracking-wider uppercase"
                  >
                    Retained
                  </text>
                </svg>
              </div>

              {/* 4 Metric Tiles */}
              <div className="grid w-full flex-1 grid-cols-2 gap-2 font-mono text-xs">
                <div className="rounded border border-neutral-100 bg-neutral-50/60 p-2">
                  <span className="text-muted-foreground font-sans text-[9px] font-semibold uppercase">
                    Sold Units
                  </span>
                  <p className="text-vl-dark-900 mt-0.5 text-sm font-bold">
                    {soldUnits.toLocaleString("en-BD")}
                  </p>
                </div>
                <div className="rounded border border-neutral-100 bg-neutral-50/60 p-2">
                  <span className="text-muted-foreground font-sans text-[9px] font-semibold uppercase">
                    Returned
                  </span>
                  <p className="mt-0.5 text-sm font-bold text-amber-900">
                    {returnedUnits.toLocaleString("en-BD")}
                  </p>
                </div>
                <div className="rounded border border-neutral-100 bg-neutral-50/60 p-2">
                  <span className="text-muted-foreground font-sans text-[9px] font-semibold uppercase">
                    Retained
                  </span>
                  <p className="mt-0.5 text-sm font-bold text-emerald-800">
                    {(soldUnits - returnedUnits).toLocaleString("en-BD")}
                  </p>
                </div>
                <div className="rounded border border-neutral-100 bg-neutral-50/60 p-2">
                  <span className="text-muted-foreground font-sans text-[9px] font-semibold uppercase">
                    Ret Value
                  </span>
                  <p className="mt-0.5 text-sm font-bold text-red-800">
                    {formatBdt(returnedValue)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Retention Bar */}
          <div className="mt-4 space-y-1">
            <div className="text-muted-foreground flex justify-between font-mono text-[10px]">
              <span>Retained: {Math.max(100 - returnRate, 0).toFixed(1)}%</span>
              <span>Returned: {returnRate.toFixed(1)}%</span>
            </div>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${Math.max(100 - returnRate, 0)}%` }}
                title="Retained Volume"
              />
              <div
                className="h-full bg-amber-500 transition-all"
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
