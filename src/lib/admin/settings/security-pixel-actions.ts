"use server";

import { requireRole } from "@/lib/auth/authorization";
import {
  SecurityPixelSettingsSchema,
  updateSecurityPixelSettings,
  getSecurityPixelSettings,
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

  const rawIps = formData.get("adminIpAllowlist")?.toString()?.trim() || "";
  const ipList = rawIps
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);

  let metaCapiToken = formData.get("metaCapiAccessToken")?.toString()?.trim() || "";

  // If masked placeholder was submitted, retain previously stored token
  if (metaCapiToken.includes("••••••••")) {
    const { settings: current } = await getSecurityPixelSettings();
    metaCapiToken = current.metaCapiAccessToken;
  }

  const raw = {
    metaPixelId: formData.get("metaPixelId")?.toString()?.trim() || "",
    metaCapiAccessToken: metaCapiToken,
    metaTestEventCode: formData.get("metaTestEventCode")?.toString()?.trim() || "",
    googleTagManagerId: formData.get("googleTagManagerId")?.toString()?.trim() || "",
    googleAnalyticsId: formData.get("googleAnalyticsId")?.toString()?.trim() || "",
    tiktokPixelId: formData.get("tiktokPixelId")?.toString()?.trim() || "",
    trackEcommerceEvents: formData.get("trackEcommerceEvents") === "true",
    adminSessionTimeoutMinutes: formData.get("adminSessionTimeoutMinutes"),
    enforceAdmin2FA: formData.get("enforceAdmin2FA") === "true",
    adminIpAllowlist: ipList,
    notifyFailedAdminLogin: formData.get("notifyFailedAdminLogin") === "true",
    securityContactEmail:
      formData.get("securityContactEmail")?.toString()?.trim() || "security@vibelock.com",
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
    message: "Marketing tracking pixels, Google Tag Manager, and admin security controls updated successfully.",
  };
}
