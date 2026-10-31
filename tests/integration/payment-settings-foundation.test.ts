import { describe, test, expect, beforeEach, vi } from "vitest";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
    AUTH_SECRET: "mock-secret-for-testing-at-least-32-chars-long",
    SSLCOMMERZ_STORE_ID: "vibelock_ssl_store",
    SSLCOMMERZ_STORE_PASSWORD: "vibelock_ssl_passwd",
    SSLCOMMERZ_SANDBOX: true,
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
  type PaymentMethodCode,
} from "../../src/lib/settings/payment-settings";
import { togglePaymentMethodAction } from "../../src/lib/admin/payments";
import AdminPaymentSettingsPage from "../../src/app/(protected)/admin/settings/payments/page";
import AdminSettingsLayout from "../../src/app/(protected)/admin/settings/layout";

describe("VibeLock Phase 2B — Database-Backed Payment Settings & Bootstrap Validation", () => {
  beforeEach(() => {
    mockSession = null;
    mockEnv.SSLCOMMERZ_STORE_ID = "vibelock_ssl_store";
    mockEnv.SSLCOMMERZ_STORE_PASSWORD = "vibelock_ssl_passwd";
    vi.clearAllMocks();

    // Default mock behavior: database table exists and queries return empty/null (missing rows)
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

  describe("1. Admin Authorization Guards", () => {
    test("redirects unauthenticated users to /login", async () => {
      mockSession = null;

      await expect(AdminSettingsLayout({ children: null })).rejects.toThrow("NEXT_REDIRECT:/login");

      await expect(AdminPaymentSettingsPage()).rejects.toThrow("NEXT_REDIRECT:/login");
    });

    test("redirects non-admin (CUSTOMER) users to /unauthorized", async () => {
      mockSession = { user: { id: "cust-1", role: "CUSTOMER" } };

      await expect(AdminSettingsLayout({ children: null })).rejects.toThrow(
        "NEXT_REDIRECT:/unauthorized"
      );

      await expect(AdminPaymentSettingsPage()).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });

    test("redirects STAFF or MANAGER users without ADMIN role to /unauthorized", async () => {
      mockSession = { user: { id: "staff-1", role: "STAFF" } };

      await expect(AdminPaymentSettingsPage()).rejects.toThrow("NEXT_REDIRECT:/unauthorized");

      mockSession = { user: { id: "mgr-1", role: "MANAGER" } };

      await expect(AdminPaymentSettingsPage()).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });

    test("allows ADMIN role users to access the layout and page", async () => {
      mockSession = {
        user: { id: "admin-1", email: "admin@vibelock.com", role: "ADMIN" },
      };

      const layoutResult = await AdminSettingsLayout({ children: "content" });
      expect(layoutResult).toBeDefined();

      const pageResult = await AdminPaymentSettingsPage();
      expect(pageResult).toBeDefined();
    });

    test("rejects toggle action invocation from non-admin users", async () => {
      mockSession = { user: { id: "cust-1", role: "CUSTOMER" } };
      const formData = new FormData();
      formData.set("code", "COD");
      formData.set("enabled", "false");

      await expect(togglePaymentMethodAction({ error: null }, formData)).rejects.toThrow();
    });
  });

  describe("2. Strategy A Bootstrap Invariants (When DB Rows Are Missing)", () => {
    test("COD defaults to enabled when database row is missing", async () => {
      mockPrisma.paymentMethodSetting.findUnique.mockResolvedValue(null);
      const enabled = await isPaymentMethodEnabled("COD");
      expect(enabled).toBe(true);
    });

    test("SSLCOMMERZ defaults to enabled ONLY when store credentials are configured", async () => {
      // With credentials
      mockEnv.SSLCOMMERZ_STORE_ID = "test_store";
      mockEnv.SSLCOMMERZ_STORE_PASSWORD = "test_passwd";
      mockPrisma.paymentMethodSetting.findUnique.mockResolvedValue(null);
      const enabledWithKeys = await isPaymentMethodEnabled("ONLINE");
      expect(enabledWithKeys).toBe(true);

      // Without credentials
      mockEnv.SSLCOMMERZ_STORE_ID = "";
      mockEnv.SSLCOMMERZ_STORE_PASSWORD = "";
      const enabledWithoutKeys = await isPaymentMethodEnabled("ONLINE");
      expect(enabledWithoutKeys).toBe(false);
    });

    test("BKASH and NAGAD default to disabled when database row is missing", async () => {
      mockPrisma.paymentMethodSetting.findUnique.mockResolvedValue(null);
      const bkashEnabled = await isPaymentMethodEnabled("BKASH");
      expect(bkashEnabled).toBe(false);

      const nagadEnabled = await isPaymentMethodEnabled("NAGAD");
      expect(nagadEnabled).toBe(false);
    });

    test("unknown or arbitrary payment method codes default to disabled", async () => {
      expect(await isPaymentMethodEnabled("CRYPTO")).toBe(false);
      expect(await isPaymentMethodEnabled("UNKNOWN_PAY")).toBe(false);
      expect(await isPaymentMethodEnabled("")).toBe(false);
    });
  });

  describe("3. Error Differentiation: Missing Row vs Database Failure", () => {
    test("applies safe bootstrap defaults when table is unmigrated (P2021 / 42P01)", async () => {
      mockPrisma.paymentMethodSetting.findUnique.mockRejectedValue({
        code: "P2021",
        message: "The table `PaymentMethodSetting` does not exist in the current database.",
      });

      const codEnabled = await isPaymentMethodEnabled("COD");
      expect(codEnabled).toBe(true);
    });

    test("fails closed and throws when database experiences a real connectivity failure", async () => {
      mockPrisma.paymentMethodSetting.findUnique.mockRejectedValue(
        new Error("Connection terminated unexpectedly by database server")
      );

      await expect(isPaymentMethodEnabled("COD")).rejects.toThrow(
        "Database error while checking payment configuration for COD"
      );
    });

    test("fails closed and throws when database experiences a query timeout", async () => {
      mockPrisma.paymentMethodSetting.findUnique.mockRejectedValue(
        new Error("Query timed out after 5000ms")
      );

      await expect(isPaymentMethodEnabled("ONLINE")).rejects.toThrow(
        "Database error while checking payment configuration for ONLINE"
      );
    });

    test("getPaymentSettingsOverview propagates database failures instead of masking them", async () => {
      mockPrisma.paymentMethodSetting.findMany.mockRejectedValue(
        new Error("PrismaClientInitializationError: Can't reach database server at neon.tech")
      );

      await expect(getPaymentSettingsOverview()).rejects.toThrow(
        "Database error while loading payment settings"
      );
    });
  });

  describe("4. Database Delegate Persistence & Credential Gating", () => {
    test("respects database row when present in PaymentMethodSetting (disabled)", async () => {
      mockPrisma.paymentMethodSetting.findUnique.mockResolvedValue({
        id: "cod-row-id",
        code: "COD",
        name: "Cash on Delivery",
        isEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const codStatus = await isPaymentMethodEnabled("COD");
      expect(codStatus).toBe(false);
    });

    test("respects database row when present in PaymentMethodSetting (enabled)", async () => {
      mockPrisma.paymentMethodSetting.findUnique.mockResolvedValue({
        id: "cod-row-id",
        code: "COD",
        name: "Cash on Delivery",
        isEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const codStatus = await isPaymentMethodEnabled("COD");
      expect(codStatus).toBe(true);
    });

    test("enforces credential gating: cannot enable SSLCOMMERZ in DB if credentials missing in environment", async () => {
      mockEnv.SSLCOMMERZ_STORE_ID = "";
      mockEnv.SSLCOMMERZ_STORE_PASSWORD = "";

      const result = await updatePaymentMethodSetting("SSLCOMMERZ", true, "admin-1");
      expect(result.success).toBe(false);
      expect(result.error).toContain(
        "Cannot enable SSLCOMMERZ without configured store credentials"
      );
    });

    test("enforces credential gating: isPaymentMethodEnabled returns false for SSLCOMMERZ even if DB row is true", async () => {
      mockEnv.SSLCOMMERZ_STORE_ID = "";
      mockEnv.SSLCOMMERZ_STORE_PASSWORD = "";
      mockPrisma.paymentMethodSetting.findUnique.mockResolvedValue({
        id: "ssl-row-id",
        code: "SSLCOMMERZ",
        name: "SSLCOMMERZ Gateway",
        isEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const sslStatus = await isPaymentMethodEnabled("ONLINE");
      expect(sslStatus).toBe(false);
    });

    test("rejects modifying unapproved providers like ROCKET", async () => {
      const rocketResult = await updatePaymentMethodSetting(
        "ROCKET" as unknown as PaymentMethodCode,
        true,
        "admin-1"
      );
      expect(rocketResult.success).toBe(false);
      expect(rocketResult.error).toContain("cannot be toggled at this stage");
    });
  });

  describe("5. AuditLog Transaction Execution", () => {
    test("updatePaymentMethodSetting executes atomic transaction with AuditLog create", async () => {
      mockPrisma.paymentMethodSetting.findUnique.mockResolvedValue({
        id: "cod-row-id",
        code: "COD",
        name: "Cash on Delivery",
        isEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await updatePaymentMethodSetting("COD", false, "admin-user-123");
      expect(result.success).toBe(true);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.paymentMethodSetting.upsert).toHaveBeenCalledWith({
        where: { code: "COD" },
        update: { isEnabled: false },
        create: {
          code: "COD",
          name: "Cash on Delivery",
          isEnabled: false,
        },
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: "admin-user-123",
          action: "PAYMENT_METHOD_SETTING_UPDATED",
          entityType: "PaymentMethodSetting",
          entityId: "mock-setting-uuid",
          metadata: {
            code: "COD",
            previousState: true,
            newState: false,
          },
        },
      });
    });
  });

  describe("6. Storefront Payment Methods Dynamic Visibility", () => {
    test("returns COD and ONLINE when both are active", async () => {
      mockEnv.SSLCOMMERZ_STORE_ID = "valid_store";
      mockEnv.SSLCOMMERZ_STORE_PASSWORD = "valid_passwd";
      mockPrisma.paymentMethodSetting.findUnique.mockResolvedValue(null);

      const options = await getStorefrontPaymentMethods();
      const values = options.map((o) => o.value);

      expect(values).toContain("COD");
      expect(values).toContain("ONLINE");
    });

    test("omits ONLINE when SSLCOMMERZ credentials are missing", async () => {
      mockEnv.SSLCOMMERZ_STORE_ID = "";
      mockEnv.SSLCOMMERZ_STORE_PASSWORD = "";
      mockPrisma.paymentMethodSetting.findUnique.mockResolvedValue(null);

      const options = await getStorefrontPaymentMethods();
      const values = options.map((o) => o.value);

      expect(values).toContain("COD");
      expect(values).not.toContain("ONLINE");
    });
  });

  describe("7. Security Containment & Data Exposure", () => {
    test("never leaks credentials in payment settings overview", async () => {
      mockPrisma.paymentMethodSetting.findMany.mockResolvedValue([]);
      const overview = await getPaymentSettingsOverview();
      const stringified = JSON.stringify(overview);

      expect(stringified).not.toContain("vibelock_ssl_passwd");
      expect(stringified).not.toContain("storePassword");
      expect(stringified).not.toContain("store_passwd");
      expect(stringified).not.toContain("SSLCOMMERZ_STORE_PASSWORD");
      expect(stringified).not.toContain("appSecret");
      expect(stringified).not.toContain("BKASH_APP_SECRET");
    });
  });
});
