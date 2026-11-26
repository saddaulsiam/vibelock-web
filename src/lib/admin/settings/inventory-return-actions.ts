"use server";

import { requireRole } from "@/lib/auth/authorization";
import {
  InventoryReturnSettingsSchema,
  updateInventoryReturnSettings,
} from "@/lib/settings/inventory-return-settings";
import { revalidatePath } from "next/cache";

export interface InventoryReturnActionState {
  error: string | null;
  message?: string | null;
  fieldErrors?: Record<string, string[]>;
}

export async function updateInventoryReturnSettingsAction(
  _prevState: InventoryReturnActionState,
  formData: FormData
): Promise<InventoryReturnActionState> {
  const admin = await requireRole("ADMIN", { throw: true });

  const rawCategories = formData.get("nonReturnableCategories")?.toString()?.trim() || "";
  const categoriesList = rawCategories
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  const raw = {
    lowStockThreshold: formData.get("lowStockThreshold"),
    criticalStockThreshold: formData.get("criticalStockThreshold"),
    allowBackorders: formData.get("allowBackorders") === "true",
    autoHideOutOfStock: formData.get("autoHideOutOfStock") === "true",
    notifyLowStockEmail: formData.get("notifyLowStockEmail") === "true",
    lowStockNotificationEmail:
      formData.get("lowStockNotificationEmail")?.toString()?.trim() || "inventory@vibelock.com",
    returnWindowDays: formData.get("returnWindowDays"),
    requirePhotoProofOnDefect: formData.get("requirePhotoProofOnDefect") === "true",
    allowPartialReturns: formData.get("allowPartialReturns") === "true",
    nonReturnableCategories: categoriesList,
    deductShippingFeeFromRefund: formData.get("deductShippingFeeFromRefund") === "true",
    returnProcessingFee: formData.get("returnProcessingFee"),
    autoRestockCompletedReturns: formData.get("autoRestockCompletedReturns") === "true",
    restockLocation: formData.get("restockLocation")?.toString()?.trim() || "Uttara Central Warehouse",
  };

  const parsed = InventoryReturnSettingsSchema.safeParse(raw);
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
      error: "Please correct the invalid inventory and return policy fields below.",
      fieldErrors,
    };
  }

  const result = await updateInventoryReturnSettings(parsed.data, admin.id);
  if (!result.success) {
    return {
      error: result.error || "Failed to update inventory and return policies.",
    };
  }

  revalidatePath("/admin/settings/policies");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/returns");

  return {
    error: null,
    message: "Inventory threshold alerts and customer return policies updated successfully.",
  };
}
