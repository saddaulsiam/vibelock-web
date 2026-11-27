import { AdminPageHeader } from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { ClipboardList, Plus } from "lucide-react";
import Link from "next/link";
import {
  DASHBOARD_RANGE_PRESETS,
  DashboardRangeTabs,
  type DashboardRangePresetKey,
} from "./dashboard-range-tabs";

export { DASHBOARD_RANGE_PRESETS, type DashboardRangePresetKey };

interface DashboardHeaderProps {
  isManagerOrAdmin: boolean;
  currentRange: string;
}

export function DashboardHeader({ isManagerOrAdmin, currentRange }: DashboardHeaderProps) {
  return (
    <div className="space-y-4">
      {/* ── Standard Harmonized Admin Page Header (Matching /admin/orders) ── */}
      <AdminPageHeader
        eyebrow="Operations / Overview"
        title={isManagerOrAdmin ? "Admin Command Center" : "Staff Operations Center"}
        badgeLabel="Live Operations Active"
        badgeVariant="emerald"
        description={
          isManagerOrAdmin
            ? "Real-time commerce telemetry, revenue pacing, inventory health, and live orders."
            : "Daily store counter register, inventory levels, and order fulfillment queues."
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/products/new">
            <Button size="sm" variant="primary">
              <Plus className="size-3.5" />
              <span>New Product</span>
            </Button>
          </Link>

          <Link href="/admin/orders?status=PROCESSING">
            <Button
              size="sm"
              variant="outline"
              className="bg-white hover:bg-neutral-50 hover:text-neutral-900"
            >
              <ClipboardList className="size-3.5" />
              <span>Fulfill Queue</span>
            </Button>
          </Link>
        </div>
      </AdminPageHeader>

      {/* ── Animated Smooth Range Preset Segmented Control ── */}
      {isManagerOrAdmin && (
        <div className="border-b border-neutral-200/80 pb-3">
          <DashboardRangeTabs currentRange={currentRange} />
        </div>
      )}
    </div>
  );
}
