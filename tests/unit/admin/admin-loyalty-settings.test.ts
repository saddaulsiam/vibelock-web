import { describe, expect, test, vi, beforeEach } from "vitest";
import {
  getDefaultLoyaltySettings,
  LoyaltyProgramSettingsSchema,
} from "@/lib/settings/loyalty-settings";
import { updateLoyaltySettingsAction } from "@/lib/admin/settings/loyalty-settings-actions";
import prisma from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/authorization";

// Mock auth
vi.mock("@/lib/auth/authorization", () => ({
  requireRole: vi.fn().mockResolvedValue({
    id: "admin-1",
    name: "System Admin",
    email: "admin@vibelock.com",
    role: "ADMIN",
  }),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}));

// Mock prisma client
vi.mock("@/lib/prisma/client", () => {
  return {
    default: {
      loyaltySetting: {
        findFirst: vi.fn(),
        upsert: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    },
    Prisma: {},
  };
});

describe("Admin Settings - Loyalty Program Governance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("getDefaultLoyaltySettings provides authoritative Strategy A defaults", () => {
    const defaults = getDefaultLoyaltySettings();
    expect(defaults.enabled).toBe(true);
    expect(defaults.spendAmountPerPoint).toBe(100);
    expect(defaults.pointRedemptionValue).toBe(1);
    expect(defaults.silverThreshold).toBe(5000);
    expect(defaults.goldThreshold).toBe(20000);
    expect(defaults.platinumThreshold).toBe(50000);
    expect(defaults.enableInPos).toBe(true);
    expect(defaults.enableOnline).toBe(true);
  });

  test("LoyaltyProgramSettingsSchema rejects negative or invalid earning rates", () => {
    const invalidData = {
      spendAmountPerPoint: 2, // minimum is 10
      pointRedemptionValue: 0, // minimum is 0.1
    };

    const result = LoyaltyProgramSettingsSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  test("updateLoyaltySettingsAction rejects when caller is not an ADMIN", async () => {
    vi.mocked(requireRole).mockRejectedValueOnce(new Error("Unauthorized"));

    const formData = new FormData();
    formData.append("enabled", "true");

    const result = await updateLoyaltySettingsAction({ error: null }, formData);
    expect(result.error).toBeDefined();
  });

  test("updateLoyaltySettingsAction persists validated settings and records audit log", async () => {
    vi.mocked(prisma.loyaltySetting.findFirst).mockResolvedValue(null);

    const mockTx = {
      loyaltySetting: {
        findFirst: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: unknown) => {
      return (callback as (tx: typeof mockTx) => Promise<unknown>)(mockTx);
    });

    const formData = new FormData();
    formData.append("enabled", "true");
    formData.append("spendAmountPerPoint", "50");
    formData.append("pointRedemptionValue", "1");
    formData.append("minPointsToRedeem", "10");
    formData.append("maxCartDiscountPercentage", "50");
    formData.append("silverThreshold", "7500");
    formData.append("goldThreshold", "25000");
    formData.append("platinumThreshold", "60000");
    formData.append("enableInPos", "true");
    formData.append("enableOnline", "true");

    const result = await updateLoyaltySettingsAction({ error: null }, formData);

    expect(result.error).toBeNull();
    expect(result.message).toContain("successfully");

    expect(mockTx.loyaltySetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "singleton" },
        create: expect.objectContaining({
          id: "singleton",
          spendAmountPerPoint: 50,
          silverThreshold: 7500,
          goldThreshold: 25000,
          platinumThreshold: 60000,
        }),
      })
    );
  });
});
