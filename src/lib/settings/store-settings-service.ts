import "server-only";

import prisma from "@/lib/prisma/client";
import { appConfig } from "@/lib/config/app";
import { getWhatsAppNumber } from "@/lib/config/contact";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

// Key constants for store settings
export const STORE_SETTING_KEYS = {
  GENERAL: "GENERAL_STORE_SETTINGS",
  CHECKOUT: "CHECKOUT_COD_POLICY",
  SHIPPING: "SHIPPING_DELIVERY_RULES",
  NOTIFICATIONS: "NOTIFICATION_CONFIG",
  POLICIES: "INVENTORY_RETURN_POLICIES",
  TAX_INVOICE: "TAX_INVOICE_CONFIG",
  SECURITY: "SECURITY_PIXEL_CONFIG",
} as const;

// ── ZOD SCHEMAS ──

export const MaintenanceModeSchema = z.object({
  enabled: z.boolean().default(false),
  noticeTitle: z
    .string()
    .min(1, "Notice title is required")
    .default("Store Under Scheduled Maintenance"),
  noticeMessage: z
    .string()
    .min(1, "Notice message is required")
    .default(
      "We are upgrading our infrastructure to serve you better. We will be back online shortly."
    ),
  allowAdminBypass: z.boolean().default(true),
});

export const HolidayModeSchema = z.object({
  enabled: z.boolean().default(false),
  bannerText: z
    .string()
    .min(1, "Banner announcement is required")
    .default(
      "Holiday Notice: Deliveries will be temporarily paused and resume right after the holidays."
    ),
  expectedDispatchDate: z.string().optional().default(""),
});

export const GeneralStoreSettingsSchema = z.object({
  storeName: z.string().min(1, "Store name is required").default("VibeLock"),
  legalBusinessName: z
    .string()
    .min(1, "Legal business name is required")
    .default("VibeLock Apparel Ltd."),
  dbidNumber: z.string().optional().default(""),
  tradeLicenseNumber: z.string().optional().default(""),
  binNumber: z.string().optional().default(""),
  supportPhone: z.string().min(1, "Support phone is required").default("8801311333277"),
  whatsappNumber: z.string().min(1, "WhatsApp number is required").default("8801311333277"),
  supportEmail: z.string().email("Valid support email is required").default("support@vibelock.com"),
  warehouseAddress: z
    .string()
    .min(1, "Warehouse address is required")
    .default("House 12, Road 4, Sector 3, Uttara, Dhaka-1230, Bangladesh"),
  currency: z.string().default("BDT"),
  timezone: z.string().default("Asia/Dhaka"),
  maintenanceMode: MaintenanceModeSchema.default({
    enabled: false,
    noticeTitle: "Store Under Scheduled Maintenance",
    noticeMessage:
      "We are upgrading our infrastructure to serve you better. We will be back online shortly.",
    allowAdminBypass: true,
  }),
  holidayMode: HolidayModeSchema.default({
    enabled: false,
    bannerText:
      "Holiday Notice: Deliveries will be temporarily paused and resume right after the holidays.",
    expectedDispatchDate: "",
  }),
});

export type GeneralStoreSettings = z.output<typeof GeneralStoreSettingsSchema>;

/**
 * Returns default configuration seeded from static constants and env vars (Strategy A Fallback)
 */
export function getDefaultGeneralStoreSettings(): GeneralStoreSettings {
  return {
    storeName: appConfig.name || "VibeLock",
    legalBusinessName: "VibeLock Apparel Ltd.",
    dbidNumber: "",
    tradeLicenseNumber: "",
    binNumber: "",
    supportPhone: getWhatsAppNumber() || "8801311333277",
    whatsappNumber: getWhatsAppNumber() || "8801311333277",
    supportEmail: process.env.SUPPORT_EMAIL || "support@vibelock.com",
    warehouseAddress: "House 12, Road 4, Sector 3, Uttara, Dhaka-1230, Bangladesh",
    currency: appConfig.currency || "BDT",
    timezone: appConfig.timezone || "Asia/Dhaka",
    maintenanceMode: {
      enabled: false,
      noticeTitle: "Store Under Scheduled Maintenance",
      noticeMessage:
        "We are upgrading our infrastructure to serve you better. We will be back online shortly.",
      allowAdminBypass: true,
    },
    holidayMode: {
      enabled: false,
      bannerText:
        "Holiday Notice: Deliveries will be temporarily paused and resume right after the holidays.",
      expectedDispatchDate: "",
    },
  };
}

/**
 * Checks whether an error is due to the StoreSetting table not existing yet (pre-migration state).
 */
function isTableMissingError(err: unknown): boolean {
  const error = err as { code?: string; message?: string };
  return (
    error?.code === "P2021" ||
    Boolean(error?.message?.includes("does not exist")) ||
    Boolean(error?.message?.includes("42P01"))
  );
}

/**
 * Generic getter for any StoreSetting key with Zod schema parsing and Strategy A fallback.
 */
export async function getStoreSetting<T>(
  key: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  fallback: T
): Promise<{ data: T; isPersisted: boolean; hasStore: boolean }> {
  try {
    const record = await prisma.storeSetting.findUnique({
      where: { key },
    });

    if (!record) {
      return { data: fallback, isPersisted: false, hasStore: true };
    }

    const parsed = schema.safeParse(record.value);
    if (!parsed.success) {
      console.warn(
        `[StoreSettings] Corrupted JSON payload for key ${key}, falling back to defaults:`,
        parsed.error
      );
      return { data: fallback, isPersisted: false, hasStore: true };
    }

    return { data: parsed.data, isPersisted: true, hasStore: true };
  } catch (err: unknown) {
    if (isTableMissingError(err)) {
      // Safe Strategy A fallback: return defaults
      return { data: fallback, isPersisted: false, hasStore: false };
    }

    const message = err instanceof Error ? err.message : "Database error";
    console.error(`[StoreSettings] Critical database access failure fetching ${key}:`, message);
    throw new Error(`Database error while fetching store setting ${key}`);
  }
}

/**
 * Generic updater for any StoreSetting key with atomic AuditLog recording.
 */
export async function updateStoreSetting<T>(
  key: string,
  value: unknown,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  actorId?: string,
  description?: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const validatedData = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.storeSetting.findUnique({ where: { key } });

      const updated = await tx.storeSetting.upsert({
        where: { key },
        update: {
          value: validatedData as unknown as Prisma.InputJsonValue,
          description: description || existing?.description || `Configuration for ${key}`,
          updatedBy: actorId || null,
        },
        create: {
          key,
          value: validatedData as unknown as Prisma.InputJsonValue,
          description: description || `Configuration for ${key}`,
          updatedBy: actorId || null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actorId ?? null,
          action: "STORE_SETTING_UPDATED",
          entityType: "StoreSetting",
          entityId: updated.id,
          metadata: {
            key,
            previousState: existing ? existing.value : null,
            newState: validatedData as unknown as Prisma.InputJsonValue,
          },
        },
      });
    });

    revalidatePath("/admin/settings/general");
    revalidatePath("/admin/settings");
    revalidatePath("/");
    revalidatePath("/shop");
    try {
      updateTag("products");
      updateTag("discovery");
    } catch {
      // Graceful fallback for non-request contexts
    }

    return { success: true, data: validatedData };
  } catch (err: unknown) {
    if (isTableMissingError(err)) {
      const message =
        "The database table 'StoreSetting' has not been created yet. Please apply pending migrations (run 'npm run db:migrate:deploy').";
      console.error(`[StoreSettings] Missing table for ${key}:`, message);
      return { success: false, error: message };
    }

    const message = err instanceof Error ? err.message : "Database update failed";
    console.error(`[StoreSettings] Failed to persist setting ${key}:`, message);
    return { success: false, error: message };
  }
}

/**
 * Returns General Store Settings (identity, legal, contact, maintenance).
 */
export async function getGeneralStoreSettings(): Promise<{
  settings: GeneralStoreSettings;
  isPersisted: boolean;
  hasStore: boolean;
}> {
  const fallback = getDefaultGeneralStoreSettings();
  const res = await getStoreSetting(
    STORE_SETTING_KEYS.GENERAL,
    GeneralStoreSettingsSchema,
    fallback
  );
  return {
    settings: res.data,
    isPersisted: res.isPersisted,
    hasStore: res.hasStore,
  };
}

/**
 * Updates General Store Settings with atomic audit logging.
 */
export async function updateGeneralStoreSettings(
  settings: GeneralStoreSettings,
  actorId?: string
): Promise<{ success: boolean; data?: GeneralStoreSettings; error?: string }> {
  return updateStoreSetting(
    STORE_SETTING_KEYS.GENERAL,
    settings,
    GeneralStoreSettingsSchema,
    actorId,
    "General store identity, legal DBID, omnichannel contact, and emergency modes"
  );
}
