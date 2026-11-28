import { Buffer } from "node:buffer";

/**
 * Image security validation utility.
 * Validates file sizes, declared MIME types, file extensions, and binary magic bytes.
 * Strictly prevents SVG/HTML stored XSS and MIME type spoofing.
 */

export interface ImageValidationOptions {
  maxSizeBytes?: number;
  allowedMimes?: string[];
}

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  detectedMime?: string;
}

export const DEFAULT_ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];

export const AVATAR_ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Detects the real MIME type from binary magic bytes.
 */
export function detectImageMimeFromBuffer(buffer: Uint8Array | Buffer): string | null {
  if (!buffer || buffer.length < 4) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // GIF: GIF87a or GIF89a
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return "image/gif";
  }

  // WebP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  // AVIF: ftyp (bytes 4-7) + avif/avis/mif1 (bytes 8-11)
  if (buffer.length >= 12) {
    const isFtyp =
      buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70;
    if (isFtyp) {
      const brand = String.fromCharCode(buffer[8], buffer[9], buffer[10], buffer[11]);
      if (brand === "avif" || brand === "avis" || brand === "mif1") {
        return "image/avif";
      }
    }
  }

  return null;
}

/**
 * Checks for SVG or script content in the buffer (stored XSS defense).
 */
export function containsSvgOrScriptPayload(buffer: Uint8Array | Buffer): boolean {
  if (!buffer || buffer.length === 0) return false;
  // Inspect up to first 2048 bytes
  const slice = buffer.subarray(0, Math.min(buffer.length, 2048));
  const text = Buffer.from(slice).toString("utf8").toLowerCase();

  return (
    text.includes("<svg") ||
    text.includes("<script") ||
    text.includes("<!doctype svg") ||
    text.includes("<?xml") ||
    text.includes("<html") ||
    text.includes("xmlns=") ||
    text.includes("javascript:") ||
    text.includes("onerror=") ||
    text.includes("onload=")
  );
}

/**
 * Validates an image File or Buffer-like object against security constraints.
 */
export async function validateImageFile(
  file: File | { name?: string; type: string; size: number; arrayBuffer(): Promise<ArrayBuffer> },
  options: ImageValidationOptions = {}
): Promise<ImageValidationResult> {
  const maxSize = options.maxSizeBytes ?? MAX_IMAGE_SIZE_BYTES;
  const allowedMimes = options.allowedMimes ?? DEFAULT_ALLOWED_IMAGE_MIMES;

  if (!file) {
    return { valid: false, error: "No image file provided." };
  }

  if (file.size <= 0) {
    return { valid: false, error: "Image file is empty." };
  }

  if (file.size > maxSize) {
    const mb = Math.round(maxSize / (1024 * 1024));
    return { valid: false, error: `Image file size must not exceed ${mb}MB.` };
  }

  // 1. Check filename extension if available
  const fileName = (file.name || "").toLowerCase();
  if (fileName.endsWith(".svg") || fileName.endsWith(".htm") || fileName.endsWith(".html")) {
    return { valid: false, error: "SVG and HTML files are not supported for security reasons." };
  }

  // 2. Reject SVG MIME explicitly
  const declaredMime = (file.type || "").toLowerCase().trim();
  if (declaredMime === "image/svg+xml" || declaredMime.includes("svg")) {
    return { valid: false, error: "SVG images are not supported for security reasons." };
  }

  // 3. Check declared MIME against allowlist
  if (!allowedMimes.includes(declaredMime)) {
    return {
      valid: false,
      error: `Unsupported image format (${declaredMime || "unknown"}). Allowed formats: JPG, PNG, WebP.`,
    };
  }

  // 4. Read binary buffer and check magic bytes
  let arrayBuf: ArrayBuffer;
  try {
    arrayBuf = await file.arrayBuffer();
  } catch {
    return { valid: false, error: "Failed to read image data." };
  }

  const uint8 = new Uint8Array(arrayBuf);
  const detectedMime = detectImageMimeFromBuffer(uint8);

  if (!detectedMime) {
    return {
      valid: false,
      error:
        "Corrupted or invalid image file. Binary signature did not match any supported image format.",
    };
  }

  // 5. Ensure declared MIME matches detected MIME (prevent MIME spoofing)
  if (declaredMime !== detectedMime) {
    // Normalization check: image/jpg vs image/jpeg
    const isJpegMismatch =
      (declaredMime === "image/jpg" || declaredMime === "image/jpeg") &&
      (detectedMime === "image/jpg" || detectedMime === "image/jpeg");
    if (!isJpegMismatch) {
      return {
        valid: false,
        error: `File signature mismatch: file claims to be ${declaredMime} but binary signature indicates ${detectedMime}.`,
      };
    }
  }

  // 6. Check for embedded SVG or script content
  if (containsSvgOrScriptPayload(uint8)) {
    return {
      valid: false,
      error: "Potentially malicious or invalid image content detected.",
    };
  }

  return { valid: true, detectedMime };
}
