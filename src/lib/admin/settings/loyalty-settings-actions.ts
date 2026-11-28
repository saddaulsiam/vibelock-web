"use server";

import { requireRole } from "@/lib/auth/authorization";
import {
  LoyaltyProgramSettingsSchema,
  updateLoyaltySettings,
  getLoyaltySettings,
} from "@/lib/settings/loyalty-settings";
import { revalidatePath } from "next/cache";

export interface LoyaltySettingsActionState {
  error: string | null;
  message?: string | null;
  fieldErrors?: Record<string, string[]>;
}

export async function updateLoyaltySettingsAction(
  _prevState: LoyaltySettingsActionState,
  formData: FormData
): Promise<LoyaltySettingsActionState> {
  try {
    const admin = await requireRole("ADMIN", { throw: true });
    const { settings: current } = await getLoyaltySettings();

    const raw = {
      enabled: formData.has("enabled") ? formData.get("enabled") === "true" : current.enabled,
      spendAmountPerPoint: formData.has("spendAmountPerPoint")
        ? formData.get("spendAmountPerPoint")
        : current.spendAmountPerPoint,
      pointRedemptionValue: formData.has("pointRedemptionValue")
        ? formData.get("pointRedemptionValue")
        : current.pointRedemptionValue,
      minPointsToRedeem: formData.has("minPointsToRedeem")
        ? formData.get("minPointsToRedeem")
        : current.minPointsToRedeem,
      maxCartDiscountPercentage: formData.has("maxCartDiscountPercentage")
        ? formData.get("maxCartDiscountPercentage")
        : current.maxCartDiscountPercentage,
      silverThreshold: formData.has("silverThreshold")
        ? formData.get("silverThreshold")
        : current.silverThreshold,
      goldThreshold: formData.has("goldThreshold")
        ? formData.get("goldThreshold")
        : current.goldThreshold,
      platinumThreshold: formData.has("platinumThreshold")
        ? formData.get("platinumThreshold")
        : current.platinumThreshold,
      enableInPos: formData.has("enableInPos")
        ? formData.get("enableInPos") === "true"
        : current.enableInPos,
      enableOnline: formData.has("enableOnline")
        ? formData.get("enableOnline") === "true"
        : current.enableOnline,
    };

    const parsed = LoyaltyProgramSettingsSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".");
        if (!fieldErrors[path]) {
          fieldErrors[path] = [];
        }
        fieldErrors[path].push(issue.message);
      }
      return {
        error: "Please correct the invalid loyalty program fields below.",
        fieldErrors,
      };
    }

    const result = await updateLoyaltySettings(parsed.data, admin.id);
    if (!result.success) {
      return {
        error: result.error || "Failed to update loyalty program settings.",
      };
    }

    revalidatePath("/admin/settings/loyalty");
    revalidatePath("/pos");

    return {
      error: null,
      message: "Loyalty program rules, points earning rates, and tier thresholds updated successfully.",
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update loyalty settings.",
    };
  }
}
