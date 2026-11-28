import { beforeEach, describe, expect, test, vi } from "vitest";

interface MockSession {
  user?: {
    id?: string;
    role?: string;
    name?: string;
    email?: string;
  };
}

let mockSession: MockSession | null = null;

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
    AUTH_SECRET: "mock-secret-for-testing-at-least-32-chars-long",
  },
}));

vi.mock("@/lib/config/env", () => ({
  env: mockEnv,
}));

const { mockPrisma } = vi.hoisted(() => {
  const storeSetting = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
  };
  const auditLog = {
    create: vi.fn(),
    findFirst: vi.fn(async () => null),
  };
  const user = {
    findUnique: vi.fn(async (args?: { where?: { id?: string } }) => {
      if (mockSession?.user?.id && args?.where?.id === mockSession.user.id) {
        return {
          id: mockSession.user.id,
          role: mockSession.user.role || "CUSTOMER",
          name: "Test User",
          email: "test@example.com",
        };
      }
      return null;
    }),
  };
  const mockPrisma = {
    storeSetting,
    auditLog,
    user,
    $transaction: vi.fn(),
  };
  return { mockPrisma };
});

vi.mock("@/lib/prisma/client", () => ({
  default: mockPrisma,
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { updateInventoryReturnSettingsAction } from "@/lib/admin/settings/inventory-return-actions";
import {
  calculateReturnRefundAmount,
  DEFAULT_INVENTORY_RETURN_SETTINGS,
  getEffectiveLowStockThreshold,
  getEffectiveReturnWindowDays,
  getInventoryReturnSettings,
  InventoryReturnSettingsSchema,
  isCategoryReturnable,
} from "@/lib/settings/inventory-return-settings";

describe("Phase 5: VibeLock Inventory Intelligence & Return Policies Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = {
      user: {
        id: "admin-user-id",
        role: "ADMIN",
        name: "Admin Tester",
        email: "admin@vibelock.com",
      },
    };

    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => {
        return callback(mockPrisma);
      }
    );
  });

  describe("1. Zod Schema Validation & Boundary Rules", () => {
    test("validates defaults successfully", () => {
      const parsed = InventoryReturnSettingsSchema.safeParse(DEFAULT_INVENTORY_RETURN_SETTINGS);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.lowStockThreshold).toBe(5);
        expect(parsed.data.returnWindowDays).toBe(7);
        expect(parsed.data.deductShippingFeeFromRefund).toBe(true);
      }
    });

    test("enforces minimum low-stock threshold (at least 1)", () => {
      const resZero = InventoryReturnSettingsSchema.safeParse({
        ...DEFAULT_INVENTORY_RETURN_SETTINGS,
        lowStockThreshold: 0,
      });
      expect(resZero.success).toBe(false);

      const resNegative = InventoryReturnSettingsSchema.safeParse({
        ...DEFAULT_INVENTORY_RETURN_SETTINGS,
        lowStockThreshold: -5,
      });
      expect(resNegative.success).toBe(false);
    });

    test("enforces return window bounds (0 to 90 days)", () => {
      // 0 is valid (disables returns)
      const resZero = InventoryReturnSettingsSchema.safeParse({
        ...DEFAULT_INVENTORY_RETURN_SETTINGS,
        returnWindowDays: 0,
      });
      expect(resZero.success).toBe(true);

      // Negative is invalid
      const resNegative = InventoryReturnSettingsSchema.safeParse({
        ...DEFAULT_INVENTORY_RETURN_SETTINGS,
        returnWindowDays: -1,
      });
      expect(resNegative.success).toBe(false);

      // Over 90 days is invalid
      const resOver = InventoryReturnSettingsSchema.safeParse({
        ...DEFAULT_INVENTORY_RETURN_SETTINGS,
        returnWindowDays: 100,
      });
      expect(resOver.success).toBe(false);
    });

    test("rejects negative processing fees", () => {
      const res = InventoryReturnSettingsSchema.safeParse({
        ...DEFAULT_INVENTORY_RETURN_SETTINGS,
        returnProcessingFee: -50,
      });
      expect(res.success).toBe(false);
    });
  });

  describe("2. Strategy A Fallback & Error Resilience", () => {
    test("returns static defaults when no database row exists", async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue(null);

      const { settings, isPersisted, hasStore } = await getInventoryReturnSettings();
      expect(isPersisted).toBe(false);
      expect(hasStore).toBe(true);
      expect(settings.returnWindowDays).toBe(7);
      expect(settings.lowStockThreshold).toBe(5);
      expect(settings.deductShippingFeeFromRefund).toBe(true);
    });

    test("gracefully falls back when table is unmigrated (P2021 error)", async () => {
      const p2021Error = new Error("Table 'StoreSetting' does not exist in the current database");
      (p2021Error as unknown as { code: string }).code = "P2021";
      mockPrisma.storeSetting.findUnique.mockRejectedValue(p2021Error);

      const { settings, isPersisted, hasStore } = await getInventoryReturnSettings();
      expect(isPersisted).toBe(false);
      expect(hasStore).toBe(false);
      expect(settings.returnWindowDays).toBe(7);
      expect(settings.lowStockThreshold).toBe(5);
    });

    test("falls back to default settings when JSON is corrupted", async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue({
        key: "INVENTORY_RETURN_POLICIES",
        value: {
          lowStockThreshold: "INVALID_NUMBER",
        },
      });

      const { settings, isPersisted, hasStore } = await getInventoryReturnSettings();
      expect(isPersisted).toBe(false);
      expect(hasStore).toBe(true);
      expect(settings.lowStockThreshold).toBe(5);
    });

    test("fails closed and throws on critical database connection failure", async () => {
      mockPrisma.storeSetting.findUnique.mockRejectedValue(
        new Error("Connection terminated unexpectedly by database host")
      );

      await expect(getInventoryReturnSettings()).rejects.toThrow(
        "Database error while fetching store setting"
      );
    });
  });

  describe("3. Business Helpers & Refund Calculation", () => {
    test("resolves effective return window and low stock threshold", async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue({
        key: "INVENTORY_RETURN_POLICIES",
        value: {
          ...DEFAULT_INVENTORY_RETURN_SETTINGS,
          returnWindowDays: 14,
          lowStockThreshold: 10,
        },
      });

      const returnDays = await getEffectiveReturnWindowDays();
      const lowStock = await getEffectiveLowStockThreshold();

      expect(returnDays).toBe(14);
      expect(lowStock).toBe(10);
    });

    test("correctly evaluates non-returnable categories case-insensitively", () => {
      const settings = {
        ...DEFAULT_INVENTORY_RETURN_SETTINGS,
        nonReturnableCategories: ["Underwear", "Swimwear", "Clearance"],
      };

      expect(isCategoryReturnable("T-Shirt", settings)).toBe(true);
      expect(isCategoryReturnable("Denim Pants", settings)).toBe(true);
      expect(isCategoryReturnable("underwear", settings)).toBe(false);
      expect(isCategoryReturnable("SWIMWEAR", settings)).toBe(false);
      expect(isCategoryReturnable(" clearance ", settings)).toBe(false);
    });

    test("calculates return refund deduction with shipping deduction enabled", () => {
      const settings = {
        ...DEFAULT_INVENTORY_RETURN_SETTINGS,
        deductShippingFeeFromRefund: true,
        returnProcessingFee: 50,
      };

      const result = calculateReturnRefundAmount({
        itemTotal: 1500,
        originalShippingCost: 120,
        settings,
      });

      expect(result.originalTotal).toBe(1500);
      expect(result.deductedShippingFee).toBe(120);
      expect(result.deductedProcessingFee).toBe(50);
      expect(result.netRefundAmount).toBe(1500 - 120 - 50); // 1330
    });

    test("does not deduct shipping fee if policy is disabled", () => {
      const settings = {
        ...DEFAULT_INVENTORY_RETURN_SETTINGS,
        deductShippingFeeFromRefund: false,
        returnProcessingFee: 0,
      };

      const result = calculateReturnRefundAmount({
        itemTotal: 2000,
        originalShippingCost: 120,
        settings,
      });

      expect(result.deductedShippingFee).toBe(0);
      expect(result.deductedProcessingFee).toBe(0);
      expect(result.netRefundAmount).toBe(2000);
    });

    test("caps net refund at 0 if deductions exceed item total", () => {
      const settings = {
        ...DEFAULT_INVENTORY_RETURN_SETTINGS,
        deductShippingFeeFromRefund: true,
        returnProcessingFee: 500,
      };

      const result = calculateReturnRefundAmount({
        itemTotal: 250,
        originalShippingCost: 120,
        settings,
      });

      // Deductions: 120 + 500 = 620 > 250
      expect(result.netRefundAmount).toBe(0);
    });
  });

  describe("4. Admin Action Mutation & Audit Log Persistence", () => {
    test("rejects mutation if caller is not an ADMIN", async () => {
      mockSession = {
        user: { id: "customer-1", role: "CUSTOMER" },
      };

      const formData = new FormData();
      formData.set("lowStockThreshold", "8");
      formData.set("returnWindowDays", "10");

      await expect(
        updateInventoryReturnSettingsAction({ error: null }, formData)
      ).rejects.toThrow();
    });

    test("successfully saves valid policies and creates an immutable audit log", async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue(null);
      mockPrisma.storeSetting.upsert.mockResolvedValue({
        id: "mock-setting-id",
        key: "INVENTORY_RETURN_POLICIES",
        value: {
          ...DEFAULT_INVENTORY_RETURN_SETTINGS,
          lowStockThreshold: 12,
          returnWindowDays: 14,
        },
      });

      const formData = new FormData();
      formData.set("lowStockThreshold", "12");
      formData.set("criticalStockThreshold", "3");
      formData.set("allowBackorders", "true");
      formData.set("autoHideOutOfStock", "false");
      formData.set("notifyLowStockEmail", "true");
      formData.set("lowStockNotificationEmail", "warehouse@vibelock.com");
      formData.set("returnWindowDays", "14");
      formData.set("requirePhotoProofOnDefect", "true");
      formData.set("allowPartialReturns", "true");
      formData.set("nonReturnableCategories", "Underwear, Swimwear, Cosmetics");
      formData.set("deductShippingFeeFromRefund", "true");
      formData.set("returnProcessingFee", "60");
      formData.set("autoRestockCompletedReturns", "false");
      formData.set("restockLocation", "Mirpur Warehouse Hub");

      const result = await updateInventoryReturnSettingsAction({ error: null }, formData);

      expect(result.error).toBeNull();
      expect(result.message).toContain(
        "Inventory threshold alerts and customer return policies updated successfully"
      );

      // Verify audit log creation
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "STORE_SETTING_UPDATED",
            entityType: "StoreSetting",
            actorId: "admin-user-id",
          }),
        })
      );
    });
  });
});
