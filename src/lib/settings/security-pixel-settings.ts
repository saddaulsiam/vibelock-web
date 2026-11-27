import "server-only";

import {
  getStoreSetting,
  updateStoreSetting,
  STORE_SETTING_KEYS,
} from "./store-settings-service";
import { z } from "zod";

// ============================================================================
// PHASE 7: ANALYTICS, TRACKING PIXELS & ADMIN SECURITY SCHEMA
// ============================================================================

export const SecurityPixelSettingsSchema = z.object({
  // Marketing & Conversion Pixels
  metaPixelId: z.string().optional().default(""),
  metaCapiAccessToken: z.string().optional().default(""),
  metaTestEventCode: z.string().optional().default(""),
  googleTagManagerId: z.string().optional().default(""),
  googleAnalyticsId: z.string().optional().default(""),
  tiktokPixelId: z.string().optional().default(""),
  trackEcommerceEvents: z.boolean().default(true),

  // Admin Security Controls
  adminSessionTimeoutMinutes: z.coerce
    .number()
    .int("Timeout must be an integer")
    .min(5, "Minimum timeout is 5 minutes")
    .max(1440, "Maximum timeout is 1440 minutes (24 hours)")
    .default(60),
  enforceAdmin2FA: z.boolean().default(false),
  adminIpAllowlist: z
    .array(z.string().min(1, "IP address cannot be empty"))
    .default([]),
  notifyFailedAdminLogin: z.boolean().default(true),
  securityContactEmail: z
    .string()
    .email("Enter a valid security contact email")
    .optional()
    .or(z.literal(""))
    .default("security@vibelock.com"),
});

export type SecurityPixelSettings = z.output<typeof SecurityPixelSettingsSchema>;

// ============================================================================
// DEFAULTS & STRATEGY A FALLBACK
// ============================================================================

export function getDefaultSecurityPixelSettings(): SecurityPixelSettings {
  return {
    metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || "",
    metaCapiAccessToken: process.env.META_CAPI_ACCESS_TOKEN || "",
    metaTestEventCode: "",
    googleTagManagerId: process.env.NEXT_PUBLIC_GTM_ID || "",
    googleAnalyticsId: process.env.NEXT_PUBLIC_GA_ID || "",
    tiktokPixelId: "",
    trackEcommerceEvents: true,
    adminSessionTimeoutMinutes: 60,
    enforceAdmin2FA: false,
    adminIpAllowlist: [],
    notifyFailedAdminLogin: true,
    securityContactEmail: process.env.SECURITY_CONTACT_EMAIL || "security@vibelock.com",
  };
}

// ============================================================================
// DATA ACCESS & PERSISTENCE
// ============================================================================

/**
 * Retrieves effective tracking pixel and admin security settings with Strategy A fallback.
 */
export async function getSecurityPixelSettings(): Promise<{
  settings: SecurityPixelSettings;
  isPersisted: boolean;
  hasStore: boolean;
}> {
  const fallback = getDefaultSecurityPixelSettings();
  const res = await getStoreSetting<SecurityPixelSettings>(
    STORE_SETTING_KEYS.SECURITY,
    SecurityPixelSettingsSchema,
    fallback
  );
  return {
    settings: res.data,
    isPersisted: res.isPersisted,
    hasStore: res.hasStore,
  };
}

/**
 * Atomically updates tracking pixel and admin security settings with AuditLog recording.
 */
export async function updateSecurityPixelSettings(
  settings: SecurityPixelSettings,
  actorId?: string
): Promise<{ success: boolean; data?: SecurityPixelSettings; error?: string }> {
  return updateStoreSetting(
    STORE_SETTING_KEYS.SECURITY,
    settings,
    SecurityPixelSettingsSchema,
    actorId,
    "Marketing pixels (Meta, GTM, GA4, TikTok), admin session timeouts, and IP allowlists"
  );
}

// ============================================================================
// RUNTIME BUSINESS HELPERS
// ============================================================================

/**
 * Resolves effective marketing tracking identifiers (database override or env fallback).
 */
export async function resolveEffectiveTrackingPixels(): Promise<{
  metaPixelId: string;
  hasCapiToken: boolean;
  googleTagManagerId: string;
  googleAnalyticsId: string;
  tiktokPixelId: string;
  trackEcommerceEvents: boolean;
}> {
  const { settings } = await getSecurityPixelSettings();
  const metaPixelId =
    settings.metaPixelId.trim() || process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "";
  const capiToken =
    settings.metaCapiAccessToken.trim() || process.env.META_CAPI_ACCESS_TOKEN?.trim() || "";
  const gtmId =
    settings.googleTagManagerId.trim() || process.env.NEXT_PUBLIC_GTM_ID?.trim() || "";
  const gaId =
    settings.googleAnalyticsId.trim() || process.env.NEXT_PUBLIC_GA_ID?.trim() || "";
  const tiktokId = settings.tiktokPixelId.trim();

  return {
    metaPixelId,
    hasCapiToken: Boolean(capiToken),
    googleTagManagerId: gtmId,
    googleAnalyticsId: gaId,
    tiktokPixelId: tiktokId,
    trackEcommerceEvents: settings.trackEcommerceEvents,
  };
}

/**
 * Checks whether an incoming client IP address is permitted under active admin allowlist rules.
 */
export function isIpAllowedForAdmin(
  clientIp: string | null | undefined,
  settings: SecurityPixelSettings
): boolean {
  if (!settings.adminIpAllowlist || settings.adminIpAllowlist.length === 0) {
    // If allowlist is empty, access is unrestricted by IP
    return true;
  }

  if (!clientIp) {
    return false;
  }

  const cleanIp = clientIp.trim();
  return settings.adminIpAllowlist.some(
    (allowed) => allowed.trim() === cleanIp || allowed.trim() === "*"
  );
}
