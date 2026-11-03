/**
 * Shared date-formatting helpers for the account and order areas.
 * Keep formatting consistent across all order/return pages.
 */

/** Short date: "Nov 4, 2026" (used in order lists and return lists) */
export function formatOrderDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

/** Full datetime: "4 Nov 2026, 10:30 AM" (used in order detail pages) */
export function formatOrderDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

/**
 * Calculates a dynamic business-day delivery estimate range based on placement date and city.
 * Inside Dhaka: 2 to 3 business days.
 * Outside Dhaka: 3 to 5 business days.
 */
export function calculateDeliveryEstimate(createdAt: Date | string, city?: string | null): string {
  const date = new Date(createdAt);
  const isDhaka = city?.toLowerCase().includes("dhaka") ?? false;
  const minDays = isDhaka ? 2 : 3;
  const maxDays = isDhaka ? 3 : 5;

  const minDate = new Date(date);
  minDate.setDate(minDate.getDate() + minDays);

  const maxDate = new Date(date);
  maxDate.setDate(maxDate.getDate() + maxDays);

  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });

  return `${formatter.format(minDate)} – ${formatter.format(maxDate)}`;
}

