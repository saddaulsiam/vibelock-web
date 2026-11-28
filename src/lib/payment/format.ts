/**
 * Payment Gateway & Channel Formatting Utilities
 */

/**
 * Maps SSLCOMMERZ card_type and card_brand strings to a human-readable payment channel name.
 *
 * Priority Rules:
 * 1. card_brand first for card networks: VISA, MASTER, MASTERCARD, AMEX, AMERICAN EXPRESS.
 * 2. If card_brand is generic (e.g. MOBILEBANKING) or missing, resolve MFS from card_type: NAGAD, BKASH, UPAY.
 * 3. If card_brand is missing, resolve card networks from recognized card_type patterns.
 * 4. Fallback for unknown, empty, or missing channel: "SSLCOMMERZ".
 */
export function formatSslcommerzChannel(
  cardType?: string | null,
  cardBrand?: string | null
): string {
  const brandRaw = typeof cardBrand === "string" ? cardBrand.trim().toUpperCase() : "";
  const typeRaw = typeof cardType === "string" ? cardType.trim() : "";
  const typeUpper = typeRaw.toUpperCase();

  // 1. Check card_brand for card networks first (unless generic like MOBILEBANKING)
  if (brandRaw && brandRaw !== "MOBILEBANKING") {
    if (
      brandRaw === "VISA" ||
      brandRaw.startsWith("VISA-") ||
      brandRaw.startsWith("VISA ") ||
      brandRaw.endsWith("-VISA")
    ) {
      return "Visa";
    }

    if (
      brandRaw === "MASTER" ||
      brandRaw === "MASTERCARD" ||
      brandRaw.startsWith("MASTER-") ||
      brandRaw.startsWith("MASTERCARD-") ||
      brandRaw.startsWith("MASTER ") ||
      brandRaw.startsWith("MASTERCARD ") ||
      brandRaw.endsWith("-MASTER") ||
      brandRaw.endsWith("-MASTERCARD")
    ) {
      return "Mastercard";
    }

    if (
      brandRaw === "AMEX" ||
      brandRaw === "AMERICAN EXPRESS" ||
      brandRaw === "AMERICAN_EXPRESS" ||
      brandRaw.startsWith("AMEX-") ||
      brandRaw.startsWith("AMEX ") ||
      brandRaw.startsWith("AMERICAN EXPRESS") ||
      brandRaw.startsWith("AMERICAN_EXPRESS") ||
      brandRaw.endsWith("-AMEX")
    ) {
      return "American Express";
    }
  }

  // 2. Resolve MFS from card_type (or if card_brand indicated MFS)
  if (typeUpper) {
    // MFS: Nagad (e.g. "NAGAD-Nagad", "NAGAD", "nagad", "NAGAD-...")
    if (
      typeUpper === "NAGAD" ||
      typeUpper.startsWith("NAGAD-") ||
      typeUpper.startsWith("NAGAD ") ||
      typeUpper.endsWith("-NAGAD")
    ) {
      return "Nagad";
    }

    // MFS: bKash (e.g. "BKASH-bKash", "BKASH", "bkash", "BKASH-...")
    if (
      typeUpper === "BKASH" ||
      typeUpper.startsWith("BKASH-") ||
      typeUpper.startsWith("BKASH ") ||
      typeUpper.endsWith("-BKASH")
    ) {
      return "bKash";
    }

    // MFS: Upay (e.g. "UPAY", "UPAY-UCB", "upay", "UPAY-...")
    if (
      typeUpper === "UPAY" ||
      typeUpper.startsWith("UPAY-") ||
      typeUpper.startsWith("UPAY ") ||
      typeUpper.endsWith("-UPAY")
    ) {
      return "Upay";
    }

    // 3. Fallback: Resolve card networks from card_type if card_brand was absent or unrecognized
    if (
      typeUpper === "VISA" ||
      typeUpper.startsWith("VISA-") ||
      typeUpper.startsWith("VISA ") ||
      typeUpper.endsWith("-VISA")
    ) {
      return "Visa";
    }

    if (
      typeUpper === "MASTER" ||
      typeUpper === "MASTERCARD" ||
      typeUpper.startsWith("MASTER-") ||
      typeUpper.startsWith("MASTERCARD-") ||
      typeUpper.startsWith("MASTER ") ||
      typeUpper.startsWith("MASTERCARD ") ||
      typeUpper.endsWith("-MASTER") ||
      typeUpper.endsWith("-MASTERCARD")
    ) {
      return "Mastercard";
    }

    if (
      typeUpper === "AMEX" ||
      typeUpper === "AMERICAN EXPRESS" ||
      typeUpper === "AMERICAN_EXPRESS" ||
      typeUpper.startsWith("AMEX-") ||
      typeUpper.startsWith("AMEX ") ||
      typeUpper.startsWith("AMERICAN EXPRESS") ||
      typeUpper.startsWith("AMERICAN_EXPRESS") ||
      typeUpper.endsWith("-AMEX")
    ) {
      return "American Express";
    }
  }

  // Fallback for empty, generic, or unrecognized channel
  return "SSLCOMMERZ";
}

/**
 * Returns a human-readable payment gateway/channel name.
 *
 * @param gateway - The gateway identifier (e.g. "SSLCOMMERZ", "BKASH", "COD")
 * @param method - The payment method (e.g. "COD", "ONLINE")
 * @param cardType - Optional SSLCOMMERZ card_type string (e.g. "NAGAD-Nagad", "VISA")
 * @param cardBrand - Optional SSLCOMMERZ card_brand string (e.g. "VISA", "MOBILEBANKING")
 */
export function getHumanGatewayName(
  gateway?: string | null,
  method?: string,
  cardType?: string | null,
  cardBrand?: string | null
): string {
  if (method === "COD" || gateway === "COD" || gateway === "CASH") {
    return "Cash on Delivery";
  }

  const normalized = (gateway || (method === "ONLINE" ? "SSLCOMMERZ" : method) || "")
    .trim()
    .toUpperCase();

  if (!normalized) {
    return "Cash on Delivery";
  }

  if (normalized === "COD" || normalized === "CASH") {
    return "Cash on Delivery";
  }
  if (normalized === "BKASH") {
    return "bKash";
  }
  if (normalized === "NAGAD") {
    return "Nagad";
  }
  if (normalized === "PAYSTATION") {
    return "PayStation";
  }
  if (normalized === "BANGLA_QR") {
    return "Bangla QR";
  }
  if (normalized === "CARD") {
    return "Credit / Debit Card";
  }
  if (normalized === "SSLCOMMERZ" || normalized === "ONLINE") {
    const channel = formatSslcommerzChannel(cardType, cardBrand);
    if (channel !== "SSLCOMMERZ") {
      return channel;
    }
    return "SSLCOMMERZ (Cards / MFS)";
  }

  return gateway || normalized;
}

/**
 * Extracts cardType and cardBrand from Payment.gatewayPayload safely,
 * supporting both namespaced callback metadata (PR #103) and legacy root-level metadata.
 * Prefers valid namespaced callback values, with safe fallback to root-level fields.
 */
export function extractCardMetadata(gatewayPayload: unknown): {
  cardType: string | null;
  cardBrand: string | null;
} {
  if (!gatewayPayload || typeof gatewayPayload !== "object" || Array.isArray(gatewayPayload)) {
    return { cardType: null, cardBrand: null };
  }

  const payload = gatewayPayload as Record<string, unknown>;
  const callback =
    payload.callback && typeof payload.callback === "object" && !Array.isArray(payload.callback)
      ? (payload.callback as Record<string, unknown>)
      : null;

  // Prefer valid namespaced callback values, with safe legacy root-level fallback.
  // Validate that values are strings before using them.
  const cardType =
    typeof callback?.card_type === "string" && callback.card_type.trim()
      ? callback.card_type.trim()
      : typeof callback?.cardType === "string" && callback.cardType.trim()
        ? callback.cardType.trim()
        : typeof payload.card_type === "string" && payload.card_type.trim()
          ? payload.card_type.trim()
          : typeof payload.cardType === "string" && payload.cardType.trim()
            ? payload.cardType.trim()
            : null;

  const cardBrand =
    typeof callback?.card_brand === "string" && callback.card_brand.trim()
      ? callback.card_brand.trim()
      : typeof callback?.cardBrand === "string" && callback.cardBrand.trim()
        ? callback.cardBrand.trim()
        : typeof payload.card_brand === "string" && payload.card_brand.trim()
          ? payload.card_brand.trim()
          : typeof payload.cardBrand === "string" && payload.cardBrand.trim()
            ? payload.cardBrand.trim()
            : null;

  return { cardType, cardBrand };
}
