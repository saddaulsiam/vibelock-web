import { NextRequest } from "next/server";

export const MAX_REQUEST_PAYLOAD_BYTES = 64 * 1024; // 64 KB

export type BoundedBodyResult =
  | { tooLarge: true; text?: never }
  | { tooLarge: false; text: string };

/**
 * Reads a request body as a bounded UTF-8 text string using a ReadableStream reader.
 * Enforces a hard byte limit during stream ingestion:
 * 1. Checks `Content-Length` header upfront if present.
 * 2. If no body exists, returns an empty string safely.
 * 3. Reads chunks iteratively, canceling the stream reader immediately as soon as cumulative bytes exceed `maxBytes`.
 */
export async function readBoundedBodyText(
  req: NextRequest,
  maxBytes: number = MAX_REQUEST_PAYLOAD_BYTES
): Promise<BoundedBodyResult> {
  // 1. Content-Length header guard (fast pre-flight check)
  const contentLengthHeader = req.headers.get("content-length");
  if (contentLengthHeader) {
    const declaredLength = parseInt(contentLengthHeader, 10);
    if (!Number.isNaN(declaredLength) && declaredLength > maxBytes) {
      return { tooLarge: true };
    }
  }

  // 2. Fallback if body stream is not available or locked
  if (!req.body || req.body.locked) {
    if (typeof req.text === "function") {
      try {
        const text = await req.text();
        if (text.length > maxBytes) {
          return { tooLarge: true };
        }
        return { tooLarge: false, text };
      } catch {
        return { tooLarge: false, text: "" };
      }
    }
    return { tooLarge: false, text: "" };
  }

  // 3. Iterative stream reading with immediate cancellation on limit breach
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          try {
            await reader.cancel("Payload too large");
          } catch {
            // Suppress cancellation errors
          }
          return { tooLarge: true };
        }
        chunks.push(value);
      }
    }
  } catch (error) {
    try {
      await reader.cancel(error);
    } catch {
      // Suppress cancellation errors
    }
    throw error;
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Ignore if lock is already released
    }
  }

  // 4. Concatenate and decode UTF-8
  const totalLength = chunks.reduce((acc, c) => acc + c.byteLength, 0);
  const fullBuffer = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    fullBuffer.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return {
    tooLarge: false,
    text: new TextDecoder().decode(fullBuffer),
  };
}
