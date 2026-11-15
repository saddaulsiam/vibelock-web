/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("@/lib/config/env", () => ({
  env: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
    AUTH_SECRET: "mock-secret-for-testing-at-least-32-chars-long",
  },
}));

const { mockPrismaTx, mockManagerUser } = vi.hoisted(() => {
  const mockPrismaTx: any = {
    $queryRaw: vi.fn(),
    refund: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    returnRequest: {
      findUnique: vi.fn(),
    },
    payment: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    orderHistory: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };

  const mockManagerUser = {
    id: "admin-manager-uuid",
    name: "Operations Manager",
    email: "manager@vibelock.bd",
    role: "MANAGER",
  };

  return { mockPrismaTx, mockManagerUser };
});

vi.mock("@/lib/prisma/client", () => ({
  default: {
    ...mockPrismaTx,
    $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockPrismaTx)),
  },
}));

const mockRequireRole = vi.fn(async () => mockManagerUser);
vi.mock("@/lib/auth/authorization", () => ({
  requireRole: () => mockRequireRole(),
}));

vi.mock("@/lib/email/return-emails", () => ({
  notifyCashRefundProcessed: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}));

import { recordManualReturnRefundAction } from "@/lib/admin/returns/return-actions";
import { Prisma } from "@prisma/client";

describe("Admin Action: recordManualReturnRefundAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockRequireRole.mockResolvedValue(mockManagerUser);
  });

  test("unauthorized users cannot complete manual refunds", async () => {
    mockRequireRole.mockRejectedValueOnce(new Error("Unauthorized access."));

    const formData = new FormData();
    formData.append("returnId", "11111111-1111-4111-a111-111111111111");
    formData.append("refundId", "22222222-2222-4222-a222-222222222222");
    formData.append("transactionReference", "BKASH-TRX-12345");

    await expect(
      recordManualReturnRefundAction({ error: null }, formData)
    ).rejects.toThrow("Unauthorized access.");
  });

  test("rejects invalid transaction references (< 3 characters)", async () => {
    const formData = new FormData();
    formData.append("returnId", "11111111-1111-4111-a111-111111111111");
    formData.append("refundId", "22222222-2222-4222-a222-222222222222");
    formData.append("transactionReference", "ab"); // Too short!

    const result = await recordManualReturnRefundAction({ error: null }, formData);
    expect(result.error).toContain("Provider transaction reference must be at least 3 characters");
  });

  test("rejects when refund does not belong to the supplied return request and order", async () => {
    const returnId = "11111111-1111-4111-a111-111111111111";
    const refundId = "22222222-2222-4222-a222-222222222222";

    // Refund belongs to order A
    mockPrismaTx.refund.findUnique.mockResolvedValueOnce({
      id: refundId,
      payment: { orderId: "order-A-uuid", gateway: "BKASH" },
    });
    // Return request belongs to order B
    mockPrismaTx.returnRequest.findUnique.mockResolvedValueOnce({
      id: returnId,
      orderId: "order-B-uuid", // MISMATCH!
    });

    const formData = new FormData();
    formData.append("returnId", returnId);
    formData.append("refundId", refundId);
    formData.append("transactionReference", "BKASH-TRX-12345");

    const result = await recordManualReturnRefundAction({ error: null }, formData);
    expect(result.error).toContain("That refund does not belong to this return.");
  });

  test("valid manager action records manual refund completion, updates payment/order, and creates audit trail", async () => {
    const returnId = "11111111-1111-4111-a111-111111111111";
    const refundId = "22222222-2222-4222-a222-222222222222";
    const orderId = "order-match-uuid";

    const refundRecord = {
      id: refundId,
      paymentId: "pay-bkash-uuid",
      amount: new Prisma.Decimal("750.00"),
      status: "PENDING",
      reason: "Returned damaged t-shirt",
      payment: { id: "pay-bkash-uuid", orderId, gateway: "BKASH" },
    };

    const returnRequestRecord = {
      id: returnId,
      orderId,
    };

    const paymentRecord = {
      id: "pay-bkash-uuid",
      orderId,
      amount: new Prisma.Decimal("750.00"),
      status: "SUCCESS",
      gateway: "BKASH",
      refunds: [], // no prior refunds
    };

    // 1. Initial lookups in Server Action
    mockPrismaTx.refund.findUnique.mockResolvedValueOnce(refundRecord);
    mockPrismaTx.returnRequest.findUnique.mockResolvedValueOnce(returnRequestRecord);

    // 2. Lookups inside RefundService.recordManualRefundSuccess transaction
    mockPrismaTx.refund.findUnique.mockResolvedValueOnce(refundRecord);
    mockPrismaTx.refund.findUniqueOrThrow.mockResolvedValueOnce(refundRecord);
    mockPrismaTx.payment.findUniqueOrThrow.mockResolvedValueOnce(paymentRecord);
    mockPrismaTx.refund.update.mockResolvedValueOnce({
      ...refundRecord,
      status: "SUCCESS",
      gatewayRefId: "BKASH-MGR-TRX-8888",
    });
    mockPrismaTx.payment.update.mockResolvedValueOnce({
      ...paymentRecord,
      status: "REFUNDED",
    });
    mockPrismaTx.order.update.mockResolvedValueOnce({
      id: orderId,
      status: "DELIVERED",
      paymentStatus: "REFUNDED",
    });

    // 3. Customer notification lookup
    mockPrismaTx.order.findUnique.mockResolvedValueOnce({
      id: orderId,
      customerEmail: "customer@vibelock.bd",
      customerName: "Jane Doe",
      customerPhone: "01700000000",
      orderNumber: "VL-20261115-RET01",
    });

    const formData = new FormData();
    formData.append("returnId", returnId);
    formData.append("refundId", refundId);
    formData.append("transactionReference", "BKASH-MGR-TRX-8888");
    formData.append("notes", "Disbursed via bKash Merchant Portal");

    const result = await recordManualReturnRefundAction({ error: null }, formData);

    expect(result.error).toBeNull();
    expect(result.message).toContain("Manual refund recorded successfully.");

    // Verify Refund was transitioned to SUCCESS with the reference
    expect(mockPrismaTx.refund.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: refundId },
        data: expect.objectContaining({
          status: "SUCCESS",
          gatewayRefId: "BKASH-MGR-TRX-8888",
        }),
      })
    );

    // Verify Payment and Order updated to REFUNDED
    expect(mockPrismaTx.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pay-bkash-uuid" },
        data: { status: "REFUNDED" },
      })
    );
    expect(mockPrismaTx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: orderId },
        data: { paymentStatus: "REFUNDED" },
      })
    );

    // Verify immutable AuditLog created with manager actorId
    expect(mockPrismaTx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: "admin-manager-uuid",
          action: "MANUAL_REFUND_COMPLETED",
          entityType: "Refund",
          entityId: refundId,
          metadata: expect.objectContaining({
            transactionReference: "BKASH-MGR-TRX-8888",
            gateway: "BKASH",
            refundAmount: 750.0,
          }),
        }),
      })
    );
  });
});
