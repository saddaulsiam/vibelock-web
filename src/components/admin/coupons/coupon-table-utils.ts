export function formatCurrency(val: unknown): string {
  const num = typeof val === "number" ? val : Number(val || 0);
  return `৳${Math.round(num).toLocaleString()}`;
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "No expiry";
  return new Date(date).toLocaleDateString("en-BD", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export interface ValidityNote {
  text: string;
  tone: "normal" | "warning" | "expired";
}

export function getValidityNote(
  startDate: Date | string | null,
  endDate: Date | string | null
): ValidityNote {
  const now = new Date();
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (end && end < now) {
    return { text: `Expired on ${formatDate(end)}`, tone: "expired" };
  }
  if (start && start > now) {
    return { text: `Starts on ${formatDate(start)}`, tone: "warning" };
  }
  if (end) {
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) {
      return { text: `Expires in ${diffDays} day${diffDays === 1 ? "" : "s"}!`, tone: "warning" };
    }
    return { text: `Valid until ${formatDate(end)}`, tone: "normal" };
  }
  return { text: "No expiration date", tone: "normal" };
}

export function sharePromoWhatsApp(coupon: {
  code: string;
  discountType: string;
  discountValue: unknown;
  minOrderValue?: unknown;
}): void {
  const discountText =
    coupon.discountType === "PERCENTAGE"
      ? `${coupon.discountValue}% OFF`
      : `${formatCurrency(coupon.discountValue)} OFF`;

  const minSpendText =
    coupon.minOrderValue && Number(coupon.minOrderValue) > 0
      ? ` (Min order: ${formatCurrency(coupon.minOrderValue)})`
      : "";

  const promoMessage = `🔥 *Special Offer from VibeLock Streetwear!* 🔥\n\nUse exclusive coupon code *${coupon.code}* at checkout to enjoy *${discountText}* on your order${minSpendText}!\n\n🛒 Claim your discount here:\nhttps://vibelock.bd/cart\n\n_Hurry, limited-time promotion!_`;

  const url = `https://wa.me/?text=${encodeURIComponent(promoMessage)}`;
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

