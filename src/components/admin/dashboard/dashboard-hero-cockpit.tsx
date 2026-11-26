"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CircleDollarSign,
  Percent,
  Radio,
  RotateCcw,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { formatBdt } from "./dashboard-financial-kpis";

export interface TrendPoint {
  date: Date;
  netSales: number;
  orders: number;
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
  const [hoveredPoint, setHoveredPoint] = React.useState<{
    x: number;
    y: number;
    date: Date;
    netSales: number;
    orders: number;
  } | null>(null);

  const points = React.useMemo(() => {
    return trend.map((t) => ({
      ...t,
      date: new Date(t.date),
      netSales: Number(t.netSales) || 0,
      orders: Number(t.orders) || 0,
    }));
  }, [trend]);

  const peakPoint = points.reduce(
    (max, p) => (p.netSales > max.netSales ? p : max),
    points[0] || { netSales: 0, orders: 0, date: new Date() }
  );

  const salesValues = points.map((p) => p.netSales);
  const maxSales = Math.max(...salesValues, 100);
  const midSales = maxSales / 2;

  // SVG Coordinates calculation (Width: 800, Height: 190)
  const svgWidth = 800;
  const svgHeight = 190;
  const paddingX = 45; // Leave room for left Y-axis benchmark labels
  const paddingY = 25;
  const usableW = svgWidth - paddingX - 20;
  const usableH = svgHeight - paddingY * 2;

  const isSinglePoint = points.length === 1;

  const coordinates = points.map((p, idx) => {
    const x = isSinglePoint
      ? paddingX + usableW / 2
      : paddingX + (idx / Math.max(points.length - 1, 1)) * usableW;
    const y = svgHeight - paddingY - (p.netSales / maxSales) * usableH;
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

  return (
    <div className="border-neutral-200/90 bg-white relative overflow-hidden rounded-sm border text-vl-dark-900 shadow-xs">
      {/* ── TOP HEADER OF HERO COCKPIT: NET SALES & REPORT LINK ── */}
      <div className="border-b border-neutral-100/90 relative z-10 flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-mono text-[11px] font-bold tracking-[0.2em] uppercase">
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
            className="border-neutral-200 bg-white text-vl-dark-900 hover:bg-neutral-50 hover:border-neutral-300 inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 font-mono text-xs font-semibold shadow-2xs transition-all"
          >
            <span>Full Ledger Analytics</span>
            <ArrowUpRight className="size-3.5" />
          </Link>
          <span className="text-muted-foreground font-mono text-[10px]">
            Peak Day: <strong className="text-vl-dark-900">{formatShortBdt(peakPoint.netSales)}</strong>
          </span>
        </div>
      </div>

      {/* ── SUB-KPIS GRID ── */}
      <div className="border-b border-neutral-200/80 bg-neutral-50/50 relative z-10 grid grid-cols-2 divide-x divide-y divide-neutral-200/80 sm:grid-cols-5 sm:divide-y-0">
        <div className="space-y-0.5 p-3.5 sm:p-4">
          <span className="text-muted-foreground flex items-center gap-1 text-[11px] font-semibold uppercase">
            <TrendingUp className="size-3 text-emerald-600" />
            Gross Profit
          </span>
          <p className="font-mono text-base font-extrabold text-vl-dark-900 sm:text-xl">
            {formatBdt(financials.grossProfit)}
          </p>
        </div>

        <div className="space-y-0.5 p-3.5 sm:p-4">
          <span className="text-muted-foreground flex items-center gap-1 text-[11px] font-semibold uppercase">
            <Percent className="size-3 text-cyan-600" />
            Gross Margin
          </span>
          <p className="font-mono text-base font-extrabold text-vl-dark-900 sm:text-xl">
            {financials.grossMargin !== null ? `${financials.grossMargin.toFixed(1)}%` : "—"}
          </p>
        </div>

        <div className="space-y-0.5 p-3.5 sm:p-4">
          <span className="text-muted-foreground flex items-center gap-1 text-[11px] font-semibold uppercase">
            <CircleDollarSign className="size-3 text-purple-600" />
            Orders
          </span>
          <p className="font-mono text-base font-extrabold text-vl-dark-900 sm:text-xl">
            {financials.orders.toLocaleString("en-BD")}
          </p>
        </div>

        <div className="space-y-0.5 p-3.5 sm:p-4">
          <span className="text-muted-foreground flex items-center gap-1 text-[11px] font-semibold uppercase">
            <ShoppingBag className="text-cyan-700 size-3" />
            Retained Units
          </span>
          <p className="font-mono text-base font-extrabold text-vl-dark-900 sm:text-xl">
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
          <p className="font-mono text-base font-extrabold text-vl-dark-900 sm:text-xl">
            {financials.soldUnits > 0 ? `${financials.returnRate.toFixed(1)}%` : "—"}
          </p>
        </div>
      </div>

      {/* ── TECHNICAL MICRO-GRID VELOCITY WAVE CANVAS ── */}
      <div className="relative z-10 p-4 sm:p-6">
        <div className="mb-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Radio className="text-vl-cyan-700 size-3 animate-pulse" />
            <span className="text-vl-dark-900 font-heading text-xs font-bold tracking-wider uppercase">
              Daily Sales Trajectory Wave
            </span>
          </div>
        </div>

        {points.length > 0 ? (
          <div className="relative w-full">
            {/* ── DYNAMIC ABSOLUTE FLOATING TOOLTIP ── */}
            {hoveredPoint && (
              <div
                className="pointer-events-none absolute z-30 transition-all duration-75 ease-out"
                style={{
                  left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                  top: `${(hoveredPoint.y / svgHeight) * 100}%`,
                  transform: `translate(${
                    hoveredPoint.x / svgWidth > 0.85
                      ? "-88%"
                      : hoveredPoint.x / svgWidth < 0.15
                        ? "-12%"
                        : "-50%"
                  }, calc(-100% - 14px))`,
                }}
              >
                <div className="border-vl-dark-900 bg-vl-dark-900 text-white relative rounded-md border px-3 py-2 font-mono shadow-2xl">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-vl-cyan font-bold">
                      {new Intl.DateTimeFormat("en-BD", { month: "short", day: "numeric" }).format(
                        hoveredPoint.date
                      )}
                    </span>
                    <span className="text-neutral-500">·</span>
                    <span className="font-extrabold text-white">
                      {formatBdt(hoveredPoint.netSales)}
                    </span>
                  </div>
                  <div className="text-neutral-400 mt-0.5 text-[10px]">
                    {hoveredPoint.orders} {hoveredPoint.orders === 1 ? "order" : "orders"} placed
                  </div>

                  {/* Downward Pointer Caret Arrow */}
                  <div
                    className="border-t-vl-dark-900 absolute -bottom-1.5 border-x-4 border-t-6 border-b-0 border-x-transparent"
                    style={{
                      left:
                        hoveredPoint.x / svgWidth > 0.85
                          ? "88%"
                          : hoveredPoint.x / svgWidth < 0.15
                            ? "12%"
                            : "50%",
                      transform: "translateX(-50%)",
                    }}
                  />
                </div>
              </div>
            )}

            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="h-40 w-full overflow-visible sm:h-48"
              aria-label="Daily sales curve"
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <defs>
                {/* Precision Micro-Dot Matrix Pattern */}
                <pattern
                  id="microGridPattern"
                  width="24"
                  height="24"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="2" cy="2" r="1" fill="#94a3b8" opacity="0.35" />
                </pattern>

                <linearGradient id="glacialWaveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.22" />
                  <stop offset="60%" stopColor="#0284c7" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Background Micro-Dot Grid Layer */}
              <rect
                x={paddingX}
                y={paddingY}
                width={usableW}
                height={usableH}
                fill="url(#microGridPattern)"
              />

              {/* Grid Horizontal Guidelines with Monospace Benchmark Labels */}
              <g className="font-mono text-[9px] select-none">
                <text x="6" y={paddingY + 3} fill="#64748b">
                  {formatShortBdt(maxSales)}
                </text>
                <line
                  x1={paddingX}
                  y1={paddingY}
                  x2={svgWidth - 15}
                  y2={paddingY}
                  stroke="#cbd5e1"
                  strokeDasharray="4 4"
                />

                <text x="6" y={svgHeight / 2 + 3} fill="#64748b">
                  {formatShortBdt(midSales)}
                </text>
                <line
                  x1={paddingX}
                  y1={svgHeight / 2}
                  x2={svgWidth - 15}
                  y2={svgHeight / 2}
                  stroke="#cbd5e1"
                  strokeDasharray="4 4"
                />

                <text x="18" y={svgHeight - paddingY + 3} fill="#64748b">
                  ৳0
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
                  stroke="#0284c7"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  className="opacity-70"
                />
              )}

              {/* Single Interval Column / Pulse (when range has only 1 data point) */}
              {isSinglePoint && coordinates[0] && (
                <g>
                  <rect
                    x={coordinates[0].x - 24}
                    y={coordinates[0].y}
                    width={48}
                    height={svgHeight - paddingY - coordinates[0].y}
                    rx="4"
                    fill="url(#glacialWaveGradient)"
                    stroke="#0284c7"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={coordinates[0].x}
                    cy={coordinates[0].y}
                    r={6}
                    className="fill-[#0284c7] cursor-pointer stroke-white"
                    strokeWidth="2"
                    onMouseEnter={() => setHoveredPoint(coordinates[0])}
                  />
                </g>
              )}

              {/* Smooth Area Wave & Line */}
              {areaD && <path d={areaD} fill="url(#glacialWaveGradient)" />}
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

              {/* Interactive Data Coordinates */}
              {!isSinglePoint &&
                coordinates.map((c, i) => (
                  <g key={i}>
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r={coordinates.length <= 14 ? 4.5 : 3}
                      className="fill-white stroke-[#0284c7] hover:r-6 hover:fill-[#0284c7] hover:stroke-white cursor-pointer transition-all"
                      strokeWidth="2"
                      onMouseEnter={() => setHoveredPoint(c)}
                    />
                  </g>
                ))}
            </svg>

            {/* X-Axis Labels (Clean date intervals, no duplicate title) */}
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
