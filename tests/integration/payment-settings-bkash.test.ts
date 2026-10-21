import { describe, test, expect, beforeEach, vi } from "vitest";
import { z } from "zod";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
    AUTH_SECRET: "mock-secret-for-testing-at-least-32-chars-long",
    SSLCOMMERZ_STORE_ID: "vibelock_ssl_store",
    SSLCOMMERZ_STORE_PASSWORD: "vibelock_ssl_passwd",
    SSLCOMMERZ_SANDBOX: true,
    BKASH_APP_KEY: "mock_bkash_app_key",
    BKASH_APP_SECRET: "mock_bkash_app_secret",
    BKASH_USERNAME: "mock_bkash_username",
    BKASH_PASSWORD: "mock_bkash_password",
    BKASH_SANDBOX: true,
  },
}));

vi.mock("@/lib/config/env", () => ({
  env: mockEnv,
}));

const { mockPrisma } = vi.hoisted(() => {
  const paymentMethodSetting = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
  };
  const auditLog = {
    create: vi.fn(),
  };
  const mockPrisma = {
    paymentMethodSetting,
    auditLog,
    $transaction: vi.fn(),
  };
  return { mockPrisma };
});

vi.mock("@/lib/prisma/client", () => ({
  default: mockPrisma,
}));

let mockSession: unknown = null;

vi.mock("../../src/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  usePathname: vi.fn(() => "/admin/settings/payments"),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  getPaymentSettingsOverview,
  isPaymentMethodEnabled,
  getStorefrontPaymentMethods,
  updatePaymentMethodSetting,
  isBkashCredentialConfigured,
} from "../../src/lib/settings/payment-settings";
import { togglePaymentMethodAction } from "../../src/lib/admin/payment-settings-actions";

describe("VibeLock Phase 2C — Admin Payment Settings & bKash Credential Gating", () => {
  beforeEach(() => {
    mockSession = { user: { id: "admin-1", role: "ADMIN" } };
    mockEnv.SSLCOMMERZ_STORE_ID = "vibelock_ssl_store";
    mockEnv.SSLCOMMERZ_STORE_PASSWORD = "vibelock_ssl_passwd";
    mockEnv.SSLCOMMERZ_SANDBOX = true;
    mockEnv.BKASH_APP_KEY = "mock_bkash_app_key";
    mockEnv.BKASH_APP_SECRET = "mock_bkash_app_secret";
    mockEnv.BKASH_USERNAME = "mock_bkash_username";
    mockEnv.BKASH_PASSWORD = "mock_bkash_password";
    mockEnv.BKASH_SANDBOX = true;
    vi.clearAllMocks();

    mockPrisma.paymentMethodSetting.findUnique.mockResolvedValue(null);
    mockPrisma.paymentMethodSetting.findMany.mockResolvedValue([]);
    mockPrisma.paymentMethodSetting.upsert.mockImplementation(
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

  describe("1. Server-Side Credential Readiness (isBkashCredentialConfigured)", () => {
    test("returns true when all 4 required credentials are provided", () => {
      expect(isBkashCredentialConfigured()).toBe(true);
    });

    test("returns false when BKASH_APP_KEY is missing or empty/whitespace", () => {
      mockEnv.BKASH_APP_KEY = "";
      expect(isBkashCredentialConfigured()).toBe(false);
      mockEnv.BKASH_APP_KEY = "   ";
      expect(isBkashCredentialConfigured()).toBe(false);
      mockEnv.BKASH_APP_KEY = undefined as unknown as string;
      expect(isBkashCredentialConfigured()).toBe(false);
    });

    test("returns false when BKASH_APP_SECRET is missing or empty/whitespace", () => {
      mockEnv.BKASH_APP_SECRET = "";
      expect(isBkashCredentialConfigured()).toBe(false);
      mockEnv.BKASH_APP_SECRET = "   ";
      expect(isBkashCredentialConfigured()).toBe(false);
      mockEnv.BKASH_APP_SECRET = undefined as unknown as string;
      expect(isBkashCredentialConfigured()).toBe(false);
    });

    test("returns false when BKASH_USERNAME is missing or empty/whitespace", () => {
      mockEnv.BKASH_USERNAME = "";
      expect(isBkashCredentialConfigured()).toBe(false);
      mockEnv.BKASH_USERNAME = "   ";
      expect(isBkashCredentialConfigured()).toBe(false);
      mockEnv.BKASH_USERNAME = undefined as unknown as string;
      expect(isBkashCredentialConfigured()).toBe(false);
    });

    test("returns false when BKASH_PASSWORD is missing or empty/whitespace", () => {
      mockEnv.BKASH_PASSWORD = "";
      expect(isBkashCredentialConfigured()).toBe(false);
      mockEnv.BKASH_PASSWORD = "   ";
      expect(isBkashCredentialConfigured()).toBe(false);
      mockEnv.BKASH_PASSWORD = undefined as unknown as string;
      expect(isBkashCredentialConfigured()).toBe(false);
    });
  });

  describe("2. Admin Settings Persistence & Credential Gating (updatePaymentMethodSetting)", () => {
    test("enables bKash when all credentials exist and creates an AuditLog record", async () => {
      mockPrisma.paymentMethodSetting.findUnique.mockResolvedValue({
        id: "bkash-id",
        code: "BKASH",
        name: "Direct bKash Checkout",
        isEnabled: false,
      });

      const result = await updatePaymentMethodSetting("BKASH", true, "admin-123");
      expect(result.success).toBe(true);

      expect(mockPrisma.paymentMethodSetting.upsert).toHaveBeenCalledWith({
        where: { code: "BKASH" },
        update: { isEnabled: true },
        create: {
          code: "BKASH",
          name: "Direct bKash Checkout",
          isEnabled: true,
        },
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: "admin-123",
          action: "PAYMENT_METHOD_SETTING_UPDATED",
          entityType: "PaymentMethodSetting",
          entityId: "mock-setting-uuid",
          metadata: {
            code: "BKASH",
            previousState: false,
            newState: true,
          },
        },
      });
    });

    test("rejects enabling bKash when any required credential is missing", async () => {
      mockEnv.BKASH_APP_SECRET = "";

      const result = await updatePaymentMethodSetting("BKASH", true, "admin-123");
      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Cannot enable bKash without configured credentials in environment."
      );

      // Ensure transaction and upsert were not called
      expect(mockPrisma.paymentMethodSetting.upsert).not.toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });

    test("allows disabling bKash even if credentials are missing", async () => {
      // Credentials removed after enablement
      mockEnv.BKASH_APP_KEY = "";
      mockEnv.BKASH_APP_SECRET = "";

      mockPrisma.paymentMethodSetting.findUnique.mockResolvedValue({
        id: "bkash-id",
        code: "BKASH",
        name: "Direct bKash Checkout",
        isEnabled: true,
      });

      const result = await updatePaymentMethodSetting("BKASH", false, "admin-123");
      expect(result.success).toBe(true);

      expect(mockPrisma.paymentMethodSetting.upsert).toHaveBeenCalledWith({
        where: { code: "BKASH" },
        update: { isEnabled: false },
        create: {
          code: "BKASH",
          name: "Direct bKash Checkout",
          isEnabled: false,
        },
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: "admin-123",
          action: "PAYMENT_METHOD_SETTING_UPDATED",
          entityType: "PaymentMethodSetting",
          entityId: "mock-setting-uuid",
          metadata: {
            code: "BKASH",
            previousState: true,
            newState: false,
          },
        },
      });
    });
  });

  describe("3. Fail-Closed Runtime Enforcement (isPaymentMethodEnabled)", () => {
    test("returns false when bKash has no database row (Strategy A default disabled)", async () => {
      mockPrisma.paymentMethodSetting.findUnique.mockResolvedValue(null);

      const isEnabled = await isPaymentMethodEnabled("BKASH");
      expect(isEnabled).toBe(false);
    });

    test("returns false when bKash database row is isEnabled: false", async () => {
      mockPrisma.paymentMethodSetting.findUnique.mockResolvedValue({
        id: "bkash-id",
        code: "BKASH",
        name: "Direct bKash Checkout",
        isEnabled: false,
      });

      const isEnabled = await isPaymentMethodEnabled("BKASH");
      expect(isEnabled).toBe(false);
    });

    test("returns true when bKash is enabled in database and all credentials exist", async () => {
      mockPrisma.paymentMethodSetting.findUnique.mockResolvedValue({
        id: "bkash-id",
        code: "BKASH",
        name: "Direct bKash Checkout",
        isEnabled: true,
      });

      const isEnabled = await isPaymentMethodEnabled("BKASH");
      expect(isEnabled).toBe(true);
    });

    test("fails closed: returns false when bKash is enabled in database but credentials are missing", async () => {
      mockPrisma.paymentMethodSetting.findUnique.mockResolvedValue({
        id: "bkash-id",
        code: "BKASH",
        name: "Direct bKash Checkout",
        isEnabled: true,
      });

      mockEnv.BKASH_PASSWORD = "";

      const isEnabled = await isPaymentMethodEnabled("BKASH");
      expect(isEnabled).toBe(false);
    });

    test("getStorefrontPaymentMethods includes bKash when enabled and credentials exist", async () => {
      mockPrisma.paymentMethodSetting.findUnique.mockImplementation(
        async ({ where }: { where: { code: string } }) => {
          if (where.code === "BKASH") {
            return {
              id: "bkash-id",
              code: "BKASH",
              name: "Direct bKash Checkout",
              isEnabled: true,
            };
          }
          return null;
        }
      );

      const options = await getStorefrontPaymentMethods();
      const bkashOption = options.find((o) => o.value === "BKASH");
      expect(bkashOption).toBeDefined();
      expect(bkashOption?.title).toBe("bKash");
      expect(bkashOption?.detail).toBe("Pay directly with your bKash wallet.");
    });

    test("getStorefrontPaymentMethods excludes bKash when disabled or credentials missing", async () => {
      mockPrisma.paymentMethodSetting.findUnique.mockImplementation(
        async ({ where }: { where: { code: string } }) => {
          if (where.code === "BKASH") {
            return {
              id: "bkash-id",
              code: "BKASH",
              name: "Direct bKash Checkout",
              isEnabled: false,
            };
          }
          return null;
        }
      );

      let options = await getStorefrontPaymentMethods();
      expect(options.some((o) => o.value === "BKASH")).toBe(false);

      // Now enable it in DB but wipe a credential
      mockPrisma.paymentMethodSetting.findUnique.mockImplementation(
        async ({ where }: { where: { code: string } }) => {
          if (where.code === "BKASH") {
            return {
              id: "bkash-id",
              code: "BKASH",
              name: "Direct bKash Checkout",
              isEnabled: true,
            };
          }
          return null;
        }
      );
      mockEnv.BKASH_APP_SECRET = "";

      options = await getStorefrontPaymentMethods();
      expect(options.some((o) => o.value === "BKASH")).toBe(false);
    });
  });

  describe("4. Payment Settings Overview & Zero Credential Exposure", () => {
    test("reports CREDENTIALS MISSING and unconfigured when credentials are absent", async () => {
      mockEnv.BKASH_APP_KEY = "";

      const overview = await getPaymentSettingsOverview();
      const bkashMethod = overview.methods.find((m) => m.code === "BKASH")!;

      expect(bkashMethod.isConfigured).toBe(false);
      expect(bkashMethod.isEnabled).toBe(false);
      expect(bkashMethod.environmentMode).toBe("unconfigured");
    });

    test("reports sandbox environmentMode when BKASH_SANDBOX is true", async () => {
      mockEnv.BKASH_SANDBOX = true;

      const overview = await getPaymentSettingsOverview();
      const bkashMethod = overview.methods.find((m) => m.code === "BKASH")!;

      expect(bkashMethod.isConfigured).toBe(true);
      expect(bkashMethod.environmentMode).toBe("sandbox");
    });

    test("reports production environmentMode when BKASH_SANDBOX is false", async () => {
      mockEnv.BKASH_SANDBOX = false;

      const overview = await getPaymentSettingsOverview();
      const bkashMethod = overview.methods.find((m) => m.code === "BKASH")!;

      expect(bkashMethod.isConfigured).toBe(true);
      expect(bkashMethod.environmentMode).toBe("production");
    });

    test("never exposes secret values in overview object or serialized JSON", async () => {
      const overview = await getPaymentSettingsOverview();
      const serialized = JSON.stringify(overview);

      expect(serialized).not.toContain("mock_bkash_app_key");
      expect(serialized).not.toContain("mock_bkash_app_secret");
      expect(serialized).not.toContain("mock_bkash_username");
      expect(serialized).not.toContain("mock_bkash_password");
    });
  });

  describe("5. Storefront Activation (Phase 2D)", () => {
    test("exposes BKASH in getStorefrontPaymentMethods when bKash is enabled in database and credentials exist", async () => {
      mockPrisma.paymentMethodSetting.findUnique.mockImplementation(async ({ where }) => {
        if (where.code === "BKASH") {
          return { id: "bkash-id", code: "BKASH", name: "Direct bKash", isEnabled: true };
        }
        if (where.code === "COD") {
          return { id: "cod-id", code: "COD", name: "Cash on Delivery", isEnabled: true };
        }
        return null;
      });

      const options = await getStorefrontPaymentMethods();
      const codes = options.map((o) => o.value);

      expect(codes).toContain("COD");
      expect(codes).toContain("BKASH");
    });

    test("does not expose BKASH in getStorefrontPaymentMethods when bKash is disabled in database", async () => {
      mockPrisma.paymentMethodSetting.findUnique.mockImplementation(async ({ where }) => {
        if (where.code === "BKASH") {
          return { id: "bkash-id", code: "BKASH", name: "Direct bKash", isEnabled: false };
        }
        if (where.code === "COD") {
          return { id: "cod-id", code: "COD", name: "Cash on Delivery", isEnabled: true };
        }
        return null;
      });

      const options = await getStorefrontPaymentMethods();
      const codes = options.map((o) => o.value);

      expect(codes).toContain("COD");
      expect(codes).not.toContain("BKASH");
    });
  });

  describe("6. Admin Server Action (togglePaymentMethodAction)", () => {
    test("allows an ADMIN to toggle BKASH enabled state", async () => {
      const formData = new FormData();
      formData.append("code", "BKASH");
      formData.append("enabled", "true");

      const result = await togglePaymentMethodAction({ error: null }, formData);
      expect(result.error).toBeNull();
      expect(result.message).toContain("Payment method BKASH is now enabled.");
    });

    test("fails toggle action when required credentials are missing", async () => {
      mockEnv.BKASH_USERNAME = "";

      const formData = new FormData();
      formData.append("code", "BKASH");
      formData.append("enabled", "true");

      const result = await togglePaymentMethodAction({ error: null }, formData);
      expect(result.error).toContain(
        "Cannot enable bKash without configured credentials in environment."
      );
    });

    test("allows an ADMIN to toggle BKASH to disabled state even when credentials are missing", async () => {
      mockEnv.BKASH_USERNAME = "";

      const formData = new FormData();
      formData.append("code", "BKASH");
      formData.append("enabled", "false");

      const result = await togglePaymentMethodAction({ error: null }, formData);
      expect(result.error).toBeNull();
      expect(result.message).toContain("Payment method BKASH is now disabled.");
    });
  });

  describe("7. Sandbox Environment Variable Boolean Parsing", () => {
    const booleanStringSchema = z.preprocess((val) => {
      if (typeof val === "string") {
        const trimmed = val.trim().toLowerCase();
        if (trimmed === "false" || trimmed === "0" || trimmed === "no") return false;
        if (trimmed === "true" || trimmed === "1" || trimmed === "yes") return true;
        if (trimmed === "") return undefined;
      }
      if (typeof val === "boolean") return val;
      return undefined;
    }, z.boolean().default(true));

    test("correctly parses boolean and string representations", () => {
      expect(booleanStringSchema.parse("false")).toBe(false);
      expect(booleanStringSchema.parse("FALSE")).toBe(false);
      expect(booleanStringSchema.parse("0")).toBe(false);
      expect(booleanStringSchema.parse("no")).toBe(false);
      expect(booleanStringSchema.parse(false)).toBe(false);

      expect(booleanStringSchema.parse("true")).toBe(true);
      expect(booleanStringSchema.parse("TRUE")).toBe(true);
      expect(booleanStringSchema.parse("1")).toBe(true);
      expect(booleanStringSchema.parse("yes")).toBe(true);
      expect(booleanStringSchema.parse(true)).toBe(true);

      expect(booleanStringSchema.parse(undefined)).toBe(true);
      expect(booleanStringSchema.parse("")).toBe(true);
      expect(booleanStringSchema.parse("   ")).toBe(true);
    });
  });
});
