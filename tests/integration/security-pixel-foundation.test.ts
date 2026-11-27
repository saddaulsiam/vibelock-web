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
    NEXT_PUBLIC_META_PIXEL_ID: "env_meta_pixel_12345",
    META_CAPI_ACCESS_TOKEN: "env_capi_secret_token_abc",
    NEXT_PUBLIC_GTM_ID: "GTM-ENV123",
    NEXT_PUBLIC_GA_ID: "G-ENVGA499",
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

import {
  SecurityPixelSettingsSchema,
  getDefaultSecurityPixelSettings,
  getSecurityPixelSettings,
  resolveEffectiveTrackingPixels,
  isIpAllowedForAdmin,
} from "@/lib/settings/security-pixel-settings";
import { updateSecurityPixelSettingsAction } from "@/lib/admin/settings/security-pixel-actions";

describe("Phase 7: VibeLock Analytics, Tracking Pixels & Admin Security Controls", () => {
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

    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => {
      return callback(mockPrisma);
    });
  });

  describe("1. Zod Schema Validation & Boundary Rules", () => {
    test("validates default settings successfully", () => {
      const defaults = getDefaultSecurityPixelSettings();
      const parsed = SecurityPixelSettingsSchema.safeParse(defaults);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.adminSessionTimeoutMinutes).toBe(60);
        expect(parsed.data.enforceAdmin2FA).toBe(false);
        expect(parsed.data.trackEcommerceEvents).toBe(true);
      }
    });

    test("enforces session inactivity timeout bounds (5 to 1440 minutes)", () => {
      const tooLow = SecurityPixelSettingsSchema.safeParse({
        ...getDefaultSecurityPixelSettings(),
        adminSessionTimeoutMinutes: 2, // < 5
      });
      expect(tooLow.success).toBe(false);

      const tooHigh = SecurityPixelSettingsSchema.safeParse({
        ...getDefaultSecurityPixelSettings(),
        adminSessionTimeoutMinutes: 2000, // > 1440
      });
      expect(tooHigh.success).toBe(false);

      const valid = SecurityPixelSettingsSchema.safeParse({
        ...getDefaultSecurityPixelSettings(),
        adminSessionTimeoutMinutes: 120,
      });
      expect(valid.success).toBe(true);
    });

    test("validates security contact email format", () => {
      const invalidEmail = SecurityPixelSettingsSchema.safeParse({
        ...getDefaultSecurityPixelSettings(),
        securityContactEmail: "not-a-valid-email",
      });
      expect(invalidEmail.success).toBe(false);

      const validEmail = SecurityPixelSettingsSchema.safeParse({
        ...getDefaultSecurityPixelSettings(),
        securityContactEmail: "ops-security@vibelock.com",
      });
      expect(validEmail.success).toBe(true);
    });
  });

  describe("2. Strategy A Fallback & Error Resilience", () => {
    test("returns static defaults when no database record exists", async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue(null);

      const { settings, isPersisted, hasStore } = await getSecurityPixelSettings();
      expect(isPersisted).toBe(false);
      expect(hasStore).toBe(true);
      expect(settings.adminSessionTimeoutMinutes).toBe(60);
      expect(settings.enforceAdmin2FA).toBe(false);
    });

    test("gracefully falls back when table is unmigrated (P2021 error)", async () => {
      const p2021Error = new Error("Table 'StoreSetting' does not exist in the current database");
      (p2021Error as unknown as { code: string }).code = "P2021";
      mockPrisma.storeSetting.findUnique.mockRejectedValue(p2021Error);

      const { settings, isPersisted, hasStore } = await getSecurityPixelSettings();
      expect(isPersisted).toBe(false);
      expect(hasStore).toBe(false);
      expect(settings.trackEcommerceEvents).toBe(true);
    });

    test("falls back to default settings when stored JSON is corrupted", async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue({
        key: "SECURITY_PIXEL_CONFIG",
        value: {
          adminSessionTimeoutMinutes: "INVALID_NUMBER",
        },
      });

      const { settings, isPersisted, hasStore } = await getSecurityPixelSettings();
      expect(isPersisted).toBe(false);
      expect(hasStore).toBe(true);
      expect(settings.adminSessionTimeoutMinutes).toBe(60);
    });

    test("fails closed and throws on critical database connection failure", async () => {
      mockPrisma.storeSetting.findUnique.mockRejectedValue(
        new Error("Connection terminated unexpectedly by database host")
      );

      await expect(getSecurityPixelSettings()).rejects.toThrow("Database error while fetching store setting");
    });
  });

  describe("3. Pixel Resolution & IP Perimeter Access Control", () => {
    test("resolves pixel credentials from database when configured", async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue({
        key: "SECURITY_PIXEL_CONFIG",
        value: {
          ...getDefaultSecurityPixelSettings(),
          metaPixelId: "db_meta_pixel_99999",
          googleTagManagerId: "GTM-DB999",
          googleAnalyticsId: "G-DBGA4",
          tiktokPixelId: "TT-DB123",
        },
      });

      const pixels = await resolveEffectiveTrackingPixels();
      expect(pixels.metaPixelId).toBe("db_meta_pixel_99999");
      expect(pixels.googleTagManagerId).toBe("GTM-DB999");
      expect(pixels.googleAnalyticsId).toBe("G-DBGA4");
      expect(pixels.tiktokPixelId).toBe("TT-DB123");
    });

    test("evaluates IP allowlist correctly", () => {
      // 1. Open when allowlist is empty
      const openSettings = {
        ...getDefaultSecurityPixelSettings(),
        adminIpAllowlist: [],
      };
      expect(isIpAllowedForAdmin("103.145.12.10", openSettings)).toBe(true);
      expect(isIpAllowedForAdmin(null, openSettings)).toBe(true);

      // 2. Restricted when IPs are listed
      const restrictedSettings = {
        ...getDefaultSecurityPixelSettings(),
        adminIpAllowlist: ["103.145.12.10", "127.0.0.1"],
      };

      expect(isIpAllowedForAdmin("103.145.12.10", restrictedSettings)).toBe(true);
      expect(isIpAllowedForAdmin("127.0.0.1", restrictedSettings)).toBe(true);
      expect(isIpAllowedForAdmin("192.168.1.50", restrictedSettings)).toBe(false);
      expect(isIpAllowedForAdmin(null, restrictedSettings)).toBe(false);
    });
  });

  describe("4. Admin Action Mutation & Audit Log Persistence", () => {
    test("rejects mutation if caller is not an ADMIN", async () => {
      mockSession = {
        user: { id: "cust-1", role: "CUSTOMER" },
      };

      const formData = new FormData();
      formData.set("adminSessionTimeoutMinutes", "30");

      await expect(
        updateSecurityPixelSettingsAction({ error: null }, formData)
      ).rejects.toThrow();
    });

    test("successfully updates settings and writes an immutable audit log", async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue(null);
      mockPrisma.storeSetting.upsert.mockResolvedValue({
        id: "mock-security-id",
        key: "SECURITY_PIXEL_CONFIG",
        value: {
          ...getDefaultSecurityPixelSettings(),
          metaPixelId: "123456789012345",
          adminSessionTimeoutMinutes: 30,
        },
      });

      const formData = new FormData();
      formData.set("metaPixelId", "123456789012345");
      formData.set("metaCapiAccessToken", "EAAB_new_token_123");
      formData.set("metaTestEventCode", "TEST999");
      formData.set("googleTagManagerId", "GTM-K9999");
      formData.set("googleAnalyticsId", "G-ABC12345");
      formData.set("tiktokPixelId", "TT-PIXEL-77");
      formData.set("trackEcommerceEvents", "true");
      formData.set("adminSessionTimeoutMinutes", "30");
      formData.set("enforceAdmin2FA", "true");
      formData.set("adminIpAllowlist", "103.145.12.10, 192.168.1.1");
      formData.set("notifyFailedAdminLogin", "true");
      formData.set("securityContactEmail", "admin-sec@vibelock.com");

      const result = await updateSecurityPixelSettingsAction({ error: null }, formData);

      expect(result.error).toBeNull();
      expect(result.message).toContain("Marketing tracking pixels, Google Tag Manager, and admin security controls updated");

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

    test("preserves existing CAPI token when masked value is submitted", async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue({
        key: "SECURITY_PIXEL_CONFIG",
        value: {
          ...getDefaultSecurityPixelSettings(),
          metaCapiAccessToken: "SUPER_SECRET_PREVIOUS_TOKEN_XYZ",
        },
      });

      const formData = new FormData();
      formData.set("metaPixelId", "123456789012345");
      formData.set("metaCapiAccessToken", "••••••••••••••••••••••••••••••••XYZ"); // Masked string
      formData.set("adminSessionTimeoutMinutes", "60");
      formData.set("securityContactEmail", "security@vibelock.com");

      const result = await updateSecurityPixelSettingsAction({ error: null }, formData);
      expect(result.error).toBeNull();

      expect(mockPrisma.storeSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            value: expect.objectContaining({
              metaCapiAccessToken: "SUPER_SECRET_PREVIOUS_TOKEN_XYZ",
            }),
          }),
        })
      );
    });
  });
});
