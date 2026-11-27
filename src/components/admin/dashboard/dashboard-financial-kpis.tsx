import Link from "next/link";
import {
  Boxes,
  CircleDollarSign,
  ClipboardList,
  Percent,
  RotateCcw,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function formatBdt(value: { toFixed: (decimalPlaces?: number) => string } | number) {
  const num = typeof value === "number" ? value : Number(value);
  const [integerPart, fractionPart] = (Number.isFinite(num) ? num : 0).toFixed(2).split(".");
  const sign = integerPart.startsWith("-") ? "-" : "";
  const unsignedInteger = sign ? integerPart.slice(1) : integerPart;
  const groupedInteger = unsignedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `৳${sign}${groupedInteger}.${fractionPart ?? "00"}`;
}

interface FinancialKpiProps {
  label: string;
  value: string;
  detail: string;
  icon: typeof Boxes;
  href?: string;
  highlightTone?: "cyan" | "emerald" | "amber" | "neutral";
}

function FinancialKpiCard({
  label,
  value,
  detail,
  icon: Icon,
  href = "/admin/reports",
  highlightTone = "neutral",
}: FinancialKpiProps) {
  return (
    <Link
      href={href}
      className="group focus-visible:ring-vl-cyan block rounded-sm focus-visible:ring-2 focus-visible:outline-none"
    >
      <Card className="border-vl-dark-900/10 group-hover:border-vl-dark-900/40 relative overflow-hidden rounded-sm bg-white shadow-2xs transition-all group-hover:shadow-md">
        {highlightTone === "cyan" && (
          <div className="bg-vl-cyan absolute top-0 right-0 left-0 h-1" />
        )}
        <CardContent className="flex min-h-32 items-start justify-between gap-4 p-4 sm:p-5">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              {label}
            </p>
            <p className="text-vl-dark-900 font-heading text-2xl font-black tracking-tight sm:text-3xl">
              {value}
            </p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{detail}</p>
          </div>
          <span className="bg-vl-white-300 text-vl-dark-900 group-hover:bg-vl-dark-900 group-hover:text-vl-cyan flex size-10 shrink-0 items-center justify-center rounded-sm transition-colors">
            <Icon className="size-5" aria-hidden="true" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

interface DashboardFinancialKpisProps {
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
  activePresetLabel: string;
  reportHref: string;
}

export function DashboardFinancialKpis({
  financials,
  activePresetLabel,
  reportHref,
}: DashboardFinancialKpisProps) {
  return (
    <section aria-labelledby="financial-kpis-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2
          id="financial-kpis-heading"
          className="text-vl-dark-900 font-heading text-sm font-bold tracking-tight uppercase"
        >
          Executive Financial Performance ({activePresetLabel})
        </h2>
        <Link
          href={reportHref}
          className="text-muted-foreground hover:text-vl-dark-900 text-xs font-semibold underline-offset-4 hover:underline"
        >
          Full Ledger Reports →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <FinancialKpiCard
          label="Net Sales"
          value={formatBdt(financials.netSales)}
          detail={`${activePresetLabel} · After discounts & successful refunds`}
          icon={CircleDollarSign}
          href={reportHref}
          highlightTone="cyan"
        />

        <FinancialKpiCard
          label="Gross Profit"
          value={formatBdt(financials.grossProfit)}
          detail={`${activePresetLabel} · Net merchandise revenue minus COGS`}
          icon={TrendingUp}
          href={reportHref}
        />

        <FinancialKpiCard
          label="Gross Margin"
          value={
            financials.grossMargin !== null ? `${financials.grossMargin.toFixed(1)}%` : "—"
          }
          detail="Profit efficiency percentage on net sales"
          icon={Percent}
          href={reportHref}
        />

        <FinancialKpiCard
          label="Orders Recorded"
          value={financials.orders.toLocaleString("en-BD")}
          detail={`Non-cancelled orders in ${activePresetLabel.toLowerCase()}`}
          icon={ClipboardList}
          href={reportHref}
        />

        <FinancialKpiCard
          label="Retained Streetwear Units"
          value={financials.retainedUnits.toLocaleString("en-BD")}
          detail={`${financials.soldUnits.toLocaleString("en-BD")} sold · ${financials.returnedUnits.toLocaleString("en-BD")} returned`}
          icon={ShoppingBag}
          href={reportHref}
        />

        <FinancialKpiCard
          label="Return Loss Rate"
          value={
            financials.soldUnits > 0 ? `${financials.returnRate.toFixed(1)}%` : "—"
          }
          detail={`${financials.returnedUnits.toLocaleString("en-BD")} returns out of ${financials.soldUnits.toLocaleString("en-BD")} units sold`}
          icon={RotateCcw}
          href={reportHref}
        />
      </div>
    </section>
  );
}
