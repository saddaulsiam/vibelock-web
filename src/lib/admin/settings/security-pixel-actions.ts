"use server";

import { requireRole } from "@/lib/auth/authorization";
import {
  getSecurityPixelSettings,
  SecurityPixelSettingsSchema,
  updateSecurityPixelSettings,
} from "@/lib/settings/security-pixel-settings";
import { revalidatePath } from "next/cache";

export interface SecurityPixelActionState {
  error: string | null;
  message?: string | null;
  fieldErrors?: Record<string, string[]>;
}

export async function updateSecurityPixelSettingsAction(
  _prevState: SecurityPixelActionState,
  formData: FormData
): Promise<SecurityPixelActionState> {
  const admin = await requireRole("ADMIN", { throw: true });
  const { settings: current } = await getSecurityPixelSettings();

  const rawIps = formData.has("adminIpAllowlist")
    ? formData.get("adminIpAllowlist")?.toString()?.trim() || ""
    : current.adminIpAllowlist.join(", ");
  const ipList = rawIps
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);

  let metaCapiToken = formData.has("metaCapiAccessToken")
    ? formData.get("metaCapiAccessToken")?.toString()?.trim() || ""
    : current.metaCapiAccessToken;

  // If masked placeholder was submitted, retain previously stored token
  if (metaCapiToken.includes("••••••••")) {
    metaCapiToken = current.metaCapiAccessToken;
  }

  const raw = {
    metaPixelId: formData.has("metaPixelId")
      ? formData.get("metaPixelId")?.toString()?.trim() || ""
      : current.metaPixelId,
    metaCapiAccessToken: metaCapiToken,
    metaTestEventCode: formData.has("metaTestEventCode")
      ? formData.get("metaTestEventCode")?.toString()?.trim() || ""
      : current.metaTestEventCode,
    googleTagManagerId: formData.has("googleTagManagerId")
      ? formData.get("googleTagManagerId")?.toString()?.trim() || ""
      : current.googleTagManagerId,
    googleAnalyticsId: formData.has("googleAnalyticsId")
      ? formData.get("googleAnalyticsId")?.toString()?.trim() || ""
      : current.googleAnalyticsId,
    tiktokPixelId: formData.has("tiktokPixelId")
      ? formData.get("tiktokPixelId")?.toString()?.trim() || ""
      : current.tiktokPixelId,
    trackEcommerceEvents: formData.has("trackEcommerceEvents")
      ? formData.get("trackEcommerceEvents") === "true"
      : current.trackEcommerceEvents,
    adminSessionTimeoutMinutes: formData.has("adminSessionTimeoutMinutes")
      ? formData.get("adminSessionTimeoutMinutes")
      : current.adminSessionTimeoutMinutes,
    enforceAdmin2FA: formData.has("enforceAdmin2FA")
      ? formData.get("enforceAdmin2FA") === "true"
      : current.enforceAdmin2FA,
    adminIpAllowlist: ipList,
    notifyFailedAdminLogin: formData.has("notifyFailedAdminLogin")
      ? formData.get("notifyFailedAdminLogin") === "true"
      : current.notifyFailedAdminLogin,
    securityContactEmail: formData.has("securityContactEmail")
      ? formData.get("securityContactEmail")?.toString()?.trim() || "security@vibelock.com"
      : current.securityContactEmail,
  };

  const parsed = SecurityPixelSettingsSchema.safeParse(raw);
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
      error: "Please correct the invalid tracking pixels and security fields below.",
      fieldErrors,
    };
  }

  const result = await updateSecurityPixelSettings(parsed.data, admin.id);
  if (!result.success) {
    return {
      error: result.error || "Failed to update tracking pixels and admin security configuration.",
    };
  }

  revalidatePath("/admin/settings/security");
  revalidatePath("/admin");

  return {
    error: null,
    message:
      "Marketing tracking pixels, Google Tag Manager, and admin security controls updated successfully.",
  };
}
