"use server";

import { requireRole } from "@/lib/auth/authorization";
import {
  getInventoryReturnSettings,
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
  const { settings: current } = await getInventoryReturnSettings();

  const rawCategories = formData.has("nonReturnableCategories")
    ? formData.get("nonReturnableCategories")?.toString()?.trim() || ""
    : current.nonReturnableCategories.join(", ");
  const categoriesList = rawCategories
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  const raw = {
    lowStockThreshold: formData.has("lowStockThreshold")
      ? formData.get("lowStockThreshold")
      : current.lowStockThreshold,
    criticalStockThreshold: formData.has("criticalStockThreshold")
      ? formData.get("criticalStockThreshold")
      : current.criticalStockThreshold,
    allowBackorders: formData.has("allowBackorders")
      ? formData.get("allowBackorders") === "true"
      : current.allowBackorders,
    autoHideOutOfStock: formData.has("autoHideOutOfStock")
      ? formData.get("autoHideOutOfStock") === "true"
      : current.autoHideOutOfStock,
    notifyLowStockEmail: formData.has("notifyLowStockEmail")
      ? formData.get("notifyLowStockEmail") === "true"
      : current.notifyLowStockEmail,
    lowStockNotificationEmail: formData.has("lowStockNotificationEmail")
      ? formData.get("lowStockNotificationEmail")?.toString()?.trim() || "inventory@vibelock.com"
      : current.lowStockNotificationEmail,
    returnWindowDays: formData.has("returnWindowDays")
      ? formData.get("returnWindowDays")
      : current.returnWindowDays,
    requirePhotoProofOnDefect: formData.has("requirePhotoProofOnDefect")
      ? formData.get("requirePhotoProofOnDefect") === "true"
      : current.requirePhotoProofOnDefect,
    allowPartialReturns: formData.has("allowPartialReturns")
      ? formData.get("allowPartialReturns") === "true"
      : current.allowPartialReturns,
    nonReturnableCategories: categoriesList,
    deductShippingFeeFromRefund: formData.has("deductShippingFeeFromRefund")
      ? formData.get("deductShippingFeeFromRefund") === "true"
      : current.deductShippingFeeFromRefund,
    returnProcessingFee: formData.has("returnProcessingFee")
      ? formData.get("returnProcessingFee")
      : current.returnProcessingFee,
    autoRestockCompletedReturns: formData.has("autoRestockCompletedReturns")
      ? formData.get("autoRestockCompletedReturns") === "true"
      : current.autoRestockCompletedReturns,
    restockLocation: formData.has("restockLocation")
      ? formData.get("restockLocation")?.toString()?.trim() || "Uttara Central Warehouse"
      : current.restockLocation,
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
