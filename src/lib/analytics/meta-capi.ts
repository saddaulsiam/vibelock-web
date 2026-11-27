import type {
  MetaCapiEvent,
  MetaCapiPayload,
  MetaCapiResponse,
} from "./meta-types";

const META_GRAPH_API_VERSION = "v21.0";

/**
 * Dispatches a server-side event to Meta Conversions API (CAPI).
 * - Fully non-blocking with 4s timeout.
 * - Gracefully skips execution if Meta Pixel ID or CAPI Access Token is missing.
 * - Respects META_TEST_EVENT_CODE if configured in environment.
 */
export async function sendMetaCapiEvent(
  event: MetaCapiEvent
): Promise<MetaCapiResponse | null> {
  let pixelId =
    process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.META_PIXEL_ID;
  let accessToken =
    process.env.META_CONVERSIONS_API_ACCESS_TOKEN ||
    process.env.META_ACCESS_TOKEN;
  let testEventCode = process.env.META_TEST_EVENT_CODE?.trim();

  try {
    const { getSecurityPixelSettings } = await import(
      "@/lib/settings/security-pixel-settings"
    );
    const { settings: secSettings } = await getSecurityPixelSettings();
    if (secSettings.metaPixelId?.trim()) {
      pixelId = secSettings.metaPixelId.trim();
    }
    if (secSettings.metaCapiAccessToken?.trim()) {
      accessToken = secSettings.metaCapiAccessToken.trim();
    }
    if (secSettings.metaTestEventCode?.trim()) {
      testEventCode = secSettings.metaTestEventCode.trim();
    }
  } catch {
    // Graceful fallback to env vars
  }

  // Gracefully skip if credentials are not configured (e.g. in local/test environments)
  if (!pixelId || !accessToken) {
    if (process.env.NODE_ENV === "development") {
      console.info(
        `[Meta CAPI] Skipping ${event.event_name} - Missing NEXT_PUBLIC_META_PIXEL_ID or META_CONVERSIONS_API_ACCESS_TOKEN.`
      );
    }
    return null;
  }

  const payload: MetaCapiPayload = {
    data: [
      {
        ...event,
        action_source: event.action_source || "website",
        event_time: event.event_time || Math.floor(Date.now() / 1000),
        data_processing_options: event.data_processing_options || [],
        data_processing_options_country:
          event.data_processing_options_country ?? 0,
        data_processing_options_state: event.data_processing_options_state ?? 0,
      },
    ],
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
  };

  const endpoint = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(
    accessToken
  )}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const json: MetaCapiResponse = await response.json().catch(() => ({}));

    if (!response.ok || json.error) {
      console.warn(
        `[Meta CAPI Error] Failed to send ${event.event_name} (HTTP ${response.status}):`,
        json.error?.message || "Unknown error"
      );
      return json;
    }

    if (process.env.NODE_ENV === "development") {
      console.info(
        `[Meta CAPI Success] Sent ${event.event_name} (Event ID: ${event.event_id}) - Received: ${json.events_received}`
      );
    }

    return json;
  } catch (error) {
    // Never crash caller if CAPI network call fails or times out
    console.warn(
      `[Meta CAPI Network Exception] Failed sending ${event.event_name}:`,
      error instanceof Error ? error.message : "Unknown error"
    );
    return null;
  }
}
