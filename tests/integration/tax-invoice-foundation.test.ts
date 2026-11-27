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
  TaxInvoiceSettingsSchema,
  DEFAULT_TAX_INVOICE_SETTINGS,
  getTaxInvoiceSettings,
  calculateEffectiveTax,
  formatMushakInvoiceNumber,
} from "@/lib/settings/tax-invoice-settings";
import { updateTaxInvoiceSettingsAction } from "@/lib/admin/settings/tax-invoice-actions";

describe("Phase 6: VibeLock Tax, VAT & Invoicing Compliance Engine", () => {
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
    test("validates default settings with tax disabled", () => {
      const parsed = TaxInvoiceSettingsSchema.safeParse(DEFAULT_TAX_INVOICE_SETTINGS);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.enableTax).toBe(false);
        expect(parsed.data.vatRatePercent).toBe(0);
        expect(parsed.data.taxCalculationMode).toBe("INCLUSIVE");
        expect(parsed.data.enableMushak63Format).toBe(true);
      }
    });

    test("enforces valid VAT rate bounds (0% to 30%)", () => {
      const negativeRes = TaxInvoiceSettingsSchema.safeParse({
        ...DEFAULT_TAX_INVOICE_SETTINGS,
        vatRatePercent: -2,
      });
      expect(negativeRes.success).toBe(false);

      const excessiveRes = TaxInvoiceSettingsSchema.safeParse({
        ...DEFAULT_TAX_INVOICE_SETTINGS,
        vatRatePercent: 45,
      });
      expect(excessiveRes.success).toBe(false);

      const validRes = TaxInvoiceSettingsSchema.safeParse({
        ...DEFAULT_TAX_INVOICE_SETTINGS,
        vatRatePercent: 7.5,
      });
      expect(validRes.success).toBe(true);
    });

    test("accepts valid tax calculation modes (INCLUSIVE / EXCLUSIVE)", () => {
      const inclusive = TaxInvoiceSettingsSchema.safeParse({
        ...DEFAULT_TAX_INVOICE_SETTINGS,
        taxCalculationMode: "INCLUSIVE",
      });
      expect(inclusive.success).toBe(true);

      const exclusive = TaxInvoiceSettingsSchema.safeParse({
        ...DEFAULT_TAX_INVOICE_SETTINGS,
        taxCalculationMode: "EXCLUSIVE",
      });
      expect(exclusive.success).toBe(true);

      const invalid = TaxInvoiceSettingsSchema.safeParse({
        ...DEFAULT_TAX_INVOICE_SETTINGS,
        taxCalculationMode: "UNKNOWN_MODE",
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("2. Strategy A Fallback & Error Resilience", () => {
    test("returns static defaults when no database record exists", async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue(null);

      const { settings, isPersisted, hasStore } = await getTaxInvoiceSettings();
      expect(isPersisted).toBe(false);
      expect(hasStore).toBe(true);
      expect(settings.enableTax).toBe(false);
      expect(settings.vatRatePercent).toBe(0);
      expect(settings.binNumber).toBe("001234567-0101");
    });

    test("gracefully falls back when table is unmigrated (P2021)", async () => {
      const p2021Error = new Error("Table 'StoreSetting' does not exist in the current database");
      (p2021Error as unknown as { code: string }).code = "P2021";
      mockPrisma.storeSetting.findUnique.mockRejectedValue(p2021Error);

      const { settings, isPersisted, hasStore } = await getTaxInvoiceSettings();
      expect(isPersisted).toBe(false);
      expect(hasStore).toBe(false);
      expect(settings.enableMushak63Format).toBe(true);
    });

    test("falls back to default settings when stored JSON is corrupted", async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue({
        key: "TAX_INVOICE_CONFIG",
        value: {
          vatRatePercent: "NOT_A_NUMBER",
        },
      });

      const { settings, isPersisted, hasStore } = await getTaxInvoiceSettings();
      expect(isPersisted).toBe(false);
      expect(hasStore).toBe(true);
      expect(settings.vatRatePercent).toBe(0);
    });

    test("fails closed and throws on critical database connection failure", async () => {
      mockPrisma.storeSetting.findUnique.mockRejectedValue(
        new Error("Connection terminated unexpectedly by database host")
      );

      await expect(getTaxInvoiceSettings()).rejects.toThrow("Database error while fetching store setting");
    });
  });

  describe("3. VAT Calculation Math & Invoice Formatting", () => {
    test("returns 0 tax when enableTax is false", async () => {
      const evalResult = await calculateEffectiveTax({
        subtotal: 1500,
        shippingCost: 100,
        customSettings: {
          ...DEFAULT_TAX_INVOICE_SETTINGS,
          enableTax: false,
          vatRatePercent: 7.5,
        },
      });

      expect(evalResult.taxRate).toBe(0);
      expect(evalResult.taxAmount).toBe(0);
      expect(evalResult.taxIncluded).toBe(false);
      expect(evalResult.finalTotal).toBe(1600);
    });

    test("calculates INCLUSIVE VAT correctly without adding extra charge to consumer", async () => {
      // 1050 BDT subtotal with 5% inclusive VAT:
      // Tax component = 1050 - (1050 / 1.05) = 50 BDT
      const evalResult = await calculateEffectiveTax({
        subtotal: 1050,
        shippingCost: 80,
        customSettings: {
          ...DEFAULT_TAX_INVOICE_SETTINGS,
          enableTax: true,
          vatRatePercent: 5,
          taxCalculationMode: "INCLUSIVE",
          applyTaxToShipping: false,
        },
      });

      expect(evalResult.taxRate).toBe(5);
      expect(evalResult.taxIncluded).toBe(true);
      expect(evalResult.taxAmount).toBe(50);
      expect(evalResult.finalTotal).toBe(1130); // 1050 subtotal + 80 shipping
    });

    test("calculates EXCLUSIVE VAT correctly adding tax to final customer checkout payable", async () => {
      // 2000 BDT subtotal with 7.5% exclusive VAT:
      // Tax = 2000 * 0.075 = 150 BDT
      // Final Total = 2000 + 120 (shipping) + 150 (tax) = 2270 BDT
      const evalResult = await calculateEffectiveTax({
        subtotal: 2000,
        shippingCost: 120,
        customSettings: {
          ...DEFAULT_TAX_INVOICE_SETTINGS,
          enableTax: true,
          vatRatePercent: 7.5,
          taxCalculationMode: "EXCLUSIVE",
          applyTaxToShipping: false,
        },
      });

      expect(evalResult.taxRate).toBe(7.5);
      expect(evalResult.taxIncluded).toBe(false);
      expect(evalResult.taxAmount).toBe(150);
      expect(evalResult.finalTotal).toBe(2270);
    });

    test("applies tax to shipping when applyTaxToShipping is true", async () => {
      // 2000 subtotal + 100 shipping = 2100 taxable base
      // 10% tax = 210 BDT
      // Final Total = 2100 + 210 = 2310 BDT
      const evalResult = await calculateEffectiveTax({
        subtotal: 2000,
        shippingCost: 100,
        customSettings: {
          ...DEFAULT_TAX_INVOICE_SETTINGS,
          enableTax: true,
          vatRatePercent: 10,
          taxCalculationMode: "EXCLUSIVE",
          applyTaxToShipping: true,
        },
      });

      expect(evalResult.taxAmount).toBe(210);
      expect(evalResult.finalTotal).toBe(2310);
    });

    test("formats legal Mushak 6.3 invoice numbers accurately", () => {
      expect(formatMushakInvoiceNumber("ORD-2026-1001", "VL-INV-")).toBe("VL-INV-2026-1001");
      expect(formatMushakInvoiceNumber("98765", "INV-BD-")).toBe("INV-BD-98765");
    });
  });

  describe("4. Admin Action Mutation & Audit Log Persistence", () => {
    test("rejects mutation if caller is not an ADMIN", async () => {
      mockSession = {
        user: { id: "cust-1", role: "CUSTOMER" },
      };

      const formData = new FormData();
      formData.set("vatRatePercent", "5");

      await expect(
        updateTaxInvoiceSettingsAction({ error: null }, formData)
      ).rejects.toThrow();
    });

    test("successfully updates settings and writes an immutable audit log", async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue(null);
      mockPrisma.storeSetting.upsert.mockResolvedValue({
        id: "mock-tax-setting-id",
        key: "TAX_INVOICE_CONFIG",
        value: {
          ...DEFAULT_TAX_INVOICE_SETTINGS,
          enableTax: true,
          vatRatePercent: 7.5,
          binNumber: "009988776-0202",
        },
      });

      const formData = new FormData();
      formData.set("enableTax", "true");
      formData.set("vatRatePercent", "7.5");
      formData.set("taxCalculationMode", "INCLUSIVE");
      formData.set("applyTaxToShipping", "false");
      formData.set("binNumber", "009988776-0202");
      formData.set("taxCircle", "Circle-10 (Gulshan)");
      formData.set("taxZone", "Taxes Zone-05, Dhaka");
      formData.set("registeredBusinessName", "VibeLock Retail Ltd.");
      formData.set("registeredOfficeAddress", "Plot 14, Block C, Banani, Dhaka-1213");
      formData.set("enableMushak63Format", "true");
      formData.set("invoicePrefix", "VL-TAX-");
      formData.set("invoiceFooterNote", "Compliant computer-generated Mushak 6.3 invoice under SRO 186/2019.");
      formData.set("customerCareContact", "+880 1311-333277");
      formData.set("showDigitalSeal", "true");

      const result = await updateTaxInvoiceSettingsAction({ error: null }, formData);

      expect(result.error).toBeNull();
      expect(result.message).toContain("VAT calculation rules, NBR BIN information, and Mushak 6.3 invoice settings updated");

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
