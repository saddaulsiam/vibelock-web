import { describe, test, expect, vi, beforeEach } from "vitest";

let mockSession: unknown = { user: { id: "user-mock-uuid", email: "customer@vibelock.com" } };

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

const mockIsPaymentMethodEnabled = vi.fn();

vi.mock("@/lib/settings/payment-settings", () => ({
  isPaymentMethodEnabled: (code: string) => mockIsPaymentMethodEnabled(code),
}));

// Mock cart and shipping pricing in case flow reaches past payment validation
vi.mock("@/lib/cart/queries", () => ({
  getCart: vi.fn(async () => null),
}));

vi.mock("@/lib/shipping/pricing", () => ({
  shippingPricing: {
    resolveShippingMethod: vi.fn(),
    calculateShippingCharge: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createOrderAction } from "@/lib/checkout/actions";

describe("VibeLock Stage 5 — Server-Side createOrderAction Payment Enforcement Tests", () => {
  const validPayload = {
    customerName: "Dhaka Customer",
    customerEmail: "customer@vibelock.com",
    customerPhone: "01711111111",
    shippingStreet: "House 12, Road 4, Banani",
    shippingCity: "Dhaka",
    shippingState: "Dhaka",
    shippingZip: "1213",
    shippingCountry: "BD",
    shippingMethodId: "123e4567-e89b-12d3-a456-426614174000",
    paymentMethod: "COD" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = { user: { id: "user-mock-uuid", email: "customer@vibelock.com" } };
  });

  test("rejects order creation when COD is disabled by admin", async () => {
    // Admin has disabled COD
    mockIsPaymentMethodEnabled.mockImplementation(async (code: string) => {
      if (code === "COD") return false;
      return true;
    });

    const result = await createOrderAction(
      { ...validPayload, paymentMethod: "COD" },
      "idempotency-key-cod-disabled"
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Cash on delivery is currently unavailable. Please choose another payment method."
    );
    expect(mockIsPaymentMethodEnabled).toHaveBeenCalledWith("COD");
  });

  test("rejects order creation when Online payment is disabled by admin or missing credentials", async () => {
    // Admin has disabled ONLINE (or store credentials missing)
    mockIsPaymentMethodEnabled.mockImplementation(async (code: string) => {
      if (code === "ONLINE") return false;
      return true;
    });

    const result = await createOrderAction(
      { ...validPayload, paymentMethod: "ONLINE" },
      "idempotency-key-online-disabled"
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Online payment is currently unavailable. Please choose cash on delivery."
    );
    expect(mockIsPaymentMethodEnabled).toHaveBeenCalledWith("ONLINE");
  });

  test("rejects order creation when bKash is disabled by admin or missing credentials", async () => {
    // Admin has disabled BKASH (or credentials missing)
    mockIsPaymentMethodEnabled.mockImplementation(async (code: string) => {
      if (code === "BKASH") return false;
      return true;
    });

    const result = await createOrderAction(
      { ...validPayload, paymentMethod: "BKASH" },
      "idempotency-key-bkash-disabled"
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "bKash payment is currently unavailable. Please choose another payment method."
    );
    expect(mockIsPaymentMethodEnabled).toHaveBeenCalledWith("BKASH");
  });

  test("rejects order creation when unapproved provider is submitted", async () => {
    const result = await createOrderAction(
      { ...validPayload, paymentMethod: "NAGAD" as unknown as "COD" },
      "idempotency-key-unapproved"
    );

    expect(result.success).toBe(false);
    // Schema parser rejects unapproved enum values
    expect(result.error).toContain("Invalid checkout information");
  });

  test("requires authentication before checking payment methods", async () => {
    mockSession = null;

    const result = await createOrderAction(
      { ...validPayload, paymentMethod: "COD" },
      "idempotency-key-unauth"
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unauthorized");
    expect(mockIsPaymentMethodEnabled).not.toHaveBeenCalled();
  });
});
