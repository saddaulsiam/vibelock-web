import crypto from "crypto";
import type { MetaUserData } from "./meta-types";

/**
 * Computes a SHA-256 hash formatted as a lowercase hexadecimal string.
 * Returns null if input is empty or invalid.
 */
export function hashSha256(value?: string | null): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return crypto.createHash("sha256").update(trimmed).digest("hex");
}

/**
 * Normalizes email address according to Meta specifications:
 * - Trim leading/trailing whitespace
 * - Convert all characters to lowercase
 */
export function normalizeEmail(email?: string | null): string | null {
  if (!email || typeof email !== "string") return null;
  const cleaned = email.trim().toLowerCase();
  return cleaned.includes("@") ? cleaned : null;
}

/**
 * Normalizes phone number according to Meta E.164 specifications:
 * - Strip all non-digit characters
 * - For Bangladesh: convert local 11-digit numbers (e.g. 017XXXXXXXX) to 88017XXXXXXXX
 * - Strip any leading '+' if present
 */
export function normalizePhone(phone?: string | null): string | null {
  if (!phone || typeof phone !== "string") return null;
  // Keep only digits
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  // If local Bangladesh format starting with 01 (11 digits: 01XXXXXXXXX)
  if (digits.startsWith("01") && digits.length === 11) {
    digits = `88${digits}`;
  } else if (digits.startsWith("8801") && digits.length === 13) {
    // Already in 8801... format
  } else if (digits.startsWith("008801")) {
    digits = digits.slice(2);
  }

  // Must have reasonable length (minimum 10 digits)
  return digits.length >= 10 ? digits : null;
}

/**
 * Splits and normalizes full name into first and last name according to Meta standards.
 */
export function normalizeName(fullName?: string | null): {
  firstName: string | null;
  lastName: string | null;
} {
  if (!fullName || typeof fullName !== "string") {
    return { firstName: null, lastName: null };
  }

  const cleaned = fullName.trim().toLowerCase().replace(/[^\p{L}\s]/gu, "");
  const parts = cleaned.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: null, lastName: null };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null };
  }

  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName };
}

/**
 * Normalizes city name:
 * - Lowercase, remove whitespace and punctuation (e.g. "Dhaka" -> "dhaka", "Chattogram" -> "chattogram")
 */
export function normalizeCity(city?: string | null): string | null {
  if (!city || typeof city !== "string") return null;
  const cleaned = city.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleaned || null;
}

/**
 * Prepares hashed user data object for Meta CAPI compliance (EMQ 8.0+).
 */
export function buildMetaUserData(params: {
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  city?: string | null;
  country?: string | null;
  userId?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
}): MetaUserData {
  const userData: MetaUserData = {};

  // Email (em)
  const normEmail = normalizeEmail(params.email);
  if (normEmail) {
    const hashed = hashSha256(normEmail);
    if (hashed) userData.em = [hashed];
  }

  // Phone (ph)
  const normPhone = normalizePhone(params.phone);
  if (normPhone) {
    const hashed = hashSha256(normPhone);
    if (hashed) userData.ph = [hashed];
  }

  // Name (fn / ln)
  const { firstName, lastName } = normalizeName(params.name);
  if (firstName) {
    const hashed = hashSha256(firstName);
    if (hashed) userData.fn = [hashed];
  }
  if (lastName) {
    const hashed = hashSha256(lastName);
    if (hashed) userData.ln = [hashed];
  }

  // City (ct)
  const normCity = normalizeCity(params.city);
  if (normCity) {
    const hashed = hashSha256(normCity);
    if (hashed) userData.ct = [hashed];
  }

  // Country (country) - Default to 'bd' if in Bangladesh
  const countryCode = (params.country || "bd").trim().toLowerCase().slice(0, 2);
  const hashedCountry = hashSha256(countryCode);
  if (hashedCountry) {
    userData.country = [hashedCountry];
  }

  // External ID (external_id)
  if (params.userId) {
    const hashedUser = hashSha256(params.userId.trim());
    if (hashedUser) userData.external_id = [hashedUser];
  }

  // Contextual parameters (UNHASHED per Meta spec)
  if (params.clientIp) {
    // Take first IP if comma separated from proxy
    const cleanIp = params.clientIp.split(",")[0].trim();
    if (cleanIp) userData.client_ip_address = cleanIp;
  }
  if (params.userAgent) {
    userData.client_user_agent = params.userAgent.trim();
  }
  if (params.fbp) {
    userData.fbp = params.fbp.trim();
  }
  if (params.fbc) {
    userData.fbc = params.fbc.trim();
  }

  return userData;
}
