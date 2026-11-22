import type { MetaCustomData, MetaPixelEventName } from "./meta-types";

declare global {
  interface Window {
    fbq?: {
      (action: "init", pixelId: string, advancedMatching?: Record<string, unknown>): void;
      (
        action: "track" | "trackCustom",
        eventName: string,
        data?: Record<string, unknown>,
        options?: { eventID?: string }
      ): void;
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[];
      loaded?: boolean;
      version?: string;
    };
    _fbq?: Window["fbq"];
  }
}

/**
 * Safely extracts Meta browser cookies (_fbp, _fbc) on client-side.
 */
export function getClientMetaCookies(): { fbp: string | null; fbc: string | null } {
  if (typeof document === "undefined") return { fbp: null, fbc: null };

  const getCookie = (name: string): string | null => {
    const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
    return match ? decodeURIComponent(match[2]) : null;
  };

  return {
    fbp: getCookie("_fbp"),
    fbc: getCookie("_fbc"),
  };
}

/**
 * Ensures window.fbq queue stub is initialized if not yet loaded.
 * Prevents dropping early events fired before fbevents.js downloads.
 */
function ensureFbqStub(): void {
  if (typeof window === "undefined") return;

  if (!window.fbq) {
    type FbqStub = ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue: unknown[];
      loaded?: boolean;
      version?: string;
    };

    const stub: FbqStub = function (...args: unknown[]) {
      if (stub.callMethod) {
        stub.callMethod(...args);
      } else {
        stub.queue.push(args);
      }
    };

    stub.queue = [];
    stub.loaded = true;
    stub.version = "2.0";

    window.fbq = stub as Window["fbq"];
    window._fbq = window.fbq;
  }
}

/**
 * Fires a client-side Meta Pixel event via window.fbq.
 * Includes optional eventID for server CAPI deduplication.
 */
export function trackMetaPixelEvent(
  eventName: MetaPixelEventName | string,
  customData?: MetaCustomData,
  options?: { eventID?: string }
): void {
  if (typeof window === "undefined") return;

  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId) return;

  ensureFbqStub();

  if (typeof window.fbq === "function") {
    if (options?.eventID) {
      window.fbq("track", eventName, customData, { eventID: options.eventID });
    } else {
      window.fbq("track", eventName, customData);
    }

    if (process.env.NODE_ENV === "development") {
      console.info(
        `[Meta Pixel Browser] Tracked ${eventName}`,
        options?.eventID ? `(EventID: ${options.eventID})` : "",
        customData
      );
    }
  }
}
