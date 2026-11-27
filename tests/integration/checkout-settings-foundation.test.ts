import { describe, test, expect, beforeEach, vi } from "vitest";

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
    INVENTORY_RESERVATION_TTL_SECONDS: 900,
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
  usePathname: vi.fn(() => "/admin/settings/checkout"),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

import {
  getCheckoutSettings,
  updateCheckoutSettings,
  getDefaultCheckoutSettings,
  validateOrderCheckoutPolicies,
  getEffectiveReservationTtlSeconds,
  type CheckoutSettings,
} from "../../src/lib/settings/checkout-settings";
import { updateCheckoutSettingsAction } from "../../src/lib/admin/settings/checkout-settings-actions";
import AdminCheckoutSettingsPage from "../../src/app/(protected)/admin/settings/checkout/page";
import AdminSettingsLayout from "../../src/app/(protected)/admin/settings/layout";

describe("Phase 2: VibeLock Checkout Policies & COD Risk Governance", () => {
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
      await expect(AdminCheckoutSettingsPage()).rejects.toThrow("NEXT_REDIRECT:/login");
    });

    test("redirects non-admin (CUSTOMER/STAFF) users to /unauthorized", async () => {
      mockSession = { user: { id: "cust-1", role: "CUSTOMER" } };
      await expect(AdminSettingsLayout({ children: null })).rejects.toThrow(
        "NEXT_REDIRECT:/unauthorized"
      );
      await expect(AdminCheckoutSettingsPage()).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });

    test("allows ADMIN role users to access layout and checkout settings page", async () => {
      mockSession = {
        user: { id: "admin-1", email: "admin@vibelock.com", role: "ADMIN" },
      };

      const layoutResult = await AdminSettingsLayout({ children: "content" });
      expect(layoutResult).toBeDefined();

      const pageResult = await AdminCheckoutSettingsPage();
      expect(pageResult).toBeDefined();
    });

    test("rejects server action invocation from non-admin users", async () => {
      mockSession = { user: { id: "cust-1", role: "CUSTOMER" } };
      const formData = new FormData();
      formData.set("maxCodOrderValue", "5000");

      await expect(updateCheckoutSettingsAction({ error: null }, formData)).rejects.toThrow();
    });
  });

  describe("2. Strategy A Fallback & Policy Defaults", () => {
    test("returns default checkout settings when database row is missing", async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue(null);
      const res = await getCheckoutSettings();

      expect(res.settings.maxCodOrderValue).toBe(10000);
      expect(res.settings.minOrderValue).toBe(0);
      expect(res.settings.onlineReservationTtlMinutes).toBe(15);
      expect(res.settings.codAdvanceCollectionMode).toBe("MANUAL_VERIFICATION");
      expect(res.settings.codAdvancePaymentNumber).toBe("01311333277");
      expect(res.isPersisted).toBe(false);
      expect(res.hasStore).toBe(true);
    });

    test("safely applies Strategy A defaults when table is unmigrated (P2021)", async () => {
      mockPrisma.storeSetting.findUnique.mockRejectedValue({
        code: "P2021",
        message: "The table `StoreSetting` does not exist in the current database.",
      });

      const res = await getCheckoutSettings();
      expect(res.settings.maxCodOrderValue).toBe(10000);
      expect(res.isPersisted).toBe(false);
      expect(res.hasStore).toBe(false);
    });

    test("calculates effective reservation TTL in seconds accurately", async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue({
        id: "setting-ttl",
        key: "CHECKOUT_COD_POLICY",
        value: { ...getDefaultCheckoutSettings(), onlineReservationTtlMinutes: 20 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const ttlSeconds = await getEffectiveReservationTtlSeconds();
      expect(ttlSeconds).toBe(1200); // 20 * 60
    });
  });

  describe("3. Authoritative Checkout Policy Validation", () => {
    test("blocks COD orders exceeding maximum COD order ceiling", async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue({
        id: "setting-cod-cap",
        key: "CHECKOUT_COD_POLICY",
        value: { ...getDefaultCheckoutSettings(), maxCodOrderValue: 8000 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const check = await validateOrderCheckoutPolicies({
        total: 10500,
        paymentMethod: "COD",
      });

      expect(check.valid).toBe(false);
      expect(check.error).toContain("Cash on Delivery is limited to ৳8,000");
    });

    test("allows COD orders within maximum COD order ceiling", async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue({
        id: "setting-cod-cap",
        key: "CHECKOUT_COD_POLICY",
        value: { ...getDefaultCheckoutSettings(), maxCodOrderValue: 8000 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const check = await validateOrderCheckoutPolicies({
        total: 5400,
        paymentMethod: "COD",
      });

      expect(check.valid).toBe(true);
    });

    test("allows high-value orders when customer selects bKash or Online Payment", async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue({
        id: "setting-cod-cap",
        key: "CHECKOUT_COD_POLICY",
        value: { ...getDefaultCheckoutSettings(), maxCodOrderValue: 8000 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const checkBkash = await validateOrderCheckoutPolicies({
        total: 25000,
        paymentMethod: "BKASH",
      });
      expect(checkBkash.valid).toBe(true);

      const checkPaystation = await validateOrderCheckoutPolicies({
        total: 25000,
        paymentMethod: "PAYSTATION",
      });
      expect(checkPaystation.valid).toBe(true);
    });

    test("enforces minimum order value when configured", async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue({
        id: "setting-min-order",
        key: "CHECKOUT_COD_POLICY",
        value: { ...getDefaultCheckoutSettings(), minOrderValue: 500 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const checkSmall = await validateOrderCheckoutPolicies({
        total: 350,
        paymentMethod: "COD",
      });
      expect(checkSmall.valid).toBe(false);
      expect(checkSmall.error).toContain("Minimum order value for checkout is ৳500");

      const checkValid = await validateOrderCheckoutPolicies({
        total: 750,
        paymentMethod: "COD",
      });
      expect(checkValid.valid).toBe(true);
    });
  });

  describe("4. Transactional Persistence & AuditLog Integration", () => {
    test("updates checkout policies atomically inside Prisma transaction with AuditLog entry", async () => {
      const existingSettings = getDefaultCheckoutSettings();
      mockPrisma.storeSetting.findUnique.mockResolvedValue({
        id: "setting-checkout-1",
        key: "CHECKOUT_COD_POLICY",
        value: existingSettings,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updatedSettings: CheckoutSettings = {
        ...existingSettings,
        maxCodOrderValue: 12000,
        requireCodAdvanceDeliveryCharge: true,
        codAdvanceInsideDhaka: 120,
        codAdvanceOutsideDhaka: 180,
        codAdvanceCollectionMode: "AUTOMATED_GATEWAY",
        codAdvancePaymentNumber: "01711223344",
        codAdvanceInstructions: "Pay advance online via bKash.",
        onlineReservationTtlMinutes: 10,
      };

      const result = await updateCheckoutSettings(updatedSettings, "admin-user-888");
      expect(result.success).toBe(true);
      expect(result.data?.maxCodOrderValue).toBe(12000);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.storeSetting.upsert).toHaveBeenCalledWith({
        where: { key: "CHECKOUT_COD_POLICY" },
        update: {
          value: updatedSettings,
          description: expect.any(String),
          updatedBy: "admin-user-888",
        },
        create: {
          key: "CHECKOUT_COD_POLICY",
          value: updatedSettings,
          description: expect.any(String),
          updatedBy: "admin-user-888",
        },
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: "admin-user-888",
          action: "STORE_SETTING_UPDATED",
          entityType: "StoreSetting",
          entityId: "mock-setting-uuid",
          metadata: {
            key: "CHECKOUT_COD_POLICY",
            previousState: existingSettings,
            newState: updatedSettings,
          },
        },
      });
    });
  });

  describe("5. Server Action Validation & Form Handling", () => {
    test("validates required fields and rejects invalid numeric limits", async () => {
      mockSession = {
        user: { id: "admin-1", email: "admin@vibelock.com", role: "ADMIN" },
      };

      const formData = new FormData();
      formData.set("maxCodOrderValue", "100"); // less than min 500
      formData.set("onlineReservationTtlMinutes", "2"); // less than min 5

      const res = await updateCheckoutSettingsAction({ error: null }, formData);
      expect(res.error).toBe("Please correct the invalid checkout policy fields below.");
      expect(res.fieldErrors?.maxCodOrderValue).toBeDefined();
      expect(res.fieldErrors?.onlineReservationTtlMinutes).toBeDefined();
    });

    test("successfully processes valid form data and updates checkout policies", async () => {
      mockSession = {
        user: { id: "admin-1", email: "admin@vibelock.com", role: "ADMIN" },
      };

      const formData = new FormData();
      formData.set("minOrderValue", "300");
      formData.set("maxCodOrderValue", "15000");
      formData.set("requireCodAdvanceDeliveryCharge", "true");
      formData.set("codAdvanceInsideDhaka", "100");
      formData.set("codAdvanceOutsideDhaka", "150");
      formData.set("onlineReservationTtlMinutes", "15");
      formData.set("enforceFirstTimeCodOtp", "true");
      formData.set("allowGuestCheckout", "true");
      formData.set("codOrderNotice", "Telephonic verification required.");

      const res = await updateCheckoutSettingsAction({ error: null }, formData);
      expect(res.error).toBeNull();
      expect(res.message).toContain("Checkout policies, COD fraud ceilings, and inventory reservation TTL updated");
    });
  });
});
