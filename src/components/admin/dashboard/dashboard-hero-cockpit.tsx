"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart2,
  CircleDollarSign,
  Layers,
  Percent,
  Radio,
  RotateCcw,
  ShoppingBag,
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
import { formatBdt } from "./dashboard-financial-kpis";

export interface TrendPoint {
  date: Date;
  netSales: number;
  orders: number;
  grossProfit?: number;
}

interface DashboardHeroCockpitProps {
  financials: {
    netSales: number;
    grossProfit: number;
    grossMargin: number | null;
    orders: number;
    retainedUnits: number;
    soldUnits: number;
    returnedUnits: number;
    returnRate: number;
  };
  trend: TrendPoint[];
  currentRange: string;
  activePresetLabel: string;
  reportHref: string;
}

function formatShortBdt(val: number) {
  if (val >= 100000) return `৳${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `৳${(val / 1000).toFixed(1)}K`;
  return `৳${Math.round(val)}`;
}

export function DashboardHeroCockpit({
  financials,
  trend,
  activePresetLabel,
  reportHref,
}: DashboardHeroCockpitProps) {
  const [chartMode, setChartMode] = React.useState<"wave" | "bars" | "cumulative">("wave");
  const [trendMetric, setTrendMetric] = React.useState<"netSales" | "grossProfit" | "orders">(
    "netSales"
  );
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  const points = React.useMemo(() => {
    return trend.reduce<
      Array<{
        date: Date;
        netSales: number;
        grossProfit: number;
        orders: number;
        cumulativeNet: number;
        cumulativeProfit: number;
        cumulativeOrders: number;
      }>
    >((acc, t) => {
      const prev = acc[acc.length - 1];
      const net = Number(t.netSales) || 0;
      const profit = Number(t.grossProfit) || 0;
      const ord = Number(t.orders) || 0;
      const cumulativeNet = (prev?.cumulativeNet ?? 0) + net;
      const cumulativeProfit = (prev?.cumulativeProfit ?? 0) + profit;
      const cumulativeOrders = (prev?.cumulativeOrders ?? 0) + ord;
      acc.push({
        date: new Date(t.date),
        netSales: net,
        grossProfit: profit,
        orders: ord,
        cumulativeNet,
        cumulativeProfit,
        cumulativeOrders,
      });
      return acc;
    }, []);
  }, [trend]);

  const peakPoint = points.reduce(
    (max, p) => (p.netSales > max.netSales ? p : max),
    points[0] || { netSales: 0, grossProfit: 0, orders: 0, date: new Date() }
  );

  const activeValues = React.useMemo(() => {
    return points.map((p) => {
      if (chartMode === "cumulative") {
        if (trendMetric === "orders") return p.cumulativeOrders;
        if (trendMetric === "grossProfit") return p.cumulativeProfit;
        return p.cumulativeNet;
      }
      if (trendMetric === "orders") return p.orders;
      if (trendMetric === "grossProfit") return p.grossProfit;
      return p.netSales;
    });
  }, [points, chartMode, trendMetric]);

  const maxVal = Math.max(...activeValues, trendMetric === "orders" ? 5 : 100);
  const midVal = maxVal / 2;

  // SVG Coordinates calculation (Width: 800, Height: 200)
  const svgWidth = 800;
  const svgHeight = 200;
  const paddingX = 45; // Leave room for left Y-axis benchmark labels
  const paddingY = 25;
  const usableW = svgWidth - paddingX - 20;
  const usableH = svgHeight - paddingY * 2;

  const isSinglePoint = points.length === 1;

  const coordinates = React.useMemo(() => {
    return points.map((p, idx) => {
      const val = activeValues[idx] ?? 0;
      const x = isSinglePoint
        ? paddingX + usableW / 2
        : paddingX + (idx / Math.max(points.length - 1, 1)) * usableW;
      const y = svgHeight - paddingY - (val / maxVal) * usableH;
      return { x, y, val, ...p };
    });
  }, [points, activeValues, isSinglePoint, usableW, usableH, maxVal]);

  const pathD = React.useMemo(() => {
    if (isSinglePoint || coordinates.length === 0) return "";
    return coordinates
      .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(" ");
  }, [coordinates, isSinglePoint]);

  const areaD = React.useMemo(() => {
    if (isSinglePoint || coordinates.length === 0) return "";
    return `${pathD} L ${coordinates[coordinates.length - 1].x.toFixed(1)} ${svgHeight - paddingY} L ${coordinates[0].x.toFixed(1)} ${svgHeight - paddingY} Z`;
  }, [pathD, coordinates, isSinglePoint, svgHeight, paddingY]);

  // Continuous raycast cursor tracking for Stripe-style fluid crosshair
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || coordinates.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const scaleX = svgWidth / rect.width;
    const svgMouseX = clientX * scaleX;

    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < coordinates.length; i++) {
      const diff = Math.abs(coordinates[i].x - svgMouseX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    setHoveredIndex(closestIdx);
  };

  const hoveredPoint = hoveredIndex !== null ? coordinates[hoveredIndex] : null;

  return (
    <div className="text-vl-dark-900 relative overflow-hidden rounded-sm border border-neutral-200/90 bg-white shadow-xs">
      {/* ── TOP HEADER OF HERO COCKPIT: NET SALES & REPORT LINK ── */}
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-4 border-b border-neutral-100/90 p-5 sm:p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground tracking-streetwear font-mono text-[11px] font-bold uppercase">
              Net Merchandise Revenue
            </span>
            <span className="border-vl-cyan-600/30 bg-vl-cyan-50 text-vl-cyan-950 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase shadow-2xs">
              <span className="bg-vl-cyan-600 size-1.5 animate-pulse rounded-full" />
              {activePresetLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            <p className="text-vl-dark-900 font-heading text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              {formatBdt(financials.netSales)}
            </p>
          </div>

          <p className="text-muted-foreground text-xs">
            Net of discounts, store promotions, and approved customer returns.
          </p>
        </div>

        {/* Top Right Action & Ledger Link */}
        <div className="flex flex-col items-end gap-2">
          <Link
            href={reportHref}
            className="text-vl-dark-900 inline-flex items-center gap-1.5 rounded-sm border border-neutral-200 bg-white px-3 py-1.5 font-mono text-xs font-semibold shadow-2xs transition-all hover:border-neutral-300 hover:bg-neutral-50"
          >
            <span>Full Ledger Analytics</span>
            <ArrowUpRight className="size-3.5" />
          </Link>
          <span className="text-muted-foreground font-mono text-[10px]">
            Peak Day:{" "}
            <strong className="text-vl-dark-900">{formatShortBdt(peakPoint.netSales)}</strong>
          </span>
        </div>
      </div>

      {/* ── SUB-KPIS GRID ── */}
      <div className="relative z-10 grid grid-cols-2 divide-x divide-y divide-neutral-200/80 border-b border-neutral-200/80 bg-neutral-50/50 sm:grid-cols-5 sm:divide-y-0">
        <div className="space-y-0.5 p-3.5 sm:p-4">
          <span className="text-muted-foreground flex items-center gap-1 text-[11px] font-semibold uppercase">
            <TrendingUp className="size-3 text-emerald-600" />
            Gross Profit
          </span>
          <p className="text-vl-dark-900 font-mono text-base font-extrabold sm:text-xl">
            {formatBdt(financials.grossProfit)}
          </p>
        </div>

        <div className="space-y-0.5 p-3.5 sm:p-4">
          <span className="text-muted-foreground flex items-center gap-1 text-[11px] font-semibold uppercase">
            <Percent className="size-3 text-cyan-600" />
            Gross Margin
          </span>
          <p className="text-vl-dark-900 font-mono text-base font-extrabold sm:text-xl">
            {financials.grossMargin !== null ? `${financials.grossMargin.toFixed(1)}%` : "—"}
          </p>
        </div>

        <div className="space-y-0.5 p-3.5 sm:p-4">
          <span className="text-muted-foreground flex items-center gap-1 text-[11px] font-semibold uppercase">
            <CircleDollarSign className="size-3 text-purple-600" />
            Orders
          </span>
          <p className="text-vl-dark-900 font-mono text-base font-extrabold sm:text-xl">
            {financials.orders.toLocaleString("en-BD")}
          </p>
        </div>

        <div className="space-y-0.5 p-3.5 sm:p-4">
          <span className="text-muted-foreground flex items-center gap-1 text-[11px] font-semibold uppercase">
            <ShoppingBag className="size-3 text-cyan-700" />
            Retained Units
          </span>
          <p className="text-vl-dark-900 font-mono text-base font-extrabold sm:text-xl">
            {financials.retainedUnits.toLocaleString("en-BD")}
          </p>
          <span className="text-muted-foreground block font-mono text-[10px]">
            {financials.soldUnits} sold / {financials.returnedUnits} ret
          </span>
        </div>

        <div className="space-y-0.5 p-3.5 sm:p-4">
          <span className="text-muted-foreground flex items-center gap-1 text-[11px] font-semibold uppercase">
            <RotateCcw className="size-3 text-amber-600" />
            Return Rate
          </span>
          <p className="text-vl-dark-900 font-mono text-base font-extrabold sm:text-xl">
            {financials.soldUnits > 0 ? `${financials.returnRate.toFixed(1)}%` : "—"}
          </p>
        </div>
      </div>

      {/* ── TECHNICAL MICRO-GRID VELOCITY WAVE CANVAS ── */}
      <div className="relative z-10 p-4 sm:p-6">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Radio className="text-vl-cyan-700 size-3 animate-pulse" />
            <span className="text-vl-dark-900 font-heading text-xs font-bold tracking-wider uppercase">
              {chartMode === "bars"
                ? "Daily Trajectory Columns"
                : chartMode === "cumulative"
                  ? "Cumulative Velocity Progression"
                  : "Daily Sales Trajectory Wave"}
            </span>
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

            {/* Metric Selector using design-system Select */}
            <Select
              value={trendMetric}
              onValueChange={(val) => {
                if (val) setTrendMetric(val as typeof trendMetric);
              }}
            >
              <SelectTrigger
                size="sm"
                className="h-7 w-auto min-w-33.75 bg-white font-mono text-[11px]"
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

        {points.length > 0 ? (
          <div className="relative w-full">
            {/* ── DYNAMIC ABSOLUTE FLOATING TOOLTIP (STRIPE GLASSMORPHISM) ── */}
            {hoveredPoint && (
              <div
                className="pointer-events-none absolute z-30 transition-all duration-75 ease-out print:hidden"
                style={{
                  left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                  top: `${(hoveredPoint.y / svgHeight) * 100}%`,
                  transform:
                    hoveredPoint.x > svgWidth * 0.75
                      ? "translate(-90%, calc(-100% - 14px))"
                      : hoveredPoint.x < svgWidth * 0.25
                        ? "translate(-10%, calc(-100% - 14px))"
                        : "translate(-50%, calc(-100% - 14px))",
                }}
              >
                <div className="border-vl-dark-900 bg-vl-dark-950/95 min-w-44 rounded-lg border p-3 font-mono text-white shadow-2xl backdrop-blur-md">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5 text-xs">
                    <span className="font-semibold text-neutral-300">
                      {new Intl.DateTimeFormat("en-BD", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      }).format(hoveredPoint.date)}
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
                    <div className="flex justify-between gap-4 border-t border-neutral-800/80 pt-1 font-bold">
                      <span className="text-[11px] text-emerald-400">Daily Profit:</span>
                      <span className="text-emerald-400">
                        +{formatBdt(hoveredPoint.grossProfit)}
                      </span>
                    </div>
                    {hoveredPoint.orders > 0 && (
                      <div className="flex justify-between gap-4 text-[11px] text-neutral-400">
                        <span>AOV:</span>
                        <span className="text-neutral-200">
                          {formatBdt(hoveredPoint.netSales / hoveredPoint.orders)}
                        </span>
                      </div>
                    )}
                    {chartMode === "cumulative" && (
                      <div className="flex justify-between gap-4 border-t border-neutral-800/60 pt-1 text-[10px] text-cyan-300">
                        <span>Running Total:</span>
                        <span className="font-bold">
                          {trendMetric === "orders"
                            ? `${hoveredPoint.cumulativeOrders} orders`
                            : trendMetric === "grossProfit"
                              ? formatBdt(hoveredPoint.cumulativeProfit)
                              : formatBdt(hoveredPoint.cumulativeNet)}
                        </span>
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
              aria-label="Daily sales curve"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <defs>
                {/* Precision Micro-Dot Matrix Pattern */}
                <pattern
                  id="dashboardMicroGridPattern"
                  width="24"
                  height="24"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="2" cy="2" r="1" fill="#94a3b8" opacity="0.35" />
                </pattern>

                <linearGradient id="dashboardWaveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
                  <stop offset="60%" stopColor="#0284c7" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                </linearGradient>

                <linearGradient id="dashboardCumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0891b2" stopOpacity="0.25" />
                  <stop offset="60%" stopColor="#0891b2" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#0891b2" stopOpacity="0.0" />
                </linearGradient>

                <linearGradient id="dashboardProfitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
                  <stop offset="60%" stopColor="#059669" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Background Micro-Dot Grid Layer */}
              <rect
                x={paddingX}
                y={paddingY}
                width={usableW}
                height={usableH}
                fill="url(#dashboardMicroGridPattern)"
              />

              {/* Grid Horizontal Guidelines with Monospace Benchmark Labels */}
              <g className="font-mono text-[9px] select-none" fontSize="9">
                <text x="4" y={paddingY + 3} fill="#64748b" fontSize="9">
                  {trendMetric === "orders" ? `${Math.round(maxVal)}` : formatShortBdt(maxVal)}
                </text>
                <line
                  x1={paddingX}
                  y1={paddingY}
                  x2={svgWidth - 15}
                  y2={paddingY}
                  stroke="#cbd5e1"
                  strokeDasharray="4 4"
                />

                <text x="4" y={svgHeight / 2 + 3} fill="#64748b" fontSize="9">
                  {trendMetric === "orders" ? `${Math.round(midVal)}` : formatShortBdt(midVal)}
                </text>
                <line
                  x1={paddingX}
                  y1={svgHeight / 2}
                  x2={svgWidth - 15}
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
                  x2={svgWidth - 15}
                  y2={svgHeight - paddingY}
                  stroke="#cbd5e1"
                />
              </g>

              {/* Vertical Crosshair Line on Hover */}
              {hoveredPoint && (
                <line
                  x1={hoveredPoint.x}
                  y1={paddingY}
                  x2={hoveredPoint.x}
                  y2={svgHeight - paddingY}
                  stroke={
                    trendMetric === "grossProfit"
                      ? "#059669"
                      : chartMode === "cumulative"
                        ? "#0891b2"
                        : "#0284c7"
                  }
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  className="opacity-75"
                />
              )}

              {/* Columns Mode (Discrete Daily Histogram Bars) */}
              {chartMode === "bars" &&
                coordinates.map((c, i) => {
                  const barWidth = Math.max(Math.min(usableW / (coordinates.length * 1.6), 24), 6);
                  const barH = usableH * (c.val / maxVal);
                  const barX = c.x - barWidth / 2;
                  const barY = svgHeight - paddingY - barH;
                  const isHovered = hoveredIndex === i;

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

              {/* Wave & Cumulative Continuous Area and Stroke */}
              {chartMode !== "bars" && areaD && (
                <path
                  d={areaD}
                  fill={
                    trendMetric === "grossProfit"
                      ? "url(#dashboardProfitGradient)"
                      : chartMode === "cumulative"
                        ? "url(#dashboardCumulativeGradient)"
                        : "url(#dashboardWaveGradient)"
                  }
                />
              )}
              {chartMode !== "bars" && pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke={
                    trendMetric === "grossProfit"
                      ? "#059669"
                      : chartMode === "cumulative"
                        ? "#0891b2"
                        : "#0284c7"
                  }
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Coordinates (Wave Mode) */}
              {chartMode !== "bars" &&
                coordinates.map((c, i) => (
                  <circle
                    key={i}
                    cx={c.x}
                    cy={c.y}
                    r={coordinates.length <= 14 ? 4 : 2.5}
                    className="pointer-events-none fill-white transition-all"
                    stroke={trendMetric === "grossProfit" ? "#059669" : "#0284c7"}
                    strokeWidth="2"
                  />
                ))}

              {/* Active Stripe Halo Highlight on Hover */}
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

            {/* X-Axis Labels (Clean date intervals) */}
            <div className="text-muted-foreground flex items-center justify-between px-1 pt-1 font-mono text-[10px]">
              <span>
                {points[0]
                  ? new Intl.DateTimeFormat("en-BD", { month: "short", day: "numeric" }).format(
                      points[0].date
                    )
                  : ""}
              </span>
              <span>
                {points[points.length - 1]
                  ? new Intl.DateTimeFormat("en-BD", { month: "short", day: "numeric" }).format(
                      points[points.length - 1].date
                    )
                  : ""}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground flex h-32 items-center justify-center font-mono text-xs">
            No sales curve data for this interval
          </div>
        )}
      </div>
    </div>
  );
}
