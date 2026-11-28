import { ArrowRight, CheckCircle2, Clock, PackageCheck, Truck, XCircle } from "lucide-react";
import Link from "next/link";

interface StatusCount {
  status: string;
  count: number;
}

interface DashboardFulfillmentRibbonProps {
  orderStatuses: StatusCount[];
}

const STAGES = [
  {
    key: "PENDING",
    label: "Pending Intake",
    icon: Clock,
    color: "text-amber-600 bg-amber-500",
    border: "border-amber-200",
  },
  {
    key: "CONFIRMED",
    label: "Confirmed",
    icon: CheckCircle2,
    color: "text-purple-600 bg-purple-500",
    border: "border-purple-200",
  },
  {
    key: "PROCESSING",
    label: "Packing Queue",
    icon: PackageCheck,
    color: "text-blue-600 bg-blue-500",
    border: "border-blue-200",
  },
  {
    key: "SHIPPED",
    label: "In Courier Transit",
    icon: Truck,
    color: "text-cyan-600 bg-cyan-500",
    border: "border-cyan-200",
  },
  {
    key: "DELIVERED",
    label: "Delivered",
    icon: CheckCircle2,
    color: "text-emerald-600 bg-emerald-500",
    border: "border-emerald-200",
  },
  {
    key: "CANCELLED",
    label: "Cancelled",
    icon: XCircle,
    color: "text-neutral-500 bg-neutral-400",
    border: "border-neutral-200",
  },
];

export function DashboardFulfillmentRibbon({ orderStatuses }: DashboardFulfillmentRibbonProps) {
  const totalOrders = orderStatuses.reduce((acc, s) => acc + s.count, 0);

  const statusMap = new Map(orderStatuses.map((s) => [s.status, s.count]));

  return (
    <div className="border-vl-dark-900/10 space-y-3.5 rounded-sm border bg-white p-4 shadow-xs sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Truck className="text-vl-dark-900 size-4" />
          <h3 className="text-vl-dark-900 font-heading text-xs font-bold tracking-wider uppercase">
            Order Fulfillment Pipeline
          </h3>
        </div>
        <span className="text-muted-foreground font-mono text-xs font-bold">
          {totalOrders.toLocaleString("en-BD")} Total Orders
        </span>
      </div>

      {/* Visual Continuous Ribbon Bar */}
      {totalOrders > 0 ? (
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
          {STAGES.map((st) => {
            const count = statusMap.get(st.key) ?? 0;
            const pct = (count / totalOrders) * 100;
            if (pct <= 0) return null;
            return (
              <div
                key={st.key}
                style={{ width: `${pct}%` }}
                className={`${st.color.split(" ")[1]} transition-all`}
                title={`${st.label}: ${count} (${pct.toFixed(1)}%)`}
              />
            );
          })}
        </div>
      ) : null}

      {/* Clean Interactive Stage Pills */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {STAGES.map((st) => {
          const count = statusMap.get(st.key) ?? 0;
          const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
          const Icon = st.icon;
          const isPendingAlert = st.key === "PENDING" && count > 0;

          return (
            <Link
              key={st.key}
              href={`/admin/orders?status=${st.key}`}
              className={`group flex flex-col justify-between rounded border p-2.5 transition-all ${
                isPendingAlert
                  ? "border-amber-300 bg-amber-50/70 shadow-2xs ring-1 ring-amber-300/40 hover:border-amber-500 hover:bg-amber-100/50"
                  : "border-vl-dark-900/10 hover:border-vl-dark-900/40 hover:bg-vl-white-200 bg-neutral-50/50"
              }`}
            >
              <div className="flex items-center justify-between gap-1 text-[11px]">
                <span className="text-vl-dark-900 flex items-center gap-1 font-semibold">
                  <Icon className={`size-3 ${st.color.split(" ")[0]}`} />
                  <span className="truncate">{st.label}</span>
                </span>
                {isPendingAlert ? (
                  <span className="rounded border-amber-300 bg-amber-100 px-1 font-mono text-[9px] font-bold text-amber-800">
                    Action
                  </span>
                ) : (
                  <span className="text-muted-foreground font-mono text-[10px]">{pct}%</span>
                )}
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span
                  className={`font-mono text-base font-bold ${
                    isPendingAlert ? "text-amber-900" : "text-vl-dark-900"
                  }`}
                >
                  {count.toLocaleString("en-BD")}
                </span>
                <span className="text-muted-foreground font-mono text-[10px]">
                  {isPendingAlert ? `${pct}% total` : ""}
                </span>
                <ArrowRight className="text-muted-foreground size-2.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
