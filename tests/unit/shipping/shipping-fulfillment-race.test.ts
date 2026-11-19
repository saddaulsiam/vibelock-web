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
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    payment: {
      findMany: vi.fn(async () => []),
    },
    shipment: {
      findUnique: vi.fn(async () => null),
      findFirst: vi.fn(async () => null),
      create: vi.fn(async () => ({ id: "local-shipment-uuid-01" })),
      update: vi.fn(async () => ({ id: "local-shipment-uuid-01" })),
      updateMany: vi.fn(async () => ({ count: 1 })),
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
    mockPrisma.shipment.findUnique.mockResolvedValue({
      id: "local-shipment-uuid-01",
      orderId: "ord-race-01",
      status: "PENDING",
    });
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

describe("ShippingService: Courier Webhook Fulfillment Eligibility Enforcement (Webhook Protection)", () => {
  let mockProvider: {
    name: string;
    createShipment: any;
    getShipmentStatus: any;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = {
      name: "steadfast",
      createShipment: vi.fn(),
      getShipmentStatus: vi.fn(),
    };
    mockPrisma.order.findUnique.mockReset();
    mockPrisma.order.update.mockReset();
    mockPrisma.order.updateMany.mockReset();
    mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.payment.findMany.mockReset();
    mockPrisma.payment.findMany.mockResolvedValue([]);
    mockPrisma.shipment.findUnique.mockReset();
    mockPrisma.shipment.findFirst.mockReset();
    mockPrisma.shipment.update.mockReset();
    mockPrisma.shipment.update.mockImplementation(async (args: any) => ({
      id: args.where.id,
      ...args.data,
    }));
    mockPrisma.shipment.updateMany.mockReset();
    mockPrisma.shipment.updateMany.mockResolvedValue({ count: 1 });
  });

  it("1. Risk-held ONLINE order receiving IN_TRANSIT: tracking updated but order not advanced", async () => {
    const shippingService = new ShippingService(mockProvider as any);

    const initialShipment = {
      id: "ship-wh-01",
      orderId: "ord-wh-01",
      status: "CREATED",
      shippedAt: null,
      deliveredAt: null,
      failureReason: null,
    };
    const riskHeldOrder = {
      id: "ord-wh-01",
      status: "PENDING",
      paymentMethod: "ONLINE",
      paymentStatus: "SUCCESS",
    };

    // 1. Shipment reads (Call 1: preliminary, Call 2: locked re-read inside tx, Call 3: after updateMany)
    mockPrisma.shipment.findUnique
      .mockResolvedValueOnce(initialShipment)
      .mockResolvedValueOnce(initialShipment)
      .mockResolvedValueOnce({ ...initialShipment, status: "IN_TRANSIT" });

    // 2. Order lock & read
    mockPrisma.order.findUnique.mockResolvedValueOnce(riskHeldOrder);

    // 3. Payment query: primary capture is in NEEDS_REVIEW (risk hold)
    mockPrisma.payment.findMany.mockResolvedValueOnce([
      {
        id: "pay-wh-01",
        status: "SUCCESS",
        captures: [
          {
            isPrimary: true,
            reconciliationStatus: CaptureReconciliationStatus.NEEDS_REVIEW,
          },
        ],
      },
    ]);

    const result = await shippingService.updateShipmentStatus("ship-wh-01", "IN_TRANSIT");

    // Tracking evidence MUST be preserved on shipment
    expect(mockPrisma.shipment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ship-wh-01", status: "CREATED" },
        data: expect.objectContaining({ status: "IN_TRANSIT" }),
      })
    );

    // Durable MANUAL_RECONCILIATION_REQUIRED recorded on shipment
    expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ship-wh-01" },
        data: expect.objectContaining({
          failureReason: expect.stringContaining("MANUAL_RECONCILIATION_REQUIRED"),
        }),
      })
    );

    expect(result.failureReason).toContain("MANUAL_RECONCILIATION_REQUIRED");

    // Order MUST NOT be advanced to SHIPPED!
    expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
  });

  it("2. Risk-held ONLINE order receiving DELIVERED: tracking updated but order not advanced", async () => {
    const shippingService = new ShippingService(mockProvider as any);

    const inTransitShipment = {
      id: "ship-wh-02",
      orderId: "ord-wh-02",
      status: "IN_TRANSIT",
      shippedAt: new Date(),
      deliveredAt: null,
      failureReason: null,
    };
    const riskHeldOrder = {
      id: "ord-wh-02",
      status: "PENDING",
      paymentMethod: "ONLINE",
      paymentStatus: "SUCCESS",
    };

    mockPrisma.shipment.findUnique
      .mockResolvedValueOnce(inTransitShipment)
      .mockResolvedValueOnce(inTransitShipment)
      .mockResolvedValueOnce({ ...inTransitShipment, status: "DELIVERED" });

    mockPrisma.order.findUnique.mockResolvedValueOnce(riskHeldOrder);

    // Payment query: primary capture is in NEEDS_REVIEW
    mockPrisma.payment.findMany.mockResolvedValueOnce([
      {
        id: "pay-wh-02",
        status: "SUCCESS",
        captures: [
          {
            isPrimary: true,
            reconciliationStatus: CaptureReconciliationStatus.NEEDS_REVIEW,
          },
        ],
      },
    ]);

    const result = await shippingService.updateShipmentStatus("ship-wh-02", "DELIVERED");

    // Shipment was updated to DELIVERED
    expect(mockPrisma.shipment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ship-wh-02", status: "IN_TRANSIT" },
        data: expect.objectContaining({ status: "DELIVERED" }),
      })
    );

    // Shipment failureReason set
    expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ship-wh-02" },
        data: expect.objectContaining({
          failureReason: expect.stringContaining("MANUAL_RECONCILIATION_REQUIRED"),
        }),
      })
    );

    expect(result.failureReason).toContain("MANUAL_RECONCILIATION_REQUIRED");

    // Order MUST NOT be marked DELIVERED
    expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
  });

  it("3. Provisional hold during courier webhook: blocks order advancement", async () => {
    const shippingService = new ShippingService(mockProvider as any);

    const initialShipment = {
      id: "ship-wh-03",
      orderId: "ord-wh-03",
      status: "CREATED",
      shippedAt: null,
      failureReason: null,
    };
    const provisionalOrder = {
      id: "ord-wh-03",
      status: "PENDING",
      paymentMethod: "ONLINE",
      paymentStatus: "SUCCESS",
    };

    mockPrisma.shipment.findUnique
      .mockResolvedValueOnce(initialShipment)
      .mockResolvedValueOnce(initialShipment)
      .mockResolvedValueOnce({ ...initialShipment, status: "IN_TRANSIT" });

    mockPrisma.order.findUnique.mockResolvedValueOnce(provisionalOrder);

    // Payment has active provisional hold
    mockPrisma.payment.findMany.mockResolvedValueOnce([
      {
        id: "pay-wh-03",
        status: "SUCCESS",
        gatewayPayload: {
          provisional: {
            unresolved_cand: {
              reconciliationHold: true,
              valId: "VAL-PENDING",
            },
          },
        },
        captures: [],
      },
    ]);

    const result = await shippingService.updateShipmentStatus("ship-wh-03", "IN_TRANSIT");

    // Shipment updated with failureReason
    expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ship-wh-03" },
        data: expect.objectContaining({
          failureReason: expect.stringContaining("MANUAL_RECONCILIATION_REQUIRED"),
        }),
      })
    );

    expect(result.failureReason).toContain("MANUAL_RECONCILIATION_REQUIRED");

    // Order NOT advanced
    expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
  });

  it("4. Clean settled ONLINE order receiving normal status updates: advances order to SHIPPED and DELIVERED", async () => {
    const shippingService = new ShippingService(mockProvider as any);

    const cleanOrder = {
      id: "ord-wh-04",
      status: "PENDING",
      paymentMethod: "ONLINE",
      paymentStatus: "SUCCESS",
    };

    // --- Step A: IN_TRANSIT ---
    const shipmentCreated = {
      id: "ship-wh-04",
      orderId: "ord-wh-04",
      status: "CREATED",
      shippedAt: null,
      deliveredAt: null,
    };

    mockPrisma.shipment.findUnique
      .mockResolvedValueOnce(shipmentCreated)
      .mockResolvedValueOnce(shipmentCreated)
      .mockResolvedValueOnce({ ...shipmentCreated, status: "IN_TRANSIT" });

    mockPrisma.order.findUnique.mockResolvedValueOnce(cleanOrder);

    // Payment is SETTLED
    mockPrisma.payment.findMany.mockResolvedValueOnce([
      {
        id: "pay-wh-04",
        status: "SUCCESS",
        captures: [
          {
            isPrimary: true,
            reconciliationStatus: CaptureReconciliationStatus.SETTLED,
          },
        ],
      },
    ]);

    await shippingService.updateShipmentStatus("ship-wh-04", "IN_TRANSIT");

    // Order advanced to SHIPPED
    expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: "ord-wh-04", status: { notIn: ["CANCELLED", "DELIVERED"] } },
      data: { status: "SHIPPED" },
    });

    // Reset mocks for Step B
    mockPrisma.order.updateMany.mockClear();

    // --- Step B: DELIVERED ---
    const shipmentInTransit = {
      id: "ship-wh-04",
      orderId: "ord-wh-04",
      status: "IN_TRANSIT",
      shippedAt: new Date(),
      deliveredAt: null,
    };
    const shippedOrder = {
      ...cleanOrder,
      status: "SHIPPED",
    };

    mockPrisma.shipment.findUnique
      .mockResolvedValueOnce(shipmentInTransit)
      .mockResolvedValueOnce(shipmentInTransit)
      .mockResolvedValueOnce({ ...shipmentInTransit, status: "DELIVERED" });

    mockPrisma.order.findUnique.mockResolvedValueOnce(shippedOrder);

    mockPrisma.payment.findMany.mockResolvedValueOnce([
      {
        id: "pay-wh-04",
        status: "SUCCESS",
        captures: [
          {
            isPrimary: true,
            reconciliationStatus: CaptureReconciliationStatus.SETTLED,
          },
        ],
      },
    ]);

    await shippingService.updateShipmentStatus("ship-wh-04", "DELIVERED");

    // Order advanced to DELIVERED
    expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: "ord-wh-04", status: { not: "CANCELLED" } },
      data: { status: "DELIVERED" },
    });
  });

  it("5. COD order receiving normal status updates: advances order to SHIPPED and DELIVERED without online payment checks", async () => {
    const shippingService = new ShippingService(mockProvider as any);

    const codOrder = {
      id: "ord-wh-05",
      status: "PENDING",
      paymentMethod: "COD",
      paymentStatus: "PENDING",
    };

    const shipmentCreated = {
      id: "ship-wh-05",
      orderId: "ord-wh-05",
      status: "CREATED",
      shippedAt: null,
      deliveredAt: null,
    };

    mockPrisma.shipment.findUnique
      .mockResolvedValueOnce(shipmentCreated)
      .mockResolvedValueOnce(shipmentCreated)
      .mockResolvedValueOnce({ ...shipmentCreated, status: "IN_TRANSIT" });

    mockPrisma.order.findUnique.mockResolvedValueOnce(codOrder);

    await shippingService.updateShipmentStatus("ship-wh-05", "IN_TRANSIT");

    // Order advanced to SHIPPED
    expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: "ord-wh-05", status: { notIn: ["CANCELLED", "DELIVERED"] } },
      data: { status: "SHIPPED" },
    });

    // Payment query was NEVER called for COD!
    expect(mockPrisma.payment.findMany).not.toHaveBeenCalled();

    // Reset mocks for DELIVERED
    mockPrisma.order.updateMany.mockClear();

    const shipmentInTransit = {
      id: "ship-wh-05",
      orderId: "ord-wh-05",
      status: "IN_TRANSIT",
      shippedAt: new Date(),
    };
    mockPrisma.shipment.findUnique
      .mockResolvedValueOnce(shipmentInTransit)
      .mockResolvedValueOnce(shipmentInTransit)
      .mockResolvedValueOnce({ ...shipmentInTransit, status: "DELIVERED" });
    mockPrisma.order.findUnique.mockResolvedValueOnce({ ...codOrder, status: "SHIPPED" });

    await shippingService.updateShipmentStatus("ship-wh-05", "DELIVERED");

    // Order advanced to DELIVERED
    expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: "ord-wh-05", status: { not: "CANCELLED" } },
      data: { status: "DELIVERED" },
    });
    expect(mockPrisma.payment.findMany).not.toHaveBeenCalled();
  });

  it("6. Cancelled order is never resurrected by IN_TRANSIT or DELIVERED courier updates", async () => {
    const shippingService = new ShippingService(mockProvider as any);

    const cancelledOrder = {
      id: "ord-wh-06",
      status: "CANCELLED",
      paymentMethod: "ONLINE",
      paymentStatus: "SUCCESS",
    };

    const shipmentCreated = {
      id: "ship-wh-06",
      orderId: "ord-wh-06",
      status: "CREATED",
    };

    mockPrisma.shipment.findUnique
      .mockResolvedValueOnce(shipmentCreated)
      .mockResolvedValueOnce(shipmentCreated)
      .mockResolvedValueOnce({ ...shipmentCreated, status: "IN_TRANSIT" });

    mockPrisma.order.findUnique.mockResolvedValueOnce(cancelledOrder);

    await shippingService.updateShipmentStatus("ship-wh-06", "IN_TRANSIT");

    // Order update must NEVER be called for cancelled order
    expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.order.update).not.toHaveBeenCalled();

    // Now test with DELIVERED
    const shipmentInTransit = {
      id: "ship-wh-06",
      orderId: "ord-wh-06",
      status: "IN_TRANSIT",
    };
    mockPrisma.shipment.findUnique
      .mockResolvedValueOnce(shipmentInTransit)
      .mockResolvedValueOnce(shipmentInTransit)
      .mockResolvedValueOnce({ ...shipmentInTransit, status: "DELIVERED" });

    mockPrisma.order.findUnique.mockResolvedValueOnce(cancelledOrder);

    await shippingService.updateShipmentStatus("ship-wh-06", "DELIVERED");

    // Order update must NEVER be called
    expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
  });

  it("7. syncShipmentStatus delegates to updateShipmentStatus and enforces fulfillment eligibility", async () => {
    const shippingService = new ShippingService(mockProvider as any);

    const localShipment = {
      id: "ship-wh-07",
      providerShipmentId: "PROV-WH-07",
      orderId: "ord-wh-07",
      status: "CREATED",
      shippedAt: null,
    };
    const riskHeldOrder = {
      id: "ord-wh-07",
      status: "PENDING",
      paymentMethod: "ONLINE",
      paymentStatus: "SUCCESS",
    };

    // 1. syncShipmentStatus finds shipment locally
    mockPrisma.shipment.findFirst.mockResolvedValueOnce(localShipment);

    // 2. updateShipmentStatus execution
    mockPrisma.shipment.findUnique
      .mockResolvedValueOnce(localShipment)
      .mockResolvedValueOnce(localShipment)
      .mockResolvedValueOnce({ ...localShipment, status: "IN_TRANSIT" });

    mockPrisma.order.findUnique.mockResolvedValueOnce(riskHeldOrder);

    mockPrisma.payment.findMany.mockResolvedValueOnce([
      {
        id: "pay-wh-07",
        status: "SUCCESS",
        captures: [
          {
            isPrimary: true,
            reconciliationStatus: CaptureReconciliationStatus.NEEDS_REVIEW,
          },
        ],
      },
    ]);

    await shippingService.syncShipmentStatus("PROV-WH-07", "IN_TRANSIT");

    // Order was NOT updated
    expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();

    // Shipment failureReason was set
    expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ship-wh-07" },
        data: expect.objectContaining({
          failureReason: expect.stringContaining("MANUAL_RECONCILIATION_REQUIRED"),
        }),
      })
    );
  });
});

describe("ShippingService: Lock Acquisition Ordering & Concurrency Invariance (Deadlock Safety)", () => {
  let mockProvider: {
    name: string;
    createShipment: any;
    getShipmentStatus: any;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = {
      name: "steadfast",
      createShipment: vi.fn().mockResolvedValue({
        success: true,
        providerShipmentId: "PROV-TEST-999",
        trackingNumber: "TRK-TEST-999",
        status: "CREATED",
      }),
      getShipmentStatus: vi.fn(),
    };
    mockPrisma.order.findUnique.mockReset();
    mockPrisma.order.update.mockReset();
    mockPrisma.order.updateMany.mockReset();
    mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.payment.findMany.mockReset();
    mockPrisma.payment.findMany.mockResolvedValue([]);
    mockPrisma.shipment.findUnique.mockReset();
    mockPrisma.shipment.create.mockReset();
    mockPrisma.shipment.create.mockResolvedValue({
      id: "ship-concur-01",
      orderId: "ord-concur-01",
      status: "PENDING",
    });
    mockPrisma.shipment.update.mockReset();
    mockPrisma.shipment.update.mockImplementation(async (args: any) => ({
      id: args.where.id,
      ...args.data,
    }));
    mockPrisma.shipment.updateMany.mockReset();
    mockPrisma.shipment.updateMany.mockResolvedValue({ count: 1 });
  });

  /**
   * Concurrency & Deadlock Invariance Test
   *
   * Architectural Guarantee:
   * PostgreSQL row-level locks on Order and Shipment must be acquired in a canonical,
   * deterministic total hierarchy across all execution paths:
   *   1. Order row lock (SELECT ... FROM "Order" ... FOR UPDATE)
   *   2. Shipment row lock (SELECT ... FROM "Shipment" ... FOR UPDATE)
   *
   * By ensuring neither transaction ever acquires Shipment before Order, Coffman condition #4
   * (Circular Wait) is impossible, preventing database deadlocks between simultaneous shipment
   * creation (createShipmentForOrder) and courier webhook status updates (updateShipmentStatus).
   *
   * Limitation Documentation:
   * Vitest runs in a mocked database environment without an active PostgreSQL lock manager.
   * Lock acquisition ordering is tested directly by inspecting the sequence of $queryRaw calls
   * and verifying strict invariant compliance.
   */
  it("verifies canonical lock order [Order FOR UPDATE -> Shipment FOR UPDATE] in createShipmentForOrder()", async () => {
    const shippingService = new ShippingService(mockProvider as any);

    const cleanOrder = {
      id: "ord-lock-01",
      orderNumber: "VL-ORD-LOCK-01",
      status: "PENDING",
      paymentMethod: "ONLINE",
      paymentStatus: "SUCCESS",
      shipment: null,
      shippingCost: 60,
      total: 1060,
    };

    mockPrisma.order.findUnique
      .mockResolvedValueOnce(cleanOrder) // outside check
      .mockResolvedValueOnce(cleanOrder) // tx1 check
      .mockResolvedValueOnce(cleanOrder); // tx3 check

    mockPrisma.shipment.findUnique.mockResolvedValueOnce({
      id: "local-shipment-uuid-01",
      orderId: "ord-lock-01",
      status: "PENDING",
    });

    mockPrisma.payment.findMany
      .mockResolvedValueOnce([
        {
          id: "pay-lock-01",
          status: "SUCCESS",
          captures: [{ isPrimary: true, reconciliationStatus: CaptureReconciliationStatus.SETTLED }],
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "pay-lock-01",
          status: "SUCCESS",
          captures: [{ isPrimary: true, reconciliationStatus: CaptureReconciliationStatus.SETTLED }],
        },
      ]);

    await shippingService.createShipmentForOrder("ord-lock-01");

    // Inspect $queryRaw calls:
    // Tx 1: SELECT id FROM "Order" WHERE id = 'ord-lock-01' FOR UPDATE
    // Tx 3: SELECT id FROM "Order" WHERE id = 'ord-lock-01' FOR UPDATE
    // Tx 3: SELECT id FROM "Shipment" WHERE id = 'local-shipment-uuid-01' FOR UPDATE
    const rawCalls = mockPrisma.$queryRaw.mock.calls;
    expect(rawCalls.length).toBe(3);

    const tx1OrderLock = JSON.stringify(rawCalls[0]);
    expect(tx1OrderLock).toContain("Order");
    expect(tx1OrderLock).toContain("FOR UPDATE");

    const tx3OrderLock = JSON.stringify(rawCalls[1]);
    expect(tx3OrderLock).toContain("Order");
    expect(tx3OrderLock).toContain("FOR UPDATE");

    const tx3ShipmentLock = JSON.stringify(rawCalls[2]);
    expect(tx3ShipmentLock).toContain("Shipment");
    expect(tx3ShipmentLock).toContain("FOR UPDATE");
  });

  it("verifies preliminary non-locking lookup and canonical lock order [Order FOR UPDATE -> Shipment FOR UPDATE] in updateShipmentStatus()", async () => {
    const shippingService = new ShippingService(mockProvider as any);

    const orderId = "ord-lock-02";
    const shipmentId = "ship-lock-02";
    const shipmentRecord = {
      id: shipmentId,
      orderId: orderId,
      status: "CREATED",
      shippedAt: null,
      deliveredAt: null,
    };
    const orderRecord = {
      id: orderId,
      status: "PENDING",
      paymentMethod: "ONLINE",
      paymentStatus: "SUCCESS",
    };

    mockPrisma.shipment.findUnique
      .mockResolvedValueOnce({ id: shipmentId, orderId }) // 1. preliminary non-locking read
      .mockResolvedValueOnce(shipmentRecord) // 2. locked re-read inside tx
      .mockResolvedValueOnce({ ...shipmentRecord, status: "IN_TRANSIT" }); // 3. re-read after updateMany

    mockPrisma.order.findUnique.mockResolvedValueOnce(orderRecord);

    mockPrisma.payment.findMany.mockResolvedValueOnce([
      {
        id: "pay-lock-02",
        status: "SUCCESS",
        captures: [{ isPrimary: true, reconciliationStatus: CaptureReconciliationStatus.SETTLED }],
      },
    ]);

    await shippingService.updateShipmentStatus(shipmentId, "IN_TRANSIT");

    const rawCalls = mockPrisma.$queryRaw.mock.calls;
    expect(rawCalls.length).toBe(2);

    // Call 1 MUST be Order FOR UPDATE
    const firstLock = JSON.stringify(rawCalls[0]);
    expect(firstLock).toContain("Order");
    expect(firstLock).toContain("FOR UPDATE");

    // Call 2 MUST be Shipment FOR UPDATE
    const secondLock = JSON.stringify(rawCalls[1]);
    expect(secondLock).toContain("Shipment");
    expect(secondLock).toContain("FOR UPDATE");
  });

  it("simulates concurrent shipment creation and status update with consistent lock hierarchy", async () => {
    const shippingService = new ShippingService(mockProvider as any);

    const orderId = "ord-concurrent-01";
    const shipmentId = "ship-concurrent-01";

    const activeOrder = {
      id: orderId,
      orderNumber: "VL-ORD-CONCURRENT",
      status: "PENDING",
      paymentMethod: "ONLINE",
      paymentStatus: "SUCCESS",
      shipment: null,
      shippingCost: 60,
      total: 1060,
    };
    const shipmentRecord = {
      id: shipmentId,
      orderId: orderId,
      status: "CREATED",
      shippedAt: null,
      deliveredAt: null,
    };

    // Mocks for creation
    mockPrisma.order.findUnique
      .mockResolvedValueOnce(activeOrder)
      .mockResolvedValueOnce(activeOrder)
      .mockResolvedValueOnce(activeOrder);
    mockPrisma.shipment.findUnique.mockResolvedValueOnce({
      id: "local-shipment-uuid-01",
      orderId,
      status: "PENDING",
    });
    mockPrisma.payment.findMany.mockResolvedValue([
      {
        id: "pay-concur",
        status: "SUCCESS",
        captures: [{ isPrimary: true, reconciliationStatus: CaptureReconciliationStatus.SETTLED }],
      },
    ]);

    // Creation executes
    await shippingService.createShipmentForOrder(orderId);

    // Now updateShipmentStatus executes
    mockPrisma.shipment.findUnique
      .mockResolvedValueOnce({ id: shipmentId, orderId })
      .mockResolvedValueOnce(shipmentRecord)
      .mockResolvedValueOnce({ ...shipmentRecord, status: "IN_TRANSIT" });
    mockPrisma.order.findUnique.mockResolvedValueOnce({ ...activeOrder, status: "SHIPPED" });

    await shippingService.updateShipmentStatus(shipmentId, "IN_TRANSIT");

    // Verify all 5 lock queries strictly followed [Order FOR UPDATE] before [Shipment FOR UPDATE]
    const allRawCalls = mockPrisma.$queryRaw.mock.calls.map((c: any) => JSON.stringify(c));
    expect(allRawCalls.length).toBe(5);

    // Call 0 (Create Tx1): Order lock
    expect(allRawCalls[0]).toContain("Order");
    // Call 1 (Create Tx3): Order lock
    expect(allRawCalls[1]).toContain("Order");
    // Call 2 (Create Tx3): Shipment lock
    expect(allRawCalls[2]).toContain("Shipment");
    // Call 3 (Update Tx): Order lock
    expect(allRawCalls[3]).toContain("Order");
    // Call 4 (Update Tx): Shipment lock
    expect(allRawCalls[4]).toContain("Shipment");
  });
});
