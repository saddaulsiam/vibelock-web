/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ShippingService } from "@/lib/shipping/service";
import { CaptureReconciliationStatus } from "@/lib/payment/types";

// Mock Prisma
const { mockPrisma } = vi.hoisted(() => {
  const mock: any = {
    order: {
      findUnique: vi.fn(async () => null),
      update: vi.fn(async () => ({})),
    },
    payment: {
      findMany: vi.fn(async () => []),
    },
    shipment: {
      create: vi.fn(async () => ({ id: "local-shipment-uuid-01" })),
      update: vi.fn(async () => ({ id: "local-shipment-uuid-01" })),
      delete: vi.fn(async () => ({})),
    },
    $queryRaw: vi.fn(async () => []),
    $transaction: vi.fn(async (cb: any) => cb(mock)),
  };
  return { mockPrisma: mock };
});

vi.mock("@/lib/prisma/client", () => ({
  default: mockPrisma,
}));

describe("ShippingService: Post-Provider Race Condition & Fulfillment Re-Check (Fix 1)", () => {
  let mockProvider: {
    name: string;
    createShipment: any;
    getShipmentStatus: any;
    cancelShipment?: any;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = {
      name: "steadfast",
      createShipment: vi.fn().mockResolvedValue({
        success: true,
        providerShipmentId: "PROV-TEST-888",
        trackingNumber: "TRK-TEST-888",
        status: "CREATED",
      }),
      getShipmentStatus: vi.fn(),
    };
  });

  it("Scenario 1: Payment becomes risk-held between initial validation and provider response", async () => {
    const shippingService = new ShippingService(mockProvider as any);

    // Initial check (outside + tx1): Order is ONLINE, SUCCESS, PENDING
    const cleanOrder = {
      id: "ord-race-01",
      orderNumber: "VL-ORD-01",
      status: "PENDING",
      paymentMethod: "ONLINE",
      paymentStatus: "SUCCESS",
      shipment: null,
      shippingCost: 60,
      total: 1060,
      customerName: "Alice",
      customerPhone: "01711111111",
      shippingStreet: "Road 1",
      shippingCity: "Dhaka",
      shippingCountry: "BD",
    };

    // 1. Outside check
    mockPrisma.order.findUnique.mockResolvedValueOnce(cleanOrder);
    // 2. Tx 1 check: passes
    mockPrisma.order.findUnique.mockResolvedValueOnce(cleanOrder);
    // Tx 1 payment query: clean settled primary capture
    mockPrisma.payment.findMany.mockResolvedValueOnce([
      {
        id: "pay-race-01",
        status: "SUCCESS",
        captures: [
          {
            isPrimary: true,
            reconciliationStatus: CaptureReconciliationStatus.SETTLED,
          },
        ],
      },
    ]);

    // 3. Tx 2 (post-provider) check: payment has become RISK-HELD in the meantime!
    mockPrisma.order.findUnique.mockResolvedValueOnce(cleanOrder);
    mockPrisma.payment.findMany.mockResolvedValueOnce([
      {
        id: "pay-race-01",
        status: "SUCCESS",
        captures: [
          {
            isPrimary: true,
            reconciliationStatus: CaptureReconciliationStatus.NEEDS_REVIEW, // RISK HOLD OCCURRED!
          },
        ],
      },
    ]);

    // Call service
    await expect(shippingService.createShipmentForOrder("ord-race-01")).rejects.toThrow(
      "Online orders with unreconciled payment captures or risk holds cannot be shipped"
    );

    // Provider WAS called
    expect(mockProvider.createShipment).toHaveBeenCalledTimes(1);

    // Order MUST NOT be marked SHIPPED or DELIVERED!
    expect(mockPrisma.order.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SHIPPED" }),
      })
    );
    expect(mockPrisma.order.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "DELIVERED" }),
      })
    );

    // Provider shipment reference MUST be preserved as durable evidence with MANUAL_RECONCILIATION_REQUIRED
    expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "local-shipment-uuid-01" },
        data: expect.objectContaining({
          providerShipmentId: "PROV-TEST-888",
          trackingNumber: "TRK-TEST-888",
          failureReason: expect.stringContaining("MANUAL_RECONCILIATION_REQUIRED"),
        }),
      })
    );
  });

  it("Scenario 2: Provisional hold appears during provider request", async () => {
    const shippingService = new ShippingService(mockProvider as any);

    const cleanOrder = {
      id: "ord-race-02",
      orderNumber: "VL-ORD-02",
      status: "PENDING",
      paymentMethod: "ONLINE",
      paymentStatus: "SUCCESS",
      shipment: null,
      shippingCost: 60,
      total: 1060,
    };

    // Outside check & Tx 1 check
    mockPrisma.order.findUnique.mockResolvedValueOnce(cleanOrder);
    mockPrisma.order.findUnique.mockResolvedValueOnce(cleanOrder);
    mockPrisma.payment.findMany.mockResolvedValueOnce([
      {
        id: "pay-race-02",
        status: "SUCCESS",
        captures: [
          {
            isPrimary: true,
            reconciliationStatus: CaptureReconciliationStatus.SETTLED,
          },
        ],
      },
    ]);

    // Tx 2 (post-provider): provisional hold appeared concurrently!
    mockPrisma.order.findUnique.mockResolvedValueOnce(cleanOrder);
    mockPrisma.payment.findMany.mockResolvedValueOnce([
      {
        id: "pay-race-02",
        status: "SUCCESS",
        gatewayPayload: {
          provisional: {
            "VAL-CONCURRENT-01": {
              valId: "VAL-CONCURRENT-01",
              reconciliationHold: true,
            },
          },
        },
        captures: [],
      },
    ]);

    await expect(shippingService.createShipmentForOrder("ord-race-02")).rejects.toThrow(
      "Online payment has an unresolved provisional capture hold pending verification."
    );

    // Order must NOT be marked SHIPPED
    expect(mockPrisma.order.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SHIPPED" }),
      })
    );

    // Provider reference preserved
    expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "local-shipment-uuid-01" },
        data: expect.objectContaining({
          providerShipmentId: "PROV-TEST-888",
          trackingNumber: "TRK-TEST-888",
        }),
      })
    );
  });

  it("Scenario 3: Order is cancelled concurrently while provider request was in flight", async () => {
    const shippingService = new ShippingService(mockProvider as any);

    const activeOrder = {
      id: "ord-race-03",
      orderNumber: "VL-ORD-03",
      status: "PENDING",
      paymentMethod: "ONLINE",
      paymentStatus: "SUCCESS",
      shipment: null,
      shippingCost: 60,
      total: 1060,
    };
    const cancelledOrder = {
      ...activeOrder,
      status: "CANCELLED",
    };

    mockPrisma.order.findUnique.mockResolvedValueOnce(activeOrder);
    mockPrisma.order.findUnique.mockResolvedValueOnce(activeOrder);
    mockPrisma.payment.findMany.mockResolvedValueOnce([
      {
        id: "pay-race-03",
        status: "SUCCESS",
        captures: [
          {
            isPrimary: true,
            reconciliationStatus: CaptureReconciliationStatus.SETTLED,
          },
        ],
      },
    ]);

    // Tx 2 (post-provider): order is now CANCELLED!
    mockPrisma.order.findUnique.mockResolvedValueOnce(cancelledOrder);

    await expect(shippingService.createShipmentForOrder("ord-race-03")).rejects.toThrow(
      "Order was cancelled while shipment creation was in progress"
    );

    // Order remains CANCELLED (not updated to SHIPPED)
    expect(mockPrisma.order.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SHIPPED" }),
      })
    );

    // Provider reference preserved
    expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "local-shipment-uuid-01" },
        data: expect.objectContaining({
          providerShipmentId: "PROV-TEST-888",
          failureReason: expect.stringContaining("MANUAL_RECONCILIATION_REQUIRED"),
        }),
      })
    );
  });

  it("Scenario 4: Provider cancellation mechanism invoked when supported", async () => {
    const cancelShipmentMock = vi.fn().mockResolvedValue({ success: true });
    mockProvider.cancelShipment = cancelShipmentMock;
    const shippingService = new ShippingService(mockProvider as any);

    const cleanOrder = {
      id: "ord-race-04",
      orderNumber: "VL-ORD-04",
      status: "PENDING",
      paymentMethod: "ONLINE",
      paymentStatus: "SUCCESS",
      shipment: null,
      shippingCost: 60,
      total: 1060,
    };

    mockPrisma.order.findUnique.mockResolvedValueOnce(cleanOrder);
    mockPrisma.order.findUnique.mockResolvedValueOnce(cleanOrder);
    mockPrisma.payment.findMany.mockResolvedValueOnce([
      {
        id: "pay-race-04",
        status: "SUCCESS",
        captures: [
          {
            isPrimary: true,
            reconciliationStatus: CaptureReconciliationStatus.SETTLED,
          },
        ],
      },
    ]);

    // Tx 2 (post-provider): risk hold occurred
    mockPrisma.order.findUnique.mockResolvedValueOnce(cleanOrder);
    mockPrisma.payment.findMany.mockResolvedValueOnce([
      {
        id: "pay-race-04",
        status: "SUCCESS",
        captures: [
          {
            isPrimary: true,
            reconciliationStatus: CaptureReconciliationStatus.NEEDS_REVIEW,
          },
        ],
      },
    ]);

    await expect(shippingService.createShipmentForOrder("ord-race-04")).rejects.toThrow(
      "Online orders with unreconciled payment captures or risk holds cannot be shipped"
    );

    // cancelShipment was called with the provider shipment ID
    expect(cancelShipmentMock).toHaveBeenCalledWith({
      shipmentId: "local-shipment-uuid-01",
      providerShipmentId: "PROV-TEST-888",
    });

    // Shipment marked CANCELLED with cancelledAt date
    expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "local-shipment-uuid-01" },
        data: expect.objectContaining({
          status: "CANCELLED",
          providerShipmentId: "PROV-TEST-888",
          cancelledAt: expect.any(Date),
        }),
      })
    );

    // Order not marked SHIPPED
    expect(mockPrisma.order.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SHIPPED" }),
      })
    );
  });

  it("Scenario 5: No duplicate provider shipment is created on retry", async () => {
    const shippingService = new ShippingService(mockProvider as any);

    // Order ALREADY has a shipment (e.g. from previous attempt)
    const orderWithShipment = {
      id: "ord-retry-01",
      orderNumber: "VL-ORD-RETRY",
      status: "PENDING",
      paymentMethod: "ONLINE",
      paymentStatus: "SUCCESS",
      shipment: {
        id: "existing-shipment-01",
        providerShipmentId: "PROV-TEST-888",
        status: "CREATED",
      },
    };

    mockPrisma.order.findUnique.mockResolvedValueOnce(orderWithShipment);

    await expect(shippingService.createShipmentForOrder("ord-retry-01")).rejects.toThrow(
      "Shipment already exists for this order"
    );

    // Provider createShipment was NEVER called!
    expect(mockProvider.createShipment).not.toHaveBeenCalled();
  });

  it("Scenario 6: Clean online order and COD order flows work normally", async () => {
    const shippingService = new ShippingService(mockProvider as any);

    // Clean online order
    const onlineOrder = {
      id: "ord-clean-online",
      orderNumber: "VL-ORD-CLEAN",
      status: "PENDING",
      paymentMethod: "ONLINE",
      paymentStatus: "SUCCESS",
      shipment: null,
      shippingCost: 60,
      total: 1060,
    };

    mockPrisma.order.findUnique.mockResolvedValueOnce(onlineOrder);
    mockPrisma.order.findUnique.mockResolvedValueOnce(onlineOrder);
    mockPrisma.payment.findMany.mockResolvedValueOnce([
      {
        id: "pay-clean-01",
        status: "SUCCESS",
        captures: [
          {
            isPrimary: true,
            reconciliationStatus: CaptureReconciliationStatus.SETTLED,
          },
        ],
      },
    ]);

    mockPrisma.order.findUnique.mockResolvedValueOnce(onlineOrder);
    mockPrisma.payment.findMany.mockResolvedValueOnce([
      {
        id: "pay-clean-01",
        status: "SUCCESS",
        captures: [
          {
            isPrimary: true,
            reconciliationStatus: CaptureReconciliationStatus.SETTLED,
          },
        ],
      },
    ]);

    mockPrisma.shipment.update.mockResolvedValueOnce({
      id: "local-shipment-uuid-01",
      status: "CREATED",
    });

    const result = await shippingService.createShipmentForOrder("ord-clean-online");
    expect(result.status).toBe("CREATED");

    // Order updated to SHIPPED
    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: "ord-clean-online" },
      data: { status: "SHIPPED" },
    });
  });

  it("Scenario 7: COD order flows normally without checking online payment captures", async () => {
    const shippingService = new ShippingService(mockProvider as any);

    const codOrder = {
      id: "ord-clean-cod",
      orderNumber: "VL-ORD-COD",
      status: "PENDING",
      paymentMethod: "COD",
      paymentStatus: "PENDING",
      shipment: null,
      shippingCost: 60,
      total: 1060,
    };

    mockPrisma.order.findUnique.mockResolvedValueOnce(codOrder);
    mockPrisma.order.findUnique.mockResolvedValueOnce(codOrder);
    mockPrisma.order.findUnique.mockResolvedValueOnce(codOrder);
    mockPrisma.shipment.update.mockResolvedValueOnce({
      id: "local-shipment-uuid-01",
      status: "CREATED",
    });

    const result = await shippingService.createShipmentForOrder("ord-clean-cod");
    expect(result.status).toBe("CREATED");

    // Order updated to SHIPPED
    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: "ord-clean-cod" },
      data: { status: "SHIPPED" },
    });
  });
});
