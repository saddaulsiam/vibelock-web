import "server-only";

import { z } from "zod";
import prisma from "@/lib/prisma/client";

export const LoyaltyProgramSettingsSchema = z.object({
  enabled: z.boolean().default(true),

  // Point earning rules
  spendAmountPerPoint: z.coerce
    .number()
    .min(10, "Spend amount per point must be at least ৳10")
    .max(10000, "Spend amount per point cannot exceed ৳10,000")
    .default(100),

  // Point redemption conversion
  pointRedemptionValue: z.coerce
    .number()
    .min(0.1, "Point redemption value must be at least ৳0.10")
    .max(100, "Point redemption value cannot exceed ৳100")
    .default(1),

  // Redemption guardrails
  minPointsToRedeem: z.coerce
    .number()
    .min(0, "Minimum points cannot be negative")
    .default(0),

  maxCartDiscountPercentage: z.coerce
    .number()
    .min(1, "Max cart discount must be at least 1%")
    .max(100, "Max cart discount cannot exceed 100%")
    .default(100),

  // Customer Tier qualification (Lifetime Spend in BDT)
  silverThreshold: z.coerce
    .number()
    .min(500, "Silver tier spend threshold must be at least ৳500")
    .default(5000),

  goldThreshold: z.coerce
    .number()
    .min(1000, "Gold tier spend threshold must be at least ৳1,000")
    .default(20000),

  platinumThreshold: z.coerce
    .number()
    .min(2000, "Platinum tier spend threshold must be at least ৳2,000")
    .default(50000),

  // Channel availability
  enableInPos: z.boolean().default(true),
  enableOnline: z.boolean().default(true),
});

export type LoyaltyProgramSettings = z.output<typeof LoyaltyProgramSettingsSchema>;

/**
 * Strategy A verified runtime defaults for loyalty program settings.
 */
export function getDefaultLoyaltySettings(): LoyaltyProgramSettings {
  return {
    enabled: true,
    spendAmountPerPoint: 100,
    pointRedemptionValue: 1,
    minPointsToRedeem: 0,
    maxCartDiscountPercentage: 100,
    silverThreshold: 5000,
    goldThreshold: 20000,
    platinumThreshold: 50000,
    enableInPos: true,
    enableOnline: true,
  };
}

/**
 * Returns current loyalty program settings from the LoyaltySetting table.
 * Falls back to Strategy A defaults if no row exists yet.
 */
export async function getLoyaltySettings(): Promise<{
  settings: LoyaltyProgramSettings;
  isPersisted: boolean;
}> {
  const row = await prisma.loyaltySetting.findFirst();
  if (!row) {
    return { settings: getDefaultLoyaltySettings(), isPersisted: false };
  }

  const settings: LoyaltyProgramSettings = {
    enabled: row.enabled,
    spendAmountPerPoint: row.spendAmountPerPoint,
    pointRedemptionValue: Number(row.pointRedemptionValue),
    minPointsToRedeem: row.minPointsToRedeem,
    maxCartDiscountPercentage: row.maxCartDiscountPercentage,
    silverThreshold: Number(row.silverThreshold),
    goldThreshold: Number(row.goldThreshold),
    platinumThreshold: Number(row.platinumThreshold),
    enableInPos: row.enableInPos,
    enableOnline: row.enableOnline,
  };
  return { settings, isPersisted: true };
}

/**
 * Upserts loyalty program settings in the LoyaltySetting table with audit logging.
 */
export async function updateLoyaltySettings(
  settings: LoyaltyProgramSettings,
  actorId?: string
): Promise<{ success: boolean; data?: LoyaltyProgramSettings; error?: string }> {
  try {
    const parsed = LoyaltyProgramSettingsSchema.parse(settings);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.loyaltySetting.findFirst({ select: { id: true } });
      const targetId = existing?.id ?? "singleton";

      await tx.loyaltySetting.upsert({
        where: { id: targetId },
        create: {
          id: targetId,
          enabled: parsed.enabled,
          spendAmountPerPoint: parsed.spendAmountPerPoint,
          pointRedemptionValue: parsed.pointRedemptionValue,
          minPointsToRedeem: parsed.minPointsToRedeem,
          maxCartDiscountPercentage: parsed.maxCartDiscountPercentage,
          silverThreshold: parsed.silverThreshold,
          goldThreshold: parsed.goldThreshold,
          platinumThreshold: parsed.platinumThreshold,
          enableInPos: parsed.enableInPos,
          enableOnline: parsed.enableOnline,
          updatedBy: actorId,
        },
        update: {
          enabled: parsed.enabled,
          spendAmountPerPoint: parsed.spendAmountPerPoint,
          pointRedemptionValue: parsed.pointRedemptionValue,
          minPointsToRedeem: parsed.minPointsToRedeem,
          maxCartDiscountPercentage: parsed.maxCartDiscountPercentage,
          silverThreshold: parsed.silverThreshold,
          goldThreshold: parsed.goldThreshold,
          platinumThreshold: parsed.platinumThreshold,
          enableInPos: parsed.enableInPos,
          enableOnline: parsed.enableOnline,
          updatedBy: actorId,
        },
      });

      if (actorId) {
        await tx.auditLog.create({
          data: {
            actorId,
            action: "LOYALTY_SETTINGS_UPDATED",
            entityType: "LoyaltySetting",
            entityId: targetId,
            metadata: {
              spendAmountPerPoint: parsed.spendAmountPerPoint,
              pointRedemptionValue: parsed.pointRedemptionValue,
              silverThreshold: parsed.silverThreshold,
              goldThreshold: parsed.goldThreshold,
              platinumThreshold: parsed.platinumThreshold,
              enabled: parsed.enabled,
            },
          },
        });
      }
    });

    return { success: true, data: parsed };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update loyalty settings.",
    };
  }
}
