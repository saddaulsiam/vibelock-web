"use server";

import { requireRole } from "@/lib/auth/authorization";
import {
  GeneralStoreSettingsSchema,
  updateGeneralStoreSettings,
} from "@/lib/settings/store-settings-service";

export interface GeneralSettingsActionState {
  error: string | null;
  message?: string | null;
  fieldErrors?: Record<string, string[]>;
}

export async function updateGeneralSettingsAction(
  _prevState: GeneralSettingsActionState,
  formData: FormData
): Promise<GeneralSettingsActionState> {
  const admin = await requireRole("ADMIN", { throw: true });

  const raw = {
    storeName: formData.get("storeName")?.toString()?.trim() || "",
    legalBusinessName: formData.get("legalBusinessName")?.toString()?.trim() || "",
    dbidNumber: formData.get("dbidNumber")?.toString()?.trim() || "",
    tradeLicenseNumber: formData.get("tradeLicenseNumber")?.toString()?.trim() || "",
    binNumber: formData.get("binNumber")?.toString()?.trim() || "",
    supportPhone: formData.get("supportPhone")?.toString()?.trim() || "",
    whatsappNumber: formData.get("whatsappNumber")?.toString()?.trim() || "",
    supportEmail: formData.get("supportEmail")?.toString()?.trim() || "",
    warehouseAddress: formData.get("warehouseAddress")?.toString()?.trim() || "",
    currency: formData.get("currency")?.toString()?.trim() || "BDT",
    timezone: formData.get("timezone")?.toString()?.trim() || "Asia/Dhaka",
    maintenanceMode: {
      enabled: formData.get("maintenanceMode_enabled") === "true",
      noticeTitle: formData.get("maintenanceMode_noticeTitle")?.toString()?.trim() || "Store Under Scheduled Maintenance",
      noticeMessage: formData.get("maintenanceMode_noticeMessage")?.toString()?.trim() || "We are currently performing routine upgrades. We will be back online shortly.",
      allowAdminBypass: formData.get("maintenanceMode_allowAdminBypass") !== "false",
    },
    holidayMode: {
      enabled: formData.get("holidayMode_enabled") === "true",
      bannerText: formData.get("holidayMode_bannerText")?.toString()?.trim() || "Holiday Notice: Deliveries will be temporarily paused and resume right after the holidays.",
      expectedDispatchDate: formData.get("holidayMode_expectedDispatchDate")?.toString()?.trim() || "",
    },
  };

  const parsed = GeneralStoreSettingsSchema.safeParse(raw);
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
      error: "Please correct the invalid fields below.",
      fieldErrors,
    };
  }

  const result = await updateGeneralStoreSettings(parsed.data, admin.id);
  if (!result.success) {
    return {
      error: result.error || "Failed to update general store settings.",
    };
  }

  return {
    error: null,
    message: "Store identity, legal compliance, and emergency settings updated successfully.",
  };
}
