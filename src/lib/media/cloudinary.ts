import { createHash } from "node:crypto";

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

export type CloudinaryUploadResult =
  { success: true; url: string; publicId: string } | { success: false; error: string };

let serverTimeOffsetMs = 0;
let hasSynced = false;

/**
 * Cloudinary strictly validates that the request timestamp is within 1 hour of UTC server time.
 * If the local system clock has drifted or is skewed, this fetches the exact server time
 * from Cloudinary's HTTP date header to prevent "Stale request" errors.
 */
async function getSynchronizedTimestamp(): Promise<number> {
  try {
    const headRes = await fetch("https://api.cloudinary.com", {
      method: "HEAD",
      cache: "no-store",
    });
    const dateHeader = headRes.headers.get("date");
    if (dateHeader) {
      const serverTime = new Date(dateHeader).getTime();
      serverTimeOffsetMs = serverTime - Date.now();
      hasSynced = true;
      return Math.round(serverTime / 1000);
    }
  } catch {
    // Fall back to cached offset or local clock if network check fails
  }
  return Math.round((Date.now() + (hasSynced ? serverTimeOffsetMs : 0)) / 1000);
}

/**
 * Uploads an image file to Cloudinary using direct signed REST API.
 * Requires NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.
 */
export async function uploadToCloudinary(
  file: File,
  folder = "vibelock/categories"
): Promise<CloudinaryUploadResult> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return {
      success: false,
      error:
        "Cloudinary credentials are not configured in .env. Please set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    };
  }

  // 5MB limit
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "Image file size must be under 5MB." };
  }

  const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
  if (!allowedMimes.includes(file.type)) {
    return {
      success: false,
      error: "Only JPG, PNG, WebP, GIF, or AVIF image files are supported.",
    };
  }

  const timestamp = await getSynchronizedTimestamp();

  // Cloudinary signature requires alphabetically sorted parameter string + apiSecret
  const stringToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash("sha1").update(stringToSign).digest("hex");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  formData.append("timestamp", String(timestamp));
  formData.append("api_key", apiKey);
  formData.append("signature", signature);

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      return {
        success: false,
        error: data.error?.message || `Cloudinary upload failed with status ${res.status}.`,
      };
    }

    return {
      success: true,
      url: data.secure_url || data.url,
      publicId: data.public_id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to connect to Cloudinary upload server.",
    };
  }
}
