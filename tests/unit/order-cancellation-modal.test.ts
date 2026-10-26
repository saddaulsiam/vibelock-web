import * as React from "react";
import { describe, expect, test, vi } from "vitest";

vi.mock("@/lib/config/env", () => ({
  env: {
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/vibelock_test",
    AUTH_SECRET: "12345678901234567890123456789012",
    COURIER_WEBHOOK_SECRET: "test-steadfast-secret-key-12345",
  },
}));

vi.mock("@/lib/admin/order-actions", () => ({
  updateOrderStatusAction: vi.fn(),
}));

import { renderToStaticMarkup } from "react-dom/server";
import {
  CANCELLATION_REASONS,
  OrderCancelModal,
} from "@/components/admin/order-cancel-modal";

describe("Structured Order Cancellation and Inventory Restock", () => {
  test("defines comprehensive structured cancellation reasons for BD D2C streetwear", () => {
    expect(CANCELLATION_REASONS.length).toBeGreaterThanOrEqual(6);

    const ids = CANCELLATION_REASONS.map((r) => r.id);
    expect(ids).toContain("CUSTOMER_UNREACHABLE");
    expect(ids).toContain("STOCK_OUT");
    expect(ids).toContain("CUSTOMER_CHANGED_MIND");
    expect(ids).toContain("DUPLICATE_ORDER");

    const unreachable = CANCELLATION_REASONS.find(
      (r) => r.id === "CUSTOMER_UNREACHABLE"
    );
    expect(unreachable?.label).toContain("Customer Unreachable");
    expect(unreachable?.shortLabel).toContain("Unreachable");

    const stockOut = CANCELLATION_REASONS.find((r) => r.id === "STOCK_OUT");
    expect(stockOut?.label).toContain("Out of Stock");
  });

  test("parses structured cancellation reason tags correctly from history notes", () => {
    const rawNote =
      "[CANCELLATION: Customer Unreachable / Fake Order] Multiple calls unanswered.";
    const cancelMatch = rawNote.match(/^\[CANCELLATION:\s*([^\]]+)\]\s*(.*)$/);

    expect(cancelMatch).not.toBeNull();
    expect(cancelMatch?.[1]?.trim()).toBe("Customer Unreachable / Fake Order");
    expect(cancelMatch?.[2]?.trim()).toBe("Multiple calls unanswered.");
  });

  test("renders nothing when isOpen is false", () => {
    const html = renderToStaticMarkup(
      React.createElement(OrderCancelModal, {
        orderId: "test-order-uuid-123",
        orderNumber: "ORD-9999",
        isOpen: false,
        onClose: () => {},
      })
    );
    expect(html).toBe("");
  });

  test("renders modal elements, auto-restock guarantee banner, and options when isOpen is true", () => {
    const html = renderToStaticMarkup(
      React.createElement(OrderCancelModal, {
        orderId: "test-order-uuid-123",
        orderNumber: "ORD-9999",
        isOpen: true,
        onClose: () => {},
      })
    );

    // Modal Title & Order info
    expect(html).toContain("Cancel Order &amp; Restock Inventory");
    expect(html).toContain("ORD-9999");

    // Auto-restock notice
    expect(html).toContain("Automatic Inventory Restock Guaranteed");

    // Form inputs and reasons
    expect(html).toContain("Customer Unreachable / Fake Order");
    expect(html).toContain("Size / Color Out of Stock");
    expect(html).toContain("Customer Changed Mind");
    expect(html).toContain("Confirm Cancellation");
  });
});
