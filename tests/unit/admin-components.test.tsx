import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminPageHeader } from "@/components/admin/shared";
import { AdminKpiCard, AdminKpiGrid } from "@/components/admin/shared";
import { AdminTableTabs, AdminTableSearchInput } from "@/components/admin/shared";
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

  test("renders order badges and formats WhatsApp URL correctly", async () => {
    const { getOrderStatusBadge, getPaymentStatusBadge, generateWhatsAppUrl } = await import(
      "@/components/admin/orders/admin-order-badges"
    );

    const pendingBadge = renderToStaticMarkup(getOrderStatusBadge("PENDING"));
    expect(pendingBadge).toContain("Pending");

    const paidBadge = renderToStaticMarkup(getPaymentStatusBadge("SUCCESS"));
    expect(paidBadge).toContain("Paid");

    const waUrl = generateWhatsAppUrl("01711111111", "VL-100", "Siam");
    expect(waUrl).toBe("https://wa.me/8801711111111?text=Hello%20Siam%2C%20regarding%20your%20VibeLock%20order%20%23VL-100%3A%20");
  });

  test("renders OrderLifecycleStepper with stages and cancelled states", async () => {
    const { OrderLifecycleStepper } = await import(
      "@/components/admin/orders/order-lifecycle-stepper"
    );

    const pendingHtml = renderToStaticMarkup(
      <OrderLifecycleStepper
        currentStatus="PENDING"
        createdAt={new Date("2026-10-26T10:00:00Z")}
        orderHistory={[]}
      />
    );
    expect(pendingHtml).toContain("Order Placed");
    expect(pendingHtml).toContain("Step 1 of 5");
    expect(pendingHtml).toContain("Confirmed");

    const cancelledHtml = renderToStaticMarkup(
      <OrderLifecycleStepper
        currentStatus="CANCELLED"
        createdAt={new Date("2026-10-26T10:00:00Z")}
        orderHistory={[{ status: "CANCELLED", createdAt: new Date("2026-10-26T10:30:00Z"), notes: "Customer requested cancellation" }]}
      />
    );
    expect(cancelledHtml).toContain("Order Lifecycle: Cancelled");
    expect(cancelledHtml).toContain("Customer requested cancellation");
  });

  test("renders OrderPickPackChecklist with items and progress", async () => {
    const { OrderPickPackChecklist } = await import(
      "@/components/admin/orders/order-pick-pack-checklist"
    );

    const html = renderToStaticMarkup(
      <OrderPickPackChecklist
        orderId="test-order-1"
        items={[
          {
            id: "item-1",
            productName: "Vintage Denim Jacket",
            size: "L",
            color: "Blue",
            sku: "VDJ-L-BLU",
            quantity: 2,
            unitPrice: 2500,
            lineTotal: 5000,
          },
        ]}
      />
    );

    expect(html).toContain("Vintage Denim Jacket");
    expect(html).toContain("VDJ-L-BLU");
    expect(html).toContain("Size: L");
    expect(html).toContain("৳5,000.00");
  });

  test("renders OrderThermalLabelModal with barcode and COD tag", async () => {
    const { OrderThermalLabelModal } = await import(
      "@/components/admin/orders/order-thermal-label-modal"
    );

    const html = renderToStaticMarkup(
      <OrderThermalLabelModal
        isOpen={true}
        onClose={vi.fn()}
        order={{
          orderNumber: "VL-9999",
          customerName: "Rahim Ahmed",
          customerPhone: "01812345678",
          shippingStreet: "Road 12, Banani",
          shippingCity: "Dhaka",
          paymentMethod: "COD",
          paymentStatus: "PENDING",
          total: 3500,
          itemCount: 2,
          courierProvider: "Steadfast",
          trackingNumber: "ST-88231",
        }}
      />
    );

    expect(html).toContain("VibeLock Apparel");
    expect(html).toContain("Rahim Ahmed");
    expect(html).toContain("01812345678");
    expect(html).toContain("CASH ON DELIVERY (COD)");
    expect(html).toContain("৳3,500.00");
    expect(html).toContain("VL-9999");
  });
});


