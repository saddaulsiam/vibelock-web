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

vi.mock("../../src/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  usePathname: vi.fn(() => "/admin/settings/shipping"),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

import AdminSettingsLayout from "../../src/app/(protected)/admin/settings/layout";
import AdminShippingRulesPage from "../../src/app/(protected)/admin/settings/shipping/page";
import { updateShippingRulesAction } from "../../src/lib/admin/settings/shipping-rules-actions";
import {
  calculateEffectiveShippingFee,
  getDefaultShippingRulesSettings,
  getShippingRulesSettings,
  updateShippingRulesSettings,
  type ShippingRulesSettings,
} from "../../src/lib/settings/shipping-rules-settings";

describe("Phase 3: VibeLock Logistics, Shipping Rules & Free Delivery Engine", () => {
  beforeEach(() => {
    mockSession = null;
    vi.clearAllMocks();

    mockPrisma.storeSetting.findUnique.mockResolvedValue(null);
    mockPrisma.storeSetting.upsert.mockImplementation(
      async ({
        create,
        update,
      }: {
        create?: Record<string, unknown>;
        update?: Record<string, unknown>;
      }) => ({
        id: "mock-setting-uuid",
        createdAt: new Date(),
        updatedAt: new Date(),
        ...create,
        ...update,
      })
    );
    mockPrisma.auditLog.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: "mock-audit-uuid",
        createdAt: new Date(),
        ...data,
      })
    );
    mockPrisma.$transaction.mockImplementation(
      async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma)
    );
  });

  describe("1. Admin Authorization Guards", () => {
    test("redirects unauthenticated users to /login", async () => {
      mockSession = null;
      await expect(AdminSettingsLayout({ children: null })).rejects.toThrow("NEXT_REDIRECT:/login");
      await expect(AdminShippingRulesPage()).rejects.toThrow("NEXT_REDIRECT:/login");
    });

    test("redirects non-admin (CUSTOMER/STAFF) users to /unauthorized", async () => {
      mockSession = { user: { id: "cust-1", role: "CUSTOMER" } };
      await expect(AdminSettingsLayout({ children: null })).rejects.toThrow(
        "NEXT_REDIRECT:/unauthorized"
      );
      await expect(AdminShippingRulesPage()).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });

    test("allows ADMIN role users to access layout and shipping rules page", async () => {
      mockSession = {
        user: { id: "admin-1", email: "admin@vibelock.com", role: "ADMIN" },
      };

      const layoutResult = await AdminSettingsLayout({ children: "content" });
      expect(layoutResult).toBeDefined();

      const pageResult = await AdminShippingRulesPage();
      expect(pageResult).toBeDefined();
    });

    test("rejects server action invocation from non-admin users", async () => {
      mockSession = { user: { id: "cust-1", role: "CUSTOMER" } };
      const formData = new FormData();
      formData.set("freeShippingThreshold", "3000");

      await expect(updateShippingRulesAction({ error: null }, formData)).rejects.toThrow();
    });
  });

  describe("2. Strategy A Fallback & Configuration Defaults", () => {
    test("returns default shipping rules when database row is missing", async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue(null);
      const res = await getShippingRulesSettings();

      expect(res.settings.enableFreeShipping).toBe(true);
      expect(res.settings.freeShippingThreshold).toBe(2500);
      expect(res.settings.freeShippingScope).toBe("NATIONWIDE");
      expect(res.settings.pickupHubName).toBe("VibeLock Central Fulfillment Hub");
      expect(res.isPersisted).toBe(false);
      expect(res.hasStore).toBe(true);
    });

    test("safely applies Strategy A defaults when table is unmigrated (P2021)", async () => {
      mockPrisma.storeSetting.findUnique.mockRejectedValue({
        code: "P2021",
        message: "The table `StoreSetting` does not exist in the current database.",
      });

      const res = await getShippingRulesSettings();
      expect(res.settings.enableFreeShipping).toBe(true);
      expect(res.isPersisted).toBe(false);
      expect(res.hasStore).toBe(false);
    });
  });

  describe("3. Free Delivery Fee Calculation Engine", () => {
    test("applies free delivery when cart subtotal meets or exceeds nationwide threshold", async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue({
        id: "setting-shipping-1",
        key: "SHIPPING_DELIVERY_RULES",
        value: {
          ...getDefaultShippingRulesSettings(),
          freeShippingThreshold: 2500,
          freeShippingScope: "NATIONWIDE",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await calculateEffectiveShippingFee({
        subtotal: 2800,
        city: "Chittagong",
        standardCost: 120,
      });

      expect(res.isFree).toBe(true);
      expect(res.cost).toBe(0);
      expect(res.discountAmount).toBe(120);
    });

    test("charges standard delivery fee when cart subtotal is below threshold", async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue({
        id: "setting-shipping-1",
        key: "SHIPPING_DELIVERY_RULES",
        value: { ...getDefaultShippingRulesSettings(), freeShippingThreshold: 2500 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await calculateEffectiveShippingFee({
        subtotal: 1800,
        city: "Dhaka",
        standardCost: 60,
      });

      expect(res.isFree).toBe(false);
      expect(res.cost).toBe(60);
      expect(res.discountAmount).toBe(0);
      expect(res.reason).toContain("Add ৳700 more to unlock free shipping!");
    });

    test("restricts free shipping to Dhaka Metro when scope is INSIDE_DHAKA_ONLY", async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue({
        id: "setting-shipping-dhaka",
        key: "SHIPPING_DELIVERY_RULES",
        value: {
          ...getDefaultShippingRulesSettings(),
          freeShippingThreshold: 2500,
          freeShippingScope: "INSIDE_DHAKA_ONLY",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Outside Dhaka order with ৳3,000 subtotal should NOT receive free shipping
      const resOutside = await calculateEffectiveShippingFee({
        subtotal: 3000,
        city: "Sylhet",
        standardCost: 120,
      });
      expect(resOutside.isFree).toBe(false);
      expect(resOutside.cost).toBe(120);

      // Inside Dhaka order with ৳3,000 subtotal DOES receive free shipping
      const resDhaka = await calculateEffectiveShippingFee({
        subtotal: 3000,
        city: "Uttara, Dhaka",
        standardCost: 60,
      });
      expect(resDhaka.isFree).toBe(true);
      expect(resDhaka.cost).toBe(0);
    });

    test("respects disable toggle and never awards free shipping when disabled", async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue({
        id: "setting-shipping-off",
        key: "SHIPPING_DELIVERY_RULES",
        value: { ...getDefaultShippingRulesSettings(), enableFreeShipping: false },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await calculateEffectiveShippingFee({
        subtotal: 15000,
        city: "Dhaka",
        standardCost: 60,
      });

      expect(res.isFree).toBe(false);
      expect(res.cost).toBe(60);
    });
  });

  describe("4. Transactional Persistence & AuditLog Integration", () => {
    test("updates shipping rules atomically inside Prisma transaction with AuditLog entry", async () => {
      const existingSettings = getDefaultShippingRulesSettings();
      mockPrisma.storeSetting.findUnique.mockResolvedValue({
        id: "setting-ship-1",
        key: "SHIPPING_DELIVERY_RULES",
        value: existingSettings,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updatedSettings: ShippingRulesSettings = {
        ...existingSettings,
        freeShippingThreshold: 3000,
        pickupHubName: "VibeLock Gazipur Mega Hub",
        primaryCourier: "PATHAO",
        insideDhakaSla: "12–24 Hours Express",
      };

      const result = await updateShippingRulesSettings(updatedSettings, "admin-user-999");
      expect(result.success).toBe(true);
      expect(result.data?.freeShippingThreshold).toBe(3000);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.storeSetting.upsert).toHaveBeenCalledWith({
        where: { key: "SHIPPING_DELIVERY_RULES" },
        update: {
          value: updatedSettings,
          description: expect.any(String),
          updatedBy: "admin-user-999",
        },
        create: {
          key: "SHIPPING_DELIVERY_RULES",
          value: updatedSettings,
          description: expect.any(String),
          updatedBy: "admin-user-999",
        },
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: "admin-user-999",
          action: "STORE_SETTING_UPDATED",
          entityType: "StoreSetting",
          entityId: "mock-setting-uuid",
          metadata: {
            key: "SHIPPING_DELIVERY_RULES",
            previousState: existingSettings,
            newState: updatedSettings,
          },
        },
      });
    });
  });

  describe("5. Server Action Validation & Form Handling", () => {
    test("validates required fields and rejects threshold below 500", async () => {
      mockSession = {
        user: { id: "admin-1", email: "admin@vibelock.com", role: "ADMIN" },
      };

      const formData = new FormData();
      formData.set("freeShippingThreshold", "200"); // below min 500
      formData.set("pickupHubName", ""); // empty

      const res = await updateShippingRulesAction({ error: null }, formData);
      expect(res.error).toBe("Please correct the invalid shipping configuration fields below.");
      expect(res.fieldErrors?.freeShippingThreshold).toBeDefined();
      expect(res.fieldErrors?.pickupHubName).toBeDefined();
    });

    test("successfully processes valid form data and updates shipping rules", async () => {
      mockSession = {
        user: { id: "admin-1", email: "admin@vibelock.com", role: "ADMIN" },
      };

      const formData = new FormData();
      formData.set("enableFreeShipping", "true");
      formData.set("freeShippingThreshold", "3500");
      formData.set("freeShippingScope", "NATIONWIDE");
      formData.set("freeShippingBannerText", "Free nationwide delivery on orders over ৳3,500!");
      formData.set("pickupHubName", "VibeLock Central Hub");
      formData.set("pickupAddress", "Sector 3, Uttara, Dhaka");
      formData.set("contactPerson", "Logistics Head");
      formData.set("contactPhone", "8801311333277");
      formData.set("insideDhakaSla", "24–48 Hours");
      formData.set("outsideDhakaSla", "3–5 Days");
      formData.set("expressDhakaSla", "Same-Day Express");
      formData.set("primaryCourier", "STEADFAST");
      formData.set("autoCreateConsignment", "false");

      const res = await updateShippingRulesAction({ error: null }, formData);
      expect(res.error).toBeNull();
      expect(res.message).toContain(
        "Free shipping rules, courier dispatch hub, and delivery SLA promises updated"
      );
    });
  });
});
