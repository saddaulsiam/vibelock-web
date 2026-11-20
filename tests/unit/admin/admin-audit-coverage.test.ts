import { describe, expect, test, vi, beforeEach } from "vitest";
import { recordAuditLog, sanitizeAuditMetadata } from "@/lib/audit";
import { reconcilePaymentCaptureAction } from "@/lib/admin/payments/payment-reconciliation-actions";
import { saveCouponAction, toggleCouponStatusAction, deleteCouponAction } from "@/lib/admin/coupons/coupon-actions";
import { toggleProductPublishedAction, deleteProductAction } from "@/lib/admin/catalog/product-actions";
import { bulkUpdateProductStatusAction } from "@/lib/admin/catalog/product-bulk-actions";
import { toggleCategoryStatusAction, deleteCategoryAction } from "@/lib/admin/catalog/category-actions";
import { toggleBannerAction, deleteBannerAction } from "@/lib/admin/banners/banner-actions";
import {
  saveShippingZoneAction,
  saveShippingMethodAction,
  toggleShippingMethodAction,
  refreshShipmentStatusAction,
} from "@/lib/admin/shipping/shipping-actions";
import { RefundService } from "@/lib/refunds/service";
import { ShippingService } from "@/lib/shipping/service";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma/client";

vi.mock("@/lib/auth/authorization", () => ({
  requireRole: vi.fn().mockResolvedValue({ id: "admin-uuid-1", role: "ADMIN" }),
  requireUser: vi.fn().mockResolvedValue({ id: "admin-uuid-1", role: "ADMIN" }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock("@/lib/shipping/provider", () => ({
  getShippingProvider: vi.fn().mockReturnValue({
    name: "test-courier",
    createShipment: vi.fn().mockResolvedValue({ success: true, trackingNumber: "TRK123" }),
    getShipmentStatus: vi.fn().mockResolvedValue({ success: true, status: "DELIVERED" }),
  }),
}));

const mockDb = prisma as unknown as Record<string, unknown>;

describe("Phase 12.3 Admin Audit Coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Metadata Sanitization & Privacy", () => {
    test("recursively sanitizes passwords, card numbers, tokens, and secrets", () => {
      const rawMetadata = {
        normalField: "safe value",
        nested: {
          password: "my-super-secret-password",
          apiToken: "secret_token_12345",
          userToken: "bearer_xyz",
          card_no: "4111111111111111",
          cardNumber: "4222222222222222",
          cvv: "123",
          secretKey: "supersecret",
          innerObj: {
            pin: "9999",
            auth_header: "Bearer token",
            cookie: "session=abc",
          },
        },
        arr: [
          { token: "abc" },
          { harmless: 100 },
        ],
      };

      const sanitized = sanitizeAuditMetadata(rawMetadata) as Record<string, unknown>;
      const nested = sanitized.nested as Record<string, unknown>;
      const inner = nested.innerObj as Record<string, unknown>;
      const arr = sanitized.arr as Array<Record<string, unknown>>;

      expect(sanitized.normalField).toBe("safe value");
      expect(nested.password).toBe("[REDACTED]");
      expect(nested.apiToken).toBe("[REDACTED]");
      expect(nested.userToken).toBe("[REDACTED]");
      expect(nested.card_no).toBe("[REDACTED]");
      expect(nested.cardNumber).toBe("[REDACTED]");
      expect(nested.cvv).toBe("[REDACTED]");
      expect(nested.secretKey).toBe("[REDACTED]");
      expect(inner.pin).toBe("[REDACTED]");
      expect(inner.auth_header).toBe("[REDACTED]");
      expect(inner.cookie).toBe("[REDACTED]");
      expect(arr[0].token).toBe("[REDACTED]");
      expect(arr[1].harmless).toBe(100);
    });
  });

  describe("Fail-Closed Transactional Audit Logging", () => {
    test("fails closed and aborts transaction if auditLog.create fails in a transaction", async () => {
      const mockTx = {
        auditLog: {
          create: vi.fn().mockRejectedValue(new Error("DB_WRITE_AUDIT_DISK_FULL")),
        },
      } as unknown as Prisma.TransactionClient;

      await expect(
        recordAuditLog({
          actorId: "admin-uuid-1",
          action: "TEST_CRITICAL_ACTION",
          entityType: "Order",
          entityId: "order-123",
          tx: mockTx,
        })
      ).rejects.toThrow(/Audit log creation failed for action TEST_CRITICAL_ACTION\. Transaction aborted\./);
    });

    test("successfully writes audit log when auditLog.create succeeds", async () => {
      const mockTx = {
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: "audit-log-1" }),
        },
      } as unknown as Prisma.TransactionClient;

      const result = await recordAuditLog({
        actorId: "admin-uuid-1",
        action: "PAYMENT_RECONCILED",
        entityType: "Payment",
        entityId: "pay-1",
        metadata: { status: "RESOLVED", secretKey: "abc" },
        tx: mockTx,
      });

      expect((mockTx as unknown as { auditLog: { create: ReturnType<typeof vi.fn> } }).auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: "admin-uuid-1",
          action: "PAYMENT_RECONCILED",
          entityType: "Payment",
          entityId: "pay-1",
          metadata: { status: "RESOLVED", secretKey: "[REDACTED]" },
          ipAddress: null,
          userAgent: null,
        },
      });
      expect(result).toEqual({ id: "audit-log-1" });
    });
  });

  describe("Payment Reconciliation Audit Coverage", () => {
    test("reconcilePaymentCaptureAction audits PAYMENT_CAPTURE_RECONCILED inside transaction", async () => {
      const mockCapture = {
        id: "11111111-1111-4111-a111-111111111111",
        paymentId: "pay-123",
        gateway: "SSLCOMMERZ",
        bankTranId: "BANK-9999",
        amount: 2500,
        reconciliationStatus: "NEEDS_REVIEW",
        reconciliationNotes: "Old note",
        payment: { orderId: "order-456" },
      };

      const auditCreateMock = vi.fn().mockResolvedValue({ id: "audit-1" });
      const captureUpdateMock = vi.fn().mockResolvedValue({
        ...mockCapture,
        reconciliationStatus: "RESOLVED",
        reconciliationNotes: "Manually matched with SSLCommerz merchant statement.",
      });

      const mockTx = {
        paymentCapture: { update: captureUpdateMock },
        auditLog: { create: auditCreateMock },
      };

      mockDb.paymentCapture = {
        findUnique: vi.fn().mockResolvedValue(mockCapture),
      };
      mockDb.$transaction = vi.fn(async (cb: (tx: unknown) => unknown) => cb(mockTx));

      const formData = new FormData();
      formData.append("captureId", "11111111-1111-4111-a111-111111111111");
      formData.append("reconciliationStatus", "RESOLVED");
      formData.append("notes", "Manually matched with SSLCommerz merchant statement.");

      const result = await reconcilePaymentCaptureAction({ error: null }, formData);

      expect(result.error).toBeNull();
      expect(result.message).toContain("RESOLVED");
      expect(auditCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: "admin-uuid-1",
            action: "PAYMENT_CAPTURE_RECONCILED",
            entityType: "PaymentCapture",
            entityId: "11111111-1111-4111-a111-111111111111",
            metadata: expect.objectContaining({
              paymentId: "pay-123",
              orderId: "order-456",
              gateway: "SSLCOMMERZ",
              bankTranId: "BANK-9999",
              previousStatus: "NEEDS_REVIEW",
              newStatus: "RESOLVED",
              notes: "Manually matched with SSLCommerz merchant statement.",
            }),
          }),
        })
      );
    });
  });

  describe("Shipping Actions Audit Coverage", () => {
    test("saveShippingZoneAction audits SHIPPING_ZONE_CREATED", async () => {
      const auditCreateMock = vi.fn().mockResolvedValue({ id: "audit-1" });
      mockDb.auditLog = { create: auditCreateMock };
      mockDb.shippingZone = {
        create: vi.fn().mockResolvedValue({ id: "zone-1", name: "Chittagong Zone", countries: ["BD"] }),
      };

      const formData = new FormData();
      formData.append("name", "Chittagong Zone");
      formData.append("countries", "BD");

      const res = await saveShippingZoneAction({ error: null }, formData);
      expect(res.error).toBeNull();
      expect(auditCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: "admin-uuid-1",
            action: "SHIPPING_ZONE_CREATED",
            entityType: "ShippingZone",
            entityId: "zone-1",
          }),
        })
      );
    });

    test("saveShippingMethodAction audits SHIPPING_METHOD_CREATED", async () => {
      const auditCreateMock = vi.fn().mockResolvedValue({ id: "audit-1" });
      mockDb.auditLog = { create: auditCreateMock };
      mockDb.shippingMethod = {
        create: vi.fn().mockResolvedValue({
          id: "sm-1",
          zoneId: "11111111-1111-4111-a111-111111111111",
          name: "Express Courier",
          cost: 150,
          isActive: true,
        }),
      };

      const formData = new FormData();
      formData.append("zoneId", "11111111-1111-4111-a111-111111111111");
      formData.append("name", "Express Courier");
      formData.append("cost", "150");
      formData.append("isActive", "true");

      const res = await saveShippingMethodAction({ error: null }, formData);
      expect(res.error).toBeNull();
      expect(auditCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: "admin-uuid-1",
            action: "SHIPPING_METHOD_CREATED",
            entityType: "ShippingMethod",
            entityId: "sm-1",
          }),
        })
      );
    });

    test("toggleShippingMethodAction audits SHIPPING_METHOD_TOGGLED", async () => {
      const auditCreateMock = vi.fn().mockResolvedValue({ id: "audit-1" });
      mockDb.auditLog = { create: auditCreateMock };
      mockDb.shippingMethod = {
        findUnique: vi.fn().mockResolvedValue({ id: "11111111-1111-4111-a111-111111111111", isActive: true }),
        update: vi.fn().mockResolvedValue({ id: "11111111-1111-4111-a111-111111111111", isActive: false }),
      };

      const formData = new FormData();
      formData.append("id", "11111111-1111-4111-a111-111111111111");

      const res = await toggleShippingMethodAction({ error: null }, formData);
      expect(res.error).toBeNull();
      expect(auditCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: "admin-uuid-1",
            action: "SHIPPING_METHOD_TOGGLED",
            entityType: "ShippingMethod",
            entityId: "11111111-1111-4111-a111-111111111111",
            metadata: expect.objectContaining({ previousActive: true, isActive: false }),
          }),
        })
      );
    });

    test("refreshShipmentStatusAction audits SHIPMENT_STATUS_SYNCED", async () => {
      const auditCreateMock = vi.fn().mockResolvedValue({ id: "audit-1" });
      mockDb.auditLog = { create: auditCreateMock };
      const mockShipmentObj = {
        id: "11111111-1111-4111-a111-111111111111",
        orderId: "order-1",
        provider: "test-courier",
        providerShipmentId: "COURIER-123",
        status: "CREATED",
      };
      mockDb.shipment = {
        findUnique: vi.fn().mockResolvedValue(mockShipmentObj),
        findFirst: vi.fn().mockResolvedValue(mockShipmentObj),
      };
      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        order: {
          findUnique: vi.fn().mockResolvedValue({
            id: "order-1",
            status: "PROCESSING",
            paymentMethod: "COD",
            paymentStatus: "PENDING",
          }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        shipment: {
          findUnique: vi.fn().mockResolvedValue(mockShipmentObj),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        auditLog: { create: auditCreateMock },
      };
      mockDb.$transaction = vi.fn(async (cb: (tx: unknown) => unknown) => cb(mockTx));

      const formData = new FormData();
      formData.append("id", "11111111-1111-4111-a111-111111111111");

      const res = await refreshShipmentStatusAction({ error: null }, formData);
      expect(res.error).toBeNull();
      expect(auditCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: "admin-uuid-1",
            action: "SHIPMENT_STATUS_SYNCED",
            entityType: "Shipment",
            entityId: "11111111-1111-4111-a111-111111111111",
            metadata: expect.objectContaining({
              provider: "test-courier",
              providerShipmentId: "COURIER-123",
            }),
          }),
        })
      );
    });
  });

  describe("Coupon Actions Audit Coverage", () => {
    test("saveCouponAction audits COUPON_CREATED", async () => {
      const auditCreateMock = vi.fn().mockResolvedValue({ id: "audit-1" });
      mockDb.auditLog = { create: auditCreateMock };
      mockDb.coupon = {
        create: vi.fn().mockResolvedValue({
          id: "coup-1",
          code: "SUMMER50",
          discountType: "PERCENTAGE",
          discountValue: 50,
          isActive: true,
        }),
      };

      const formData = new FormData();
      formData.append("code", "SUMMER50");
      formData.append("discountType", "PERCENTAGE");
      formData.append("discountValue", "50");
      formData.append("isActive", "true");

      const res = await saveCouponAction({ error: null }, formData);
      expect(res.error).toBeNull();
      expect(auditCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: "admin-uuid-1",
            action: "COUPON_CREATED",
            entityType: "Coupon",
            entityId: "coup-1",
            metadata: expect.objectContaining({ code: "SUMMER50" }),
          }),
        })
      );
    });

    test("toggleCouponStatusAction audits COUPON_STATUS_TOGGLED", async () => {
      const auditCreateMock = vi.fn().mockResolvedValue({ id: "audit-1" });
      mockDb.auditLog = { create: auditCreateMock };
      mockDb.coupon = {
        findUnique: vi.fn().mockResolvedValue({ id: "coup-1", code: "FLASH10", isActive: true }),
        update: vi.fn().mockResolvedValue({ id: "coup-1", code: "FLASH10", isActive: false }),
      };

      const res = await toggleCouponStatusAction("coup-1");
      expect(res.success).toBe(true);
      expect(auditCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: "admin-uuid-1",
            action: "COUPON_STATUS_TOGGLED",
            entityType: "Coupon",
            entityId: "coup-1",
            metadata: expect.objectContaining({ previousActive: true, isActive: false }),
          }),
        })
      );
    });

    test("deleteCouponAction audits COUPON_DELETED", async () => {
      const auditCreateMock = vi.fn().mockResolvedValue({ id: "audit-1" });
      mockDb.auditLog = { create: auditCreateMock };
      mockDb.coupon = {
        findUnique: vi.fn().mockResolvedValue({ id: "coup-1", code: "TESTDEL", usageCount: 0 }),
        delete: vi.fn().mockResolvedValue({ id: "coup-1" }),
      };

      const res = await deleteCouponAction("coup-1");
      expect(res.success).toBe(true);
      expect(auditCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: "admin-uuid-1",
            action: "COUPON_DELETED",
            entityType: "Coupon",
            entityId: "coup-1",
          }),
        })
      );
    });
  });

  describe("Catalog & Banner Actions Audit Coverage", () => {
    test("toggleProductPublishedAction audits PRODUCT_STATUS_TOGGLED", async () => {
      const auditCreateMock = vi.fn().mockResolvedValue({ id: "audit-1" });
      mockDb.auditLog = { create: auditCreateMock };
      mockDb.product = {
        findUnique: vi.fn().mockResolvedValue({ id: "11111111-1111-4111-a111-111111111111", status: "PUBLISHED" }),
        update: vi.fn().mockResolvedValue({ id: "11111111-1111-4111-a111-111111111111", status: "DRAFT" }),
      };

      const formData = new FormData();
      formData.append("id", "11111111-1111-4111-a111-111111111111");

      const res = await toggleProductPublishedAction({ error: null }, formData);
      expect(res.error).toBeNull();
      expect(auditCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: "admin-uuid-1",
            action: "PRODUCT_STATUS_TOGGLED",
            entityType: "Product",
            entityId: "11111111-1111-4111-a111-111111111111",
            metadata: expect.objectContaining({ previousStatus: "PUBLISHED", newStatus: "DRAFT" }),
          }),
        })
      );
    });

    test("deleteProductAction audits PRODUCT_DELETED", async () => {
      const auditCreateMock = vi.fn().mockResolvedValue({ id: "audit-1" });
      mockDb.auditLog = { create: auditCreateMock };
      mockDb.product = {
        findUnique: vi.fn().mockResolvedValue({
          id: "11111111-1111-4111-a111-111111111111",
          variants: [{ _count: { inventoryTransactions: 0, inventoryReservations: 0, cartItems: 0 } }],
          _count: { reviews: 0 },
        }),
        delete: vi.fn().mockResolvedValue({ id: "11111111-1111-4111-a111-111111111111" }),
      };

      const formData = new FormData();
      formData.append("id", "11111111-1111-4111-a111-111111111111");

      const res = await deleteProductAction({ error: null }, formData);
      expect(res.error).toBeNull();
      expect(auditCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: "admin-uuid-1",
            action: "PRODUCT_DELETED",
            entityType: "Product",
            entityId: "11111111-1111-4111-a111-111111111111",
          }),
        })
      );
    });

    test("bulkUpdateProductStatusAction audits PRODUCT_BULK_STATUS_UPDATED", async () => {
      const auditCreateMock = vi.fn().mockResolvedValue({ id: "audit-1" });
      mockDb.auditLog = { create: auditCreateMock };
      mockDb.product = {
        updateMany: vi.fn().mockResolvedValue({ count: 2 }),
      };

      const res = await bulkUpdateProductStatusAction(["prod-1", "prod-2"], "ARCHIVED");
      expect(res.error).toBeNull();
      expect(auditCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: "admin-uuid-1",
            action: "PRODUCT_BULK_STATUS_UPDATED",
            entityType: "Product",
            entityId: "bulk",
            metadata: expect.objectContaining({ count: 2, newStatus: "ARCHIVED" }),
          }),
        })
      );
    });

    test("toggleCategoryStatusAction audits CATEGORY_STATUS_TOGGLED", async () => {
      const auditCreateMock = vi.fn().mockResolvedValue({ id: "audit-1" });
      mockDb.auditLog = { create: auditCreateMock };
      mockDb.category = {
        update: vi.fn().mockResolvedValue({ id: "cat-1", isActive: false }),
      };

      const res = await toggleCategoryStatusAction("cat-1", true);
      expect(res.error).toBeNull();
      expect(auditCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: "admin-uuid-1",
            action: "CATEGORY_STATUS_TOGGLED",
            entityType: "Category",
            entityId: "cat-1",
            metadata: expect.objectContaining({ previousActive: true, isActive: false }),
          }),
        })
      );
    });

    test("deleteCategoryAction audits CATEGORY_DELETED", async () => {
      const auditCreateMock = vi.fn().mockResolvedValue({ id: "audit-1" });
      mockDb.auditLog = { create: auditCreateMock };
      mockDb.category = {
        findUnique: vi.fn().mockResolvedValue({
          id: "11111111-1111-4111-a111-111111111111",
          _count: { products: 0, children: 0 },
        }),
        delete: vi.fn().mockResolvedValue({ id: "11111111-1111-4111-a111-111111111111" }),
      };

      const formData = new FormData();
      formData.append("id", "11111111-1111-4111-a111-111111111111");

      const res = await deleteCategoryAction({ error: null }, formData);
      expect(res.error).toBeNull();
      expect(auditCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: "admin-uuid-1",
            action: "CATEGORY_DELETED",
            entityType: "Category",
            entityId: "11111111-1111-4111-a111-111111111111",
          }),
        })
      );
    });

    test("toggleBannerAction and deleteBannerAction audit BANNER_STATUS_TOGGLED and BANNER_DELETED", async () => {
      const auditCreateMock = vi.fn().mockResolvedValue({ id: "audit-1" });
      mockDb.auditLog = { create: auditCreateMock };
      mockDb.banner = {
        update: vi.fn().mockResolvedValue({ id: "11111111-1111-4111-a111-111111111111", isActive: true }),
        delete: vi.fn().mockResolvedValue({ id: "11111111-1111-4111-a111-111111111111" }),
      };

      const toggleFormData = new FormData();
      toggleFormData.append("id", "11111111-1111-4111-a111-111111111111");
      toggleFormData.append("active", "true");

      await toggleBannerAction(toggleFormData);
      expect(auditCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: "admin-uuid-1",
            action: "BANNER_STATUS_TOGGLED",
            entityType: "Banner",
            entityId: "11111111-1111-4111-a111-111111111111",
            metadata: { isActive: true },
          }),
        })
      );

      const deleteFormData = new FormData();
      deleteFormData.append("id", "11111111-1111-4111-a111-111111111111");

      await deleteBannerAction(deleteFormData);
      expect(auditCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: "admin-uuid-1",
            action: "BANNER_DELETED",
            entityType: "Banner",
            entityId: "11111111-1111-4111-a111-111111111111",
          }),
        })
      );
    });
  });

  describe("Refund Service Audit Coverage", () => {
    test("initiateRefund records REFUND_INITIATED audit log", async () => {
      const auditCreateMock = vi.fn().mockResolvedValue({ id: "audit-1" });
      const refundCreateMock = vi.fn().mockResolvedValue({
        id: "ref-1",
        paymentId: "pay-1",
        amount: new Prisma.Decimal(500),
        status: "PENDING",
      });

      const mockTx = {
        payment: {
          findUnique: vi.fn().mockResolvedValue({
            id: "pay-1",
            orderId: "order-1",
            amount: new Prisma.Decimal(1000),
            status: "SUCCESS",
            refunds: [],
            order: { userId: "user-1" },
          }),
        },
        $queryRaw: vi.fn().mockResolvedValue([{ id: "user-1" }]),
        refund: { create: refundCreateMock },
        auditLog: { create: auditCreateMock },
      };

      mockDb.$transaction = vi.fn(async (cb: (tx: unknown) => unknown) => cb(mockTx));

      const refundService = new RefundService();
      const refund = await refundService.initiateRefund(
        "pay-1",
        new Prisma.Decimal(500),
        "Damaged item",
        "admin-uuid-1"
      );

      expect(refund.id).toBe("ref-1");
      expect(auditCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: "admin-uuid-1",
            action: "REFUND_INITIATED",
            entityType: "Refund",
            entityId: "ref-1",
            metadata: expect.objectContaining({
              paymentId: "pay-1",
              orderId: "order-1",
              amount: 500,
              reason: "Damaged item",
            }),
          }),
        })
      );
    });

    test("markRefundSuccess records REFUND_COMPLETED audit log", async () => {
      const auditCreateMock = vi.fn().mockResolvedValue({ id: "audit-1" });
      const mockRefund = {
        id: "ref-1",
        paymentId: "pay-1",
        amount: new Prisma.Decimal(1000),
        status: "PENDING",
      };

      const mockTx = {
        refund: {
          findUnique: vi.fn().mockResolvedValue(mockRefund),
          update: vi.fn().mockResolvedValue({ ...mockRefund, status: "SUCCESS" }),
        },
        payment: {
          findUnique: vi.fn().mockResolvedValue({
            id: "pay-1",
            amount: new Prisma.Decimal(1000),
            status: "SUCCESS",
            refunds: [{ ...mockRefund, status: "SUCCESS" }],
          }),
          update: vi.fn().mockResolvedValue({ id: "pay-1", orderId: "order-1", status: "REFUNDED" }),
        },
        order: { update: vi.fn().mockResolvedValue({ id: "order-1" }) },
        $queryRaw: vi.fn().mockResolvedValue([]),
        auditLog: { create: auditCreateMock },
      } as unknown as Prisma.TransactionClient;

      const refundService = new RefundService();
      await refundService.markRefundSuccess("ref-1", "GW-REF-123", mockTx, "admin-uuid-1");

      expect(auditCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: "admin-uuid-1",
            action: "REFUND_COMPLETED",
            entityType: "Refund",
            entityId: "ref-1",
            metadata: expect.objectContaining({
              paymentId: "pay-1",
              orderId: "order-1",
              amount: 1000,
              gatewayRefId: "GW-REF-123",
              paymentStatus: "REFUNDED",
            }),
          }),
        })
      );
    });

    test("markRefundFailed records REFUND_FAILED audit log", async () => {
      const auditCreateMock = vi.fn().mockResolvedValue({ id: "audit-1" });
      const mockRefund = {
        id: "ref-1",
        paymentId: "pay-1",
        amount: new Prisma.Decimal(1000),
        status: "PENDING",
      };

      const mockTx = {
        refund: {
          findUnique: vi.fn().mockResolvedValue(mockRefund),
          update: vi.fn().mockResolvedValue({ ...mockRefund, status: "FAILED" }),
        },
        auditLog: { create: auditCreateMock },
      } as unknown as Prisma.TransactionClient;

      const refundService = new RefundService();
      await refundService.markRefundFailed("ref-1", mockTx, "admin-uuid-1", "Bank rejected refund");

      expect(auditCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: "admin-uuid-1",
            action: "REFUND_FAILED",
            entityType: "Refund",
            entityId: "ref-1",
            metadata: expect.objectContaining({
              paymentId: "pay-1",
              amount: 1000,
              failureReason: "Bank rejected refund",
            }),
          }),
        })
      );
    });
  });

  describe("Shipping Service Status Audit Coverage", () => {
    test("updateShipmentStatus records SHIPMENT_STATUS_UPDATED inside transaction", async () => {
      const auditCreateMock = vi.fn().mockResolvedValue({ id: "audit-1" });
      const mockShipment = {
        id: "ship-1",
        orderId: "order-1",
        status: "CREATED",
        provider: "test-courier",
        shippingAmount: new Prisma.Decimal(100),
      };

      mockDb.shipment = {
        findUnique: vi.fn().mockResolvedValue(mockShipment),
      };

      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        order: {
          findUnique: vi.fn().mockResolvedValue({
            id: "order-1",
            status: "PROCESSING",
            paymentMethod: "COD",
            paymentStatus: "PENDING",
          }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        shipment: {
          findUnique: vi.fn().mockResolvedValue(mockShipment),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        auditLog: { create: auditCreateMock },
      };

      mockDb.$transaction = vi.fn(async (cb: (tx: unknown) => unknown) => cb(mockTx));

      const shippingService = new ShippingService({
        name: "test-courier",
        createShipment: vi.fn().mockResolvedValue({ success: true }),
        getShipmentStatus: vi.fn().mockResolvedValue({ success: true, status: "IN_TRANSIT" }),
      });

      await shippingService.updateShipmentStatus("ship-1", "IN_TRANSIT", "admin-uuid-1");

      expect(auditCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: "admin-uuid-1",
            action: "SHIPMENT_STATUS_UPDATED",
            entityType: "Shipment",
            entityId: "ship-1",
            metadata: expect.objectContaining({
              orderId: "order-1",
              from: "CREATED",
              to: "IN_TRANSIT",
            }),
          }),
        })
      );
    });
  });
});
