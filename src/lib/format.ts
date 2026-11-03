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
