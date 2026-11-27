"use server";

import { requireRole } from "@/lib/auth/authorization";
import {
  GeneralStoreSettingsSchema,
  updateGeneralStoreSettings,
  getGeneralStoreSettings,
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
  const { settings: current } = await getGeneralStoreSettings();

  const raw = {
    storeName: formData.has("storeName")
      ? formData.get("storeName")?.toString()?.trim() || ""
      : current.storeName,
    legalBusinessName: formData.has("legalBusinessName")
      ? formData.get("legalBusinessName")?.toString()?.trim() || ""
      : current.legalBusinessName,
    dbidNumber: formData.has("dbidNumber")
      ? formData.get("dbidNumber")?.toString()?.trim() || ""
      : current.dbidNumber,
    tradeLicenseNumber: formData.has("tradeLicenseNumber")
      ? formData.get("tradeLicenseNumber")?.toString()?.trim() || ""
      : current.tradeLicenseNumber,
    binNumber: formData.has("binNumber")
      ? formData.get("binNumber")?.toString()?.trim() || ""
      : current.binNumber,
    supportPhone: formData.has("supportPhone")
      ? formData.get("supportPhone")?.toString()?.trim() || ""
      : current.supportPhone,
    whatsappNumber: formData.has("whatsappNumber")
      ? formData.get("whatsappNumber")?.toString()?.trim() || ""
      : current.whatsappNumber,
    supportEmail: formData.has("supportEmail")
      ? formData.get("supportEmail")?.toString()?.trim() || ""
      : current.supportEmail,
    warehouseAddress: formData.has("warehouseAddress")
      ? formData.get("warehouseAddress")?.toString()?.trim() || ""
      : current.warehouseAddress,
    currency: formData.has("currency")
      ? formData.get("currency")?.toString()?.trim() || "BDT"
      : current.currency,
    timezone: formData.has("timezone")
      ? formData.get("timezone")?.toString()?.trim() || "Asia/Dhaka"
      : current.timezone,
    maintenanceMode: {
      enabled: formData.has("maintenanceMode_enabled")
        ? formData.get("maintenanceMode_enabled") === "true"
        : current.maintenanceMode.enabled,
      noticeTitle: formData.has("maintenanceMode_noticeTitle")
        ? formData.get("maintenanceMode_noticeTitle")?.toString()?.trim() ||
          "Store Under Scheduled Maintenance"
        : current.maintenanceMode.noticeTitle,
      noticeMessage: formData.has("maintenanceMode_noticeMessage")
        ? formData.get("maintenanceMode_noticeMessage")?.toString()?.trim() ||
          "We are currently performing routine upgrades. We will be back online shortly."
        : current.maintenanceMode.noticeMessage,
      allowAdminBypass: formData.has("maintenanceMode_allowAdminBypass")
        ? formData.get("maintenanceMode_allowAdminBypass") !== "false"
        : current.maintenanceMode.allowAdminBypass,
    },
    holidayMode: {
      enabled: formData.has("holidayMode_enabled")
        ? formData.get("holidayMode_enabled") === "true"
        : current.holidayMode.enabled,
      bannerText: formData.has("holidayMode_bannerText")
        ? formData.get("holidayMode_bannerText")?.toString()?.trim() ||
          "Holiday Notice: Deliveries will be temporarily paused and resume right after the holidays."
        : current.holidayMode.bannerText,
      expectedDispatchDate: formData.has("holidayMode_expectedDispatchDate")
        ? formData.get("holidayMode_expectedDispatchDate")?.toString()?.trim() || ""
        : current.holidayMode.expectedDispatchDate,
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
