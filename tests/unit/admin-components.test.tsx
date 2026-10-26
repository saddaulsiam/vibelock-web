import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminKpiCard, AdminKpiGrid } from "@/components/admin/admin-kpi-card";
import { AdminTableTabs, AdminTableSearchInput } from "@/components/admin/admin-table-controls";
import { Boxes, Package } from "lucide-react";

describe("Admin Reusable UI Components", () => {
  test("renders AdminPageHeader with title, eyebrow, and badge", () => {
    const html = renderToStaticMarkup(
      <AdminPageHeader
        eyebrow="Operations / Sales"
        title="Order Management"
        badgeLabel="Live Dispatch"
        badgeVariant="emerald"
        description="Review customer orders and fulfillment"
      >
        <button type="button">Export</button>
      </AdminPageHeader>
    );

    expect(html).toContain("Operations / Sales");
    expect(html).toContain("Order Management");
    expect(html).toContain("Live Dispatch");
    expect(html).toContain("Review customer orders and fulfillment");
    expect(html).toContain("Export");
  });

  test("renders AdminKpiCard with label, value, and description", () => {
    const html = renderToStaticMarkup(
      <AdminKpiCard
        label="Physical Stock"
        value="1,240"
        description="Across 50 variants on hand"
        icon={Boxes}
        tone="neutral"
      />
    );

    expect(html).toContain("Physical Stock");
    expect(html).toContain("1,240");
    expect(html).toContain("Across 50 variants on hand");
  });

  test("renders AdminKpiCard with alert tone and link", () => {
    const html = renderToStaticMarkup(
      <AdminKpiCard
        label="Pending Confirmation"
        value="8"
        description="Requires merchant review"
        icon={Package}
        tone="amber"
        alert={true}
        href="/admin/orders?status=PENDING"
      />
    );

    expect(html).toContain("Pending Confirmation");
    expect(html).toContain("8");
    expect(html).toContain('href="/admin/orders?status=PENDING"');
    expect(html).toContain("bg-amber-50/40");
  });

  test("renders AdminKpiGrid with responsive column class", () => {
    const html = renderToStaticMarkup(
      <AdminKpiGrid columns={4}>
        <div>Card 1</div>
        <div>Card 2</div>
      </AdminKpiGrid>
    );

    expect(html).toContain("lg:grid-cols-4");
  });

  test("renders AdminTableTabs with active and inactive pills", () => {
    const html = renderToStaticMarkup(
      <AdminTableTabs
        tabs={[
          { key: "all", label: "All Items", count: 42, icon: Boxes },
          { key: "in-stock", label: "In Stock (>0)", count: 35, dotColor: "bg-emerald-500" },
        ]}
        activeKey="all"
        onChange={vi.fn()}
      />
    );

    expect(html).toContain("All Items");
    expect(html).toContain("(42)");
    expect(html).toContain("In Stock (&gt;0)");
    expect(html).toContain("bg-[#101114]");
    expect(html).toContain("bg-emerald-500");
  });

  test("renders AdminTableSearchInput with placeholder and keyboard shortcut", () => {
    const html = renderToStaticMarkup(
      <AdminTableSearchInput
        value=""
        onChange={vi.fn()}
        onClear={vi.fn()}
        placeholder="Search items..."
      />
    );

    expect(html).toContain('placeholder="Search items..."');
    expect(html).toContain("/");
  });
});

