/**
 * Centralized Contact & WhatsApp configuration helper.
 * Dynamically resolves from NEXT_PUBLIC_PHONE_NUMBER in environment variables.
 */

export const DEFAULT_PHONE_NUMBER = "8801311333277";

/**
 * Returns digits-only WhatsApp phone number with country code (e.g. "8801311333277").
 * Automatically handles "+880...", "01...", or raw numbers.
 */
export function getWhatsAppNumber(): string {
  const envValue = process.env.NEXT_PUBLIC_PHONE_NUMBER?.trim();
  const raw = envValue || DEFAULT_PHONE_NUMBER;
  const digits = raw.replace(/\D/g, "");

  if (digits.startsWith("880")) {
    return digits;
  }
  if (digits.startsWith("01")) {
    return `88${digits}`;
  }
  return digits || DEFAULT_PHONE_NUMBER;
}

/**
 * Returns a human-friendly display phone number.
 * - "international": "+8801311333277"
 * - "local": "01311-333277"
 */
export function getDisplayPhoneNumber(format: "international" | "local" = "international"): string {
  const digits = getWhatsAppNumber();

  if (format === "local") {
    const local = digits.startsWith("88") ? digits.slice(2) : digits;
    const padded = local.startsWith("0") ? local : `0${local}`;
    if (padded.length === 11) {
      return `${padded.slice(0, 5)}-${padded.slice(5)}`;
    }
    return padded;
  }

  return `+${digits}`;
}

/**
 * Returns a valid wa.me link with optional pre-filled message.
 */
export function getWhatsAppUrl(message?: string): string {
  const number = getWhatsAppNumber();
  if (message) {
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }
  return `https://wa.me/${number}`;
}
