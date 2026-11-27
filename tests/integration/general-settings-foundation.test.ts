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
  usePathname: vi.fn(() => "/admin/settings/general"),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

import {
  getGeneralStoreSettings,
  updateGeneralStoreSettings,
  getDefaultGeneralStoreSettings,
  STORE_SETTING_KEYS,
  type GeneralStoreSettings,
} from "../../src/lib/settings/store-settings-service";
import { updateGeneralSettingsAction } from "../../src/lib/admin/settings/general-settings-actions";
import AdminGeneralSettingsPage from "../../src/app/(protected)/admin/settings/general/page";
import AdminSettingsLayout from "../../src/app/(protected)/admin/settings/layout";

describe("Phase 1: VibeLock General Store Settings & Foundation", () => {
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
      await expect(AdminGeneralSettingsPage()).rejects.toThrow("NEXT_REDIRECT:/login");
    });

    test("redirects non-admin (CUSTOMER/STAFF) users to /unauthorized", async () => {
      mockSession = { user: { id: "cust-1", role: "CUSTOMER" } };
      await expect(AdminSettingsLayout({ children: null })).rejects.toThrow(
        "NEXT_REDIRECT:/unauthorized"
      );
      await expect(AdminGeneralSettingsPage()).rejects.toThrow("NEXT_REDIRECT:/unauthorized");

      mockSession = { user: { id: "staff-1", role: "STAFF" } };
      await expect(AdminGeneralSettingsPage()).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });

    test("allows ADMIN role users to access layout and general settings page", async () => {
      mockSession = {
        user: { id: "admin-1", email: "admin@vibelock.com", role: "ADMIN" },
      };

      const layoutResult = await AdminSettingsLayout({ children: "content" });
      expect(layoutResult).toBeDefined();

      const pageResult = await AdminGeneralSettingsPage();
      expect(pageResult).toBeDefined();
    });

    test("rejects server action invocation from non-admin users", async () => {
      mockSession = { user: { id: "cust-1", role: "CUSTOMER" } };
      const formData = new FormData();
      formData.set("storeName", "Hacked Store");

      await expect(updateGeneralSettingsAction({ error: null }, formData)).rejects.toThrow();
    });
  });

  describe("2. Strategy A Fallback & Error Resilience", () => {
    test("returns default settings when database row is missing", async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue(null);
      const res = await getGeneralStoreSettings();

      expect(res.settings.storeName).toBe("VibeLock");
      expect(res.settings.currency).toBe("BDT");
      expect(res.isPersisted).toBe(false);
      expect(res.hasStore).toBe(true);
    });

    test("safely applies Strategy A defaults when StoreSetting table is not yet migrated (P2021)", async () => {
      mockPrisma.storeSetting.findUnique.mockRejectedValue({
        code: "P2021",
        message: "The table `StoreSetting` does not exist in the current database.",
      });

      const res = await getGeneralStoreSettings();
      expect(res.settings.storeName).toBe("VibeLock");
      expect(res.isPersisted).toBe(false);
      expect(res.hasStore).toBe(false);
    });

    test("fails closed and propagates real database connection failures", async () => {
      mockPrisma.storeSetting.findUnique.mockRejectedValue(
        new Error("Connection terminated unexpectedly by Neon host")
      );

      await expect(getGeneralStoreSettings()).rejects.toThrow(
        "Database error while fetching store setting GENERAL_STORE_SETTINGS"
      );
    });

    test("falls back to default settings gracefully when stored JSON is corrupted", async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue({
        id: "setting-corrupt",
        key: STORE_SETTING_KEYS.GENERAL,
        value: { storeName: 12345, invalidField: true }, // invalid schema
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await getGeneralStoreSettings();
      expect(res.settings.storeName).toBe("VibeLock");
      expect(res.isPersisted).toBe(false);
    });
  });

  describe("3. Transactional Persistence & AuditLog Integration", () => {
    test("updates settings atomically inside Prisma transaction with AuditLog entry", async () => {
      const existingSettings = getDefaultGeneralStoreSettings();
      mockPrisma.storeSetting.findUnique.mockResolvedValue({
        id: "setting-1",
        key: STORE_SETTING_KEYS.GENERAL,
        value: existingSettings,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updatedSettings: GeneralStoreSettings = {
        ...existingSettings,
        storeName: "VibeLock Premium",
        supportPhone: "8801999999999",
        maintenanceMode: {
          enabled: true,
          noticeTitle: "Scheduled Upgrades",
          noticeMessage: "Back in 10 minutes",
          allowAdminBypass: true,
        },
      };

      const result = await updateGeneralStoreSettings(updatedSettings, "admin-user-777");
      expect(result.success).toBe(true);
      expect(result.data?.storeName).toBe("VibeLock Premium");

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.storeSetting.upsert).toHaveBeenCalledWith({
        where: { key: STORE_SETTING_KEYS.GENERAL },
        update: {
          value: updatedSettings,
          description: expect.any(String),
          updatedBy: "admin-user-777",
        },
        create: {
          key: STORE_SETTING_KEYS.GENERAL,
          value: updatedSettings,
          description: expect.any(String),
          updatedBy: "admin-user-777",
        },
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: "admin-user-777",
          action: "STORE_SETTING_UPDATED",
          entityType: "StoreSetting",
          entityId: "mock-setting-uuid",
          metadata: {
            key: STORE_SETTING_KEYS.GENERAL,
            previousState: existingSettings,
            newState: updatedSettings,
          },
        },
      });
    });
  });

  describe("4. Server Action Validation & Form Handling", () => {
    test("validates required fields and rejects empty storeName or invalid supportEmail", async () => {
      mockSession = {
        user: { id: "admin-1", email: "admin@vibelock.com", role: "ADMIN" },
      };

      const formData = new FormData();
      formData.set("storeName", ""); // empty
      formData.set("supportEmail", "not-an-email");

      const res = await updateGeneralSettingsAction({ error: null }, formData);
      expect(res.error).toBe("Please correct the invalid fields below.");
      expect(res.fieldErrors?.storeName).toBeDefined();
      expect(res.fieldErrors?.supportEmail).toBeDefined();
    });

    test("successfully processes valid form data and updates general settings", async () => {
      mockSession = {
        user: { id: "admin-1", email: "admin@vibelock.com", role: "ADMIN" },
      };

      const formData = new FormData();
      formData.set("storeName", "VibeLock Bangladesh");
      formData.set("legalBusinessName", "VibeLock BD Ltd.");
      formData.set("supportPhone", "8801311333277");
      formData.set("whatsappNumber", "8801311333277");
      formData.set("supportEmail", "contact@vibelock.com");
      formData.set("warehouseAddress", "Uttara Sector 3, Dhaka");
      formData.set("maintenanceMode_enabled", "false");
      formData.set("holidayMode_enabled", "true");
      formData.set("holidayMode_bannerText", "Eid Mubarak! Shipping resumes soon.");

      const res = await updateGeneralSettingsAction({ error: null }, formData);
      expect(res.error).toBeNull();
      expect(res.message).toContain("Store identity, legal compliance, and emergency settings updated");
    });

    test("successfully processes partial section update from isolated card form without overwriting other cards", async () => {
      mockSession = {
        user: { id: "admin-1", email: "admin@vibelock.com", role: "ADMIN" },
      };

      const existingSettings = getDefaultGeneralStoreSettings();
      mockPrisma.storeSetting.findUnique.mockResolvedValue({
        id: "setting-1",
        key: STORE_SETTING_KEYS.GENERAL,
        value: {
          ...existingSettings,
          storeName: "Original Store Name",
          supportPhone: "01700000000",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Card 1 submits ONLY identity fields
      const formData = new FormData();
      formData.set("storeName", "Updated Store Name");
      formData.set("legalBusinessName", "Updated Legal Business Name");

      const res = await updateGeneralSettingsAction({ error: null }, formData);
      expect(res.error).toBeNull();
      expect(res.message).toBeDefined();

      // Verifies unsubmitted supportPhone was preserved from existing settings
      expect(mockPrisma.storeSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            value: expect.objectContaining({
              storeName: "Updated Store Name",
              legalBusinessName: "Updated Legal Business Name",
              supportPhone: "01700000000",
            }),
          }),
        })
      );
    });
  });
});
