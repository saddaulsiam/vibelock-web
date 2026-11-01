/**
 * Centralized CSV Export Utility for VibeLock Admin Tables
 * Defends against CSV Formula Injection and ensures full UTF-8 BOM encoding for Excel.
 */

export interface ExportToCsvOptions {
  filename: string;
  headers: string[];
  rows: unknown[][];
}

/**
 * Safely sanitizes a single cell value against CSV formula injection.
 * Prepends a single quote if the value begins with '=', '+', '-', or '@'.
 */
export function sanitizeCsvCell(value: unknown): string {
  const text = String(value ?? "");
  const sanitized = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(sanitized) ? `"${sanitized.replace(/"/g, '""')}"` : sanitized;
}

/**
 * Generates CSV content string with UTF-8 BOM and formula sanitization.
 */
export function buildCsvContent(headers: string[], rows: unknown[][]): string {
  const headerRow = headers.map(sanitizeCsvCell).join(",");
  const dataRows = rows.map((row) => row.map(sanitizeCsvCell).join(","));
  return "\uFEFF" + [headerRow, ...dataRows].join("\r\n");
}

/**
 * Triggers a client-side download of a CSV file with:
 * 1. UTF-8 BOM (\uFEFF) for Excel compatibility and proper character encoding.
 * 2. Formula injection defense on all cell contents.
 * 3. Safe DOM element lifecycle management (appends, clicks, and cleans up).
 */
export function exportToCsv({ filename, headers, rows }: ExportToCsvOptions): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const csvContent = buildCsvContent(headers, rows);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const safeFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.setAttribute("download", safeFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
