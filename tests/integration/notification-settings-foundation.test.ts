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
    SMS_API_KEY: "env_mock_sms_api_key_123",
    SMS_API_URL: "https://mock.bulksmsbd.com/send",
    SMS_SENDER_ID: "VibeLockEnv",
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
  usePathname: vi.fn(() => "/admin/settings/notifications"),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

import AdminSettingsLayout from "../../src/app/(protected)/admin/settings/layout";
import AdminNotificationSettingsPage from "../../src/app/(protected)/admin/settings/notifications/page";
import { updateNotificationSettingsAction } from "../../src/lib/admin/settings/notification-actions";
import {
  getDefaultNotificationSettings,
  getNotificationSettings,
  isSmsEventEnabled,
  resolveEffectiveSmsCredentials,
  updateNotificationSettings,
  type NotificationSettings,
} from "../../src/lib/settings/notification-settings";

describe("Phase 4: VibeLock Omnichannel SMS & Notifications Engine", () => {
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
      await expect(AdminNotificationSettingsPage()).rejects.toThrow("NEXT_REDIRECT:/login");
    });

    test("redirects non-admin (CUSTOMER/STAFF) users to /unauthorized", async () => {
      mockSession = { user: { id: "cust-1", role: "CUSTOMER" } };
      await expect(AdminSettingsLayout({ children: null })).rejects.toThrow(
        "NEXT_REDIRECT:/unauthorized"
      );
      await expect(AdminNotificationSettingsPage()).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });

    test("allows ADMIN role users to access layout and notifications page", async () => {
      mockSession = {
        user: { id: "admin-1", email: "admin@vibelock.com", role: "ADMIN" },
      };

      const layoutResult = await AdminSettingsLayout({ children: "content" });
      expect(layoutResult).toBeDefined();

      const pageResult = await AdminNotificationSettingsPage();
      expect(pageResult).toBeDefined();
    });

    test("rejects server action invocation from non-admin users", async () => {
      mockSession = { user: { id: "cust-1", role: "CUSTOMER" } };
      const formData = new FormData();
      formData.set("senderId", "HackedMask");

      await expect(updateNotificationSettingsAction({ error: null }, formData)).rejects.toThrow();
    });
  });

  describe("2. Strategy A Fallback & Configuration Defaults", () => {
    test("returns default notification settings when database row is missing", async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue(null);
      const res = await getNotificationSettings();

      expect(res.settings.smsProvider).toBe("BULKSMSBD");
      expect(res.settings.notifyOnOrderPlaced).toBe(true);
      expect(res.settings.adminAlertHighValueThreshold).toBe(10000);
      expect(res.isPersisted).toBe(false);
      expect(res.hasStore).toBe(true);
    });

    test("safely applies Strategy A defaults when table is unmigrated (P2021)", async () => {
      mockPrisma.storeSetting.findUnique.mockRejectedValue({
        code: "P2021",
        message: "The table `StoreSetting` does not exist in the current database.",
      });

      const res = await getNotificationSettings();
      expect(res.settings.smsProvider).toBe("BULKSMSBD");
      expect(res.isPersisted).toBe(false);
      expect(res.hasStore).toBe(false);
    });
  });

  describe("3. SMS Credential Resolution & Milestone Event Triggers", () => {
    test("resolves credentials from environment variables when database overrides are blank", async () => {
      process.env.SMS_API_KEY = "env_sms_key_999";
      process.env.SMS_API_URL = "https://env.sms.test/send";
      process.env.SMS_SENDER_ID = "VibeLockEnv";

      mockPrisma.storeSetting.findUnique.mockResolvedValue({
        id: "setting-notif-blank",
        key: "NOTIFICATION_CONFIG",
        value: { ...getDefaultNotificationSettings(), smsApiKey: "", smsApiUrl: "", senderId: "" },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const creds = await resolveEffectiveSmsCredentials();
      expect(creds.apiKey).toBe("env_sms_key_999");
      expect(creds.apiUrl).toBe("https://env.sms.test/send");
      expect(creds.senderId).toBe("VibeLockEnv");
      expect(creds.isConfigured).toBe(true);
    });

    test("gives priority to database overrides over server environment variables", async () => {
      process.env.SMS_API_KEY = "env_sms_key_old";
      process.env.SMS_API_URL = "https://old.url/send";

      mockPrisma.storeSetting.findUnique.mockResolvedValue({
        id: "setting-notif-db",
        key: "NOTIFICATION_CONFIG",
        value: {
          ...getDefaultNotificationSettings(),
          smsProvider: "GREENWEB",
          smsApiKey: "db_custom_api_key_active",
          smsApiUrl: "https://api.greenweb.com.bd/api.php",
          senderId: "VBLCK_VIP",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const creds = await resolveEffectiveSmsCredentials();
      expect(creds.provider).toBe("GREENWEB");
      expect(creds.apiKey).toBe("db_custom_api_key_active");
      expect(creds.apiUrl).toBe("https://api.greenweb.com.bd/api.php");
      expect(creds.senderId).toBe("VBLCK_VIP");
      expect(creds.isConfigured).toBe(true);
    });

    test("accurately checks milestone event switches", async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue({
        id: "setting-events",
        key: "NOTIFICATION_CONFIG",
        value: {
          ...getDefaultNotificationSettings(),
          notifyOnOrderPlaced: true,
          notifyOnOrderDispatched: false,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(await isSmsEventEnabled("order_placed")).toBe(true);
      expect(await isSmsEventEnabled("order_dispatched")).toBe(false);
    });
  });

  describe("4. Transactional Persistence & AuditLog Integration", () => {
    test("updates notification settings atomically inside Prisma transaction with AuditLog entry", async () => {
      const existingSettings = getDefaultNotificationSettings();
      mockPrisma.storeSetting.findUnique.mockResolvedValue({
        id: "setting-notif-1",
        key: "NOTIFICATION_CONFIG",
        value: existingSettings,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updatedSettings: NotificationSettings = {
        ...existingSettings,
        smsProvider: "REVE",
        senderId: "VIBELOCK_BD",
        adminAlertHighValueThreshold: 15000,
        notifyOnOutForDelivery: false,
      };

      const result = await updateNotificationSettings(updatedSettings, "admin-user-555");
      expect(result.success).toBe(true);
      expect(result.data?.smsProvider).toBe("REVE");

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.storeSetting.upsert).toHaveBeenCalledWith({
        where: { key: "NOTIFICATION_CONFIG" },
        update: {
          value: updatedSettings,
          description: expect.any(String),
          updatedBy: "admin-user-555",
        },
        create: {
          key: "NOTIFICATION_CONFIG",
          value: updatedSettings,
          description: expect.any(String),
          updatedBy: "admin-user-555",
        },
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: "admin-user-555",
          action: "STORE_SETTING_UPDATED",
          entityType: "StoreSetting",
          entityId: "mock-setting-uuid",
          metadata: {
            key: "NOTIFICATION_CONFIG",
            previousState: existingSettings,
            newState: updatedSettings,
          },
        },
      });
    });
  });

  describe("5. Server Action Validation & Form Handling", () => {
    test("validates required fields and rejects invalid thresholds", async () => {
      mockSession = {
        user: { id: "admin-1", email: "admin@vibelock.com", role: "ADMIN" },
      };

      const formData = new FormData();
      formData.set("adminAlertHighValueThreshold", "200"); // below min 1000
      formData.set("adminNotificationEmail", "invalid-email"); // invalid email

      const res = await updateNotificationSettingsAction({ error: null }, formData);
      expect(res.error).toBe("Please correct the invalid notification settings fields below.");
      expect(res.fieldErrors?.adminAlertHighValueThreshold).toBeDefined();
      expect(res.fieldErrors?.adminNotificationEmail).toBeDefined();
    });

    test("successfully processes valid form data and updates notification settings", async () => {
      mockSession = {
        user: { id: "admin-1", email: "admin@vibelock.com", role: "ADMIN" },
      };

      const formData = new FormData();
      formData.set("smsProvider", "BULKSMSBD");
      formData.set("senderId", "VibeLock");
      formData.set("smsApiKey", "");
      formData.set("smsApiUrl", "");
      formData.set("notifyOnOrderPlaced", "true");
      formData.set("notifyOnOrderDispatched", "true");
      formData.set("notifyOnOutForDelivery", "true");
      formData.set("notifyOnReturnApproved", "true");
      formData.set("adminAlertsEnabled", "true");
      formData.set("adminAlertRecipientPhone", "8801311333277");
      formData.set("adminAlertHighValueThreshold", "12000");
      formData.set("adminAlertLowSmsBalanceWarning", "true");
      formData.set("enableCustomerOrderEmail", "true");
      formData.set("enableAdminOrderAlertEmail", "true");
      formData.set("adminNotificationEmail", "ops@vibelock.com");
      formData.set("supportReplyToEmail", "support@vibelock.com");

      const res = await updateNotificationSettingsAction({ error: null }, formData);
      expect(res.error).toBeNull();
      expect(res.message).toContain(
        "SMS gateway routing, transactional event switches, and store alerts updated"
      );
    });
  });
});
