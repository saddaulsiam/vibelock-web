import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { OrderBackButton } from "@/components/admin/order-back-button";
import { OrderSmartActions } from "@/components/admin/order-smart-actions";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

describe("Order Details Enhancements Unit Tests", () => {
  test("renders OrderBackButton correctly", () => {
    const html = renderToStaticMarkup(<OrderBackButton />);
    expect(html).toContain("Back to Orders");
    expect(html).toContain("Return to orders list (preserves active filters)");
  });

  test("renders OrderSmartActions with 4th WhatsApp cancellation notice template", () => {
    const orderData = {
      id: "ord-test-1",
      orderNumber: "VL-20261027-9988",
      status: "PENDING" as const,
      paymentStatus: "PENDING" as const,
      paymentMethod: "COD",
      total: 2500,
      customerName: "Sakib Al Hasan",
      customerPhone: "01711112233",
      shippingStreet: "Road 5, Dhanmondi",
      shippingCity: "Dhaka",
      itemCount: 2,
    };

    const html = renderToStaticMarkup(<OrderSmartActions order={orderData} />);

    // Verify WhatsApp CRM Menu button exists
    expect(html).toContain("WhatsApp CRM");

    // Primary action button for PENDING order
    expect(html).toContain("Confirm Order");
  });
});
