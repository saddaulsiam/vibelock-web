"use server";

import { requireRole } from "@/lib/auth/authorization";
import {
  ShippingRulesSettingsSchema,
  updateShippingRulesSettings,
  getShippingRulesSettings,
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
  const { settings: current } = await getShippingRulesSettings();

  const raw = {
    enableFreeShipping: formData.has("enableFreeShipping")
      ? formData.get("enableFreeShipping") === "true"
      : current.enableFreeShipping,
    freeShippingThreshold: formData.has("freeShippingThreshold")
      ? formData.get("freeShippingThreshold")
      : current.freeShippingThreshold,
    freeShippingScope: formData.has("freeShippingScope")
      ? formData.get("freeShippingScope")?.toString()?.trim() || "NATIONWIDE"
      : current.freeShippingScope,
    freeShippingBannerText: formData.has("freeShippingBannerText")
      ? formData.get("freeShippingBannerText")?.toString()?.trim() || ""
      : current.freeShippingBannerText,
    pickupHubName: formData.has("pickupHubName")
      ? formData.get("pickupHubName")?.toString()?.trim() || ""
      : current.pickupHubName,
    pickupAddress: formData.has("pickupAddress")
      ? formData.get("pickupAddress")?.toString()?.trim() || ""
      : current.pickupAddress,
    contactPerson: formData.has("contactPerson")
      ? formData.get("contactPerson")?.toString()?.trim() || ""
      : current.contactPerson,
    contactPhone: formData.has("contactPhone")
      ? formData.get("contactPhone")?.toString()?.trim() || ""
      : current.contactPhone,
    insideDhakaSla: formData.has("insideDhakaSla")
      ? formData.get("insideDhakaSla")?.toString()?.trim() || "24–48 Hours"
      : current.insideDhakaSla,
    outsideDhakaSla: formData.has("outsideDhakaSla")
      ? formData.get("outsideDhakaSla")?.toString()?.trim() || "3–5 Business Days"
      : current.outsideDhakaSla,
    expressDhakaSla: formData.has("expressDhakaSla")
      ? formData.get("expressDhakaSla")?.toString()?.trim() || "Same-Day / 24 Hours"
      : current.expressDhakaSla,
    primaryCourier: formData.has("primaryCourier")
      ? formData.get("primaryCourier")?.toString()?.trim() || "STEADFAST"
      : current.primaryCourier,
    autoCreateConsignment: formData.has("autoCreateConsignment")
      ? formData.get("autoCreateConsignment") === "true"
      : current.autoCreateConsignment,
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
