import "server-only";

import prisma from "@/lib/prisma/client";
import { env } from "@/lib/config/env";
import { revalidatePath } from "next/cache";
import type { PaymentMethodSetting } from "@prisma/client";

export type PaymentMethodCode = "COD" | "SSLCOMMERZ" | "BKASH" | "NAGAD";

export interface PaymentMethodStatus {
  code: PaymentMethodCode;
  name: string;
  description: string;
  type: "OFFLINE" | "ONLINE_GATEWAY" | "MFS_DIRECT";
  isEnabled: boolean;
  isConfigured: boolean;
  isPersisted: boolean;
  persistenceBlockerReason?: string;
  environmentMode?: "sandbox" | "production" | "unconfigured";
  checkoutImpact: string;
}

export interface PaymentSettingsOverview {
  methods: PaymentMethodStatus[];
  hasPersistenceStore: boolean;
  persistenceBlocker?: string;
  serverEnforcedMethodCount: number;
}

export interface StorefrontPaymentOption {
  value: "COD" | "ONLINE" | "BKASH";
  title: string;
  detail: string;
}

/**
 * Checks whether all four required bKash credentials are present and non-empty after trimming.
 */
export function isBkashCredentialConfigured(): boolean {
  return Boolean(
    env.BKASH_APP_KEY?.trim() &&
    env.BKASH_APP_SECRET?.trim() &&
    env.BKASH_USERNAME?.trim() &&
    env.BKASH_PASSWORD?.trim()
  );
}

/**
 * Checks whether an error is due to the table not existing yet (pre-migration state).
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
 * Returns whether a given payment method is effectively active and permissible for checkout.
 *
 * Safe Missing-Row vs Database-Failure Rules:
 * - Missing row: If the table exists and the query succeeds with null, Strategy A bootstrap matrix applies.
 *   - COD defaults to true.
 *   - SSLCOMMERZ defaults to true ONLY if environment credentials exist.
 *   - BKASH and NAGAD default to false.
 * - Database access failure: If database connection fails, times out, or errors (non-P2021),
 *   it must NOT silently assume enabled! It throws to fail closed and prevent unauthorized checkout.
 * - Credential gating: An existing row with isEnabled: true will NEVER be enabled if required credentials are missing.
 */
export async function isPaymentMethodEnabled(code: string): Promise<boolean> {
  const normalized = code.trim().toUpperCase();
  const isSslcommerzConfigured = Boolean(
    env.SSLCOMMERZ_STORE_ID?.trim() && env.SSLCOMMERZ_STORE_PASSWORD?.trim()
  );

  let record: PaymentMethodSetting | null = null;

  try {
    record = await prisma.paymentMethodSetting.findUnique({
      where: { code: normalized === "ONLINE" ? "SSLCOMMERZ" : normalized },
    });
  } catch (err: unknown) {
    if (isTableMissingError(err)) {
      // Pre-migration state: safely apply bootstrap fallback
      record = null;
    } else {
      // Real database connectivity or runtime failure: Fail closed!
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(
        `[PaymentSettings] Database error checking payment method ${code}:`,
        message
      );
      throw new Error(`Database error while checking payment configuration for ${code}`);
    }
  }

  if (normalized === "COD") {
    // If database row exists, respect explicit admin decision. Otherwise default to enabled.
    return record ? record.isEnabled : true;
  }

  if (normalized === "ONLINE" || normalized === "SSLCOMMERZ") {
    // Credential gating: Cannot be enabled under any circumstances if credentials are missing
    if (!isSslcommerzConfigured) return false;
    // If database row exists, respect explicit admin decision. Otherwise default to enabled if configured.
    return record ? record.isEnabled : true;
  }

  if (normalized === "BKASH") {
    // Fail-closed credential gating: Cannot be enabled under any circumstances if credentials are missing
    if (!isBkashCredentialConfigured()) return false;
    return record ? record.isEnabled : false;
  }

  if (normalized === "NAGAD") {
    // Nagad disabled by default
    return false;
  }

  // Any unknown provider code is rejected
  return false;
}

/**
 * Returns available payment methods formatted for the customer checkout UI.
 */
export async function getStorefrontPaymentMethods(): Promise<StorefrontPaymentOption[]> {
  const [codActive, onlineActive, bkashActive] = await Promise.all([
    isPaymentMethodEnabled("COD"),
    isPaymentMethodEnabled("ONLINE"),
    isPaymentMethodEnabled("BKASH"),
  ]);

  const options: StorefrontPaymentOption[] = [];

  if (codActive) {
    options.push({
      value: "COD",
      title: "Cash on delivery",
      detail: "Pay when your order arrives.",
    });
  }

  if (onlineActive) {
    options.push({
      value: "ONLINE",
      title: "Online payment",
      detail: "Pay securely via cards, internet banking, or mobile banking.",
    });
  }

  if (bkashActive) {
    options.push({
      value: "BKASH",
      title: "bKash",
      detail: "Pay directly with your bKash wallet.",
    });
  }

  return options;
}

/**
 * Returns the administrative settings overview.
 */
export async function getPaymentSettingsOverview(): Promise<PaymentSettingsOverview> {
  const isSslcommerzConfigured = Boolean(
    env.SSLCOMMERZ_STORE_ID?.trim() && env.SSLCOMMERZ_STORE_PASSWORD?.trim()
  );
  const isBkashConfigured = isBkashCredentialConfigured();

  let dbRecords: PaymentMethodSetting[] = [];
  let isTableMigrated = false;

  try {
    dbRecords = await prisma.paymentMethodSetting.findMany();
    isTableMigrated = true;
  } catch (err: unknown) {
    if (isTableMissingError(err)) {
      isTableMigrated = false;
      dbRecords = [];
    } else {
      const message = err instanceof Error ? err.message : "Database error";
      console.error("[PaymentSettings] Database access failed in getPaymentSettingsOverview:", message);
      throw new Error("Database error while loading payment settings");
    }
  }

  const codRecord = dbRecords.find((r) => r.code === "COD");
  const sslRecord = dbRecords.find((r) => r.code === "SSLCOMMERZ");
  const bkashRecord = dbRecords.find((r) => r.code === "BKASH");
  const nagadRecord = dbRecords.find((r) => r.code === "NAGAD");

  // Determine effective status using Strategy A bootstrap rules
  const codEnabled = codRecord ? codRecord.isEnabled : true;
  const sslEnabled = (sslRecord ? sslRecord.isEnabled : isSslcommerzConfigured) && isSslcommerzConfigured;
  const bkashEnabled = (bkashRecord ? bkashRecord.isEnabled : false) && isBkashConfigured;
  const nagadEnabled = nagadRecord ? nagadRecord.isEnabled : false;

  const methods: PaymentMethodStatus[] = [
    {
      code: "COD",
      name: "Cash on Delivery",
      description: "Allow customers to pay with cash upon receiving goods.",
      type: "OFFLINE",
      isEnabled: codEnabled,
      isConfigured: true,
      isPersisted: isTableMigrated && Boolean(codRecord),
      persistenceBlockerReason: isTableMigrated
        ? undefined
        : "Database migration pending approval.",
      checkoutImpact:
        "Orders are created in PENDING status. Inventory reservations are consumed immediately into SALE ledger entries upon checkout completion.",
    },
    {
      code: "SSLCOMMERZ",
      name: "SSLCOMMERZ Gateway",
      description: "Accept cards, mobile banking, and net banking via SSLCOMMERZ hosted checkout.",
      type: "ONLINE_GATEWAY",
      isEnabled: sslEnabled,
      isConfigured: isSslcommerzConfigured,
      isPersisted: isTableMigrated && Boolean(sslRecord),
      environmentMode: isSslcommerzConfigured
        ? env.SSLCOMMERZ_SANDBOX
          ? "sandbox"
          : "production"
        : "unconfigured",
      persistenceBlockerReason: isTableMigrated
        ? undefined
        : "Database migration pending approval.",
      checkoutImpact:
        "Customer is redirected to SSLCOMMERZ gateway. Inventory reservations are held until verified callback/IPN settles the transaction.",
    },
    {
      code: "BKASH",
      name: "Direct bKash Checkout",
      description: "Direct tokenized bKash wallet checkout via official Tokenized API v1.2.0.",
      type: "MFS_DIRECT",
      isEnabled: bkashEnabled,
      isConfigured: isBkashConfigured,
      isPersisted: isTableMigrated && Boolean(bkashRecord),
      environmentMode: isBkashConfigured
        ? env.BKASH_SANDBOX
          ? "sandbox"
          : "production"
        : "unconfigured",
      persistenceBlockerReason: isTableMigrated
        ? undefined
        : "Database migration pending approval.",
      checkoutImpact:
        "When active, allows seamless 1-click or PIN/OTP wallet payments without third-party redirection.",
    },
    {
      code: "NAGAD",
      name: "Nagad Gateway",
      description: "Accept direct payments from Nagad mobile banking accounts.",
      type: "MFS_DIRECT",
      isEnabled: nagadEnabled,
      isConfigured: false,
      isPersisted: isTableMigrated && Boolean(nagadRecord),
      environmentMode: "unconfigured",
      persistenceBlockerReason: "Future provider integration hook.",
      checkoutImpact: "Not yet available in checkout.",
    },
  ];

  const serverEnforcedMethodCount = methods.filter((m) => m.isEnabled).length;

  return {
    methods,
    hasPersistenceStore: isTableMigrated,
    persistenceBlocker: isTableMigrated
      ? undefined
      : "Database migration (20261013_payment_method_settings) is pending execution. Settings operate via safe Strategy A runtime bootstrap defaults.",
    serverEnforcedMethodCount,
  };
}

/**
 * Updates a payment method setting in the database with audit logging.
 */
export async function updatePaymentMethodSetting(
  code: PaymentMethodCode,
  isEnabled: boolean,
  actorId?: string
): Promise<{ success: boolean; error?: string }> {
  // Validate allowed codes
  if (code !== "COD" && code !== "SSLCOMMERZ" && code !== "BKASH") {
    return {
      success: false,
      error: `Payment method ${code} cannot be toggled at this stage.`,
    };
  }

  // Credential guard
  if (code === "SSLCOMMERZ" && isEnabled) {
    const isSslcommerzConfigured = Boolean(
      env.SSLCOMMERZ_STORE_ID?.trim() && env.SSLCOMMERZ_STORE_PASSWORD?.trim()
    );
    if (!isSslcommerzConfigured) {
      return {
        success: false,
        error: "Cannot enable SSLCOMMERZ without configured store credentials in environment.",
      };
    }
  }

  if (code === "BKASH" && isEnabled) {
    if (!isBkashCredentialConfigured()) {
      return {
        success: false,
        error: "Cannot enable bKash without configured credentials in environment.",
      };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.paymentMethodSetting.findUnique({ where: { code } });

      const updated = await tx.paymentMethodSetting.upsert({
        where: { code },
        update: { isEnabled },
        create: {
          code,
          name:
            code === "COD"
              ? "Cash on Delivery"
              : code === "SSLCOMMERZ"
              ? "SSLCOMMERZ Gateway"
              : "Direct bKash Checkout",
          isEnabled,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actorId ?? null,
          action: "PAYMENT_METHOD_SETTING_UPDATED",
          entityType: "PaymentMethodSetting",
          entityId: updated.id,
          metadata: {
            code,
            previousState: existing ? existing.isEnabled : "UNINITIALIZED",
            newState: isEnabled,
          },
        },
      });
    });

    revalidatePath("/admin/settings/payments");
    revalidatePath("/checkout");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database update failed";
    console.error("[PaymentSettings] Failed to update payment setting:", message);
    return { success: false, error: message };
  }
}
