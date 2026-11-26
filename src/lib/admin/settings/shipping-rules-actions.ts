"use server";

import { requireRole } from "@/lib/auth/authorization";
import {
  ShippingRulesSettingsSchema,
  updateShippingRulesSettings,
} from "@/lib/settings/shipping-rules-settings";
import { revalidatePath } from "next/cache";

export interface ShippingRulesActionState {
  error: string | null;
  message?: string | null;
  fieldErrors?: Record<string, string[]>;
}

export async function updateShippingRulesAction(
  _prevState: ShippingRulesActionState,
  formData: FormData
): Promise<ShippingRulesActionState> {
  const admin = await requireRole("ADMIN", { throw: true });

  const raw = {
    enableFreeShipping: formData.get("enableFreeShipping") === "true",
    freeShippingThreshold: formData.get("freeShippingThreshold"),
    freeShippingScope: formData.get("freeShippingScope")?.toString()?.trim() || "NATIONWIDE",
    freeShippingBannerText: formData.get("freeShippingBannerText")?.toString()?.trim() || "",
    pickupHubName: formData.get("pickupHubName")?.toString()?.trim() || "",
    pickupAddress: formData.get("pickupAddress")?.toString()?.trim() || "",
    contactPerson: formData.get("contactPerson")?.toString()?.trim() || "",
    contactPhone: formData.get("contactPhone")?.toString()?.trim() || "",
    insideDhakaSla: formData.get("insideDhakaSla")?.toString()?.trim() || "24–48 Hours",
    outsideDhakaSla: formData.get("outsideDhakaSla")?.toString()?.trim() || "3–5 Business Days",
    expressDhakaSla: formData.get("expressDhakaSla")?.toString()?.trim() || "Same-Day / 24 Hours",
    primaryCourier: formData.get("primaryCourier")?.toString()?.trim() || "STEADFAST",
    autoCreateConsignment: formData.get("autoCreateConsignment") === "true",
  };

  const parsed = ShippingRulesSettingsSchema.safeParse(raw);
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
      error: "Please correct the invalid shipping configuration fields below.",
      fieldErrors,
    };
  }

  const result = await updateShippingRulesSettings(parsed.data, admin.id);
  if (!result.success) {
    return {
      error: result.error || "Failed to update shipping rules settings.",
    };
  }

  revalidatePath("/admin/settings/shipping");
  revalidatePath("/checkout");
  revalidatePath("/cart");

  return {
    error: null,
    message: "Free shipping rules, courier dispatch hub, and delivery SLA promises updated successfully.",
  };
}
