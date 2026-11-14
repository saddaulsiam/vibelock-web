import { describe, expect, test } from "vitest";
import { NextRequest } from "next/server";
import { readBoundedBodyText, MAX_REQUEST_PAYLOAD_BYTES } from "@/lib/security/request-boundary";

describe("readBoundedBodyText Stream Boundary Ingestion Unit Tests", () => {
  test("returns empty string when req has no body (e.g. GET)", async () => {
    const req = new NextRequest("https://vibelock.bd/api/test", { method: "GET" });
    const result = await readBoundedBodyText(req, 1024);
    expect(result).toEqual({ tooLarge: false, text: "" });
  });

  test("rejects request upfront when Content-Length exceeds maxBytes", async () => {
    const headers = new Headers();
    headers.set("content-length", "2000");

    const req = new NextRequest("https://vibelock.bd/api/test", {
      method: "POST",
      headers,
      body: "a",
    });

    const result = await readBoundedBodyText(req, 1000);
    expect(result).toEqual({ tooLarge: true });
  });

  test("accepts request when Content-Length is exactly maxBytes", async () => {
    const exactBytes = 64 * 1024;
    const bodyStr = "x".repeat(exactBytes);
    const headers = new Headers();
    headers.set("content-length", String(exactBytes));

    const req = new NextRequest("https://vibelock.bd/api/test", {
      method: "POST",
      headers,
      body: bodyStr,
    });

    const result = await readBoundedBodyText(req, exactBytes);
    expect(result).toEqual({ tooLarge: false, text: bodyStr });
  });

  test("rejects request when Content-Length is exactly 64 KB + 1 byte upfront", async () => {
    const oversizedBytes = 64 * 1024 + 1;
    const headers = new Headers();
    headers.set("content-length", String(oversizedBytes));

    const req = new NextRequest("https://vibelock.bd/api/test", {
      method: "POST",
      headers,
      body: "a",
    });

    const result = await readBoundedBodyText(req, MAX_REQUEST_PAYLOAD_BYTES);
    expect(result).toEqual({ tooLarge: true });
  });

  test("successfully reads payload within maxBytes limit", async () => {
    const payload = JSON.stringify({ message: "hello world", count: 42 });
    const req = new NextRequest("https://vibelock.bd/api/test", {
      method: "POST",
      body: payload,
    });

    const result = await readBoundedBodyText(req, 1024);
    expect(result).toEqual({ tooLarge: false, text: payload });
  });

  test("accepts stream of exactly 64 KB without Content-Length", async () => {
    const exactBytes = 64 * 1024; // 65,536 bytes
    const chunk1 = new Uint8Array(32 * 1024);
    chunk1.fill(65); // 'A'
    const chunk2 = new Uint8Array(32 * 1024);
    chunk2.fill(66); // 'B'

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(chunk1);
        controller.enqueue(chunk2);
        controller.close();
      },
    });

    const req = new NextRequest("https://vibelock.bd/api/test", {
      method: "POST",
      body: stream,
    });

    const result = await readBoundedBodyText(req, exactBytes);
    expect(result.tooLarge).toBe(false);
    if (!result.tooLarge) {
      expect(result.text.length).toBe(exactBytes);
    }
  });

  test("rejects stream of exactly 64 KB + 1 byte without Content-Length and cancels stream", async () => {
    const maxBytes = 64 * 1024; // 65,536 bytes
    let cancelCalled = false;

    const chunk1 = new Uint8Array(32 * 1024);
    const chunk2 = new Uint8Array(32 * 1024);
    const chunk3 = new Uint8Array(1); // 1 extra byte -> 65,537 total
    const chunks = [chunk1, chunk2, chunk3];

    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (chunks.length > 0) {
          controller.enqueue(chunks.shift()!);
        } else {
          controller.close();
        }
      },
      cancel() {
        cancelCalled = true;
      },
    });

    const req = new NextRequest("https://vibelock.bd/api/test", {
      method: "POST",
      body: stream,
    });

    const result = await readBoundedBodyText(req, maxBytes);
    expect(result).toEqual({ tooLarge: true });
    expect(cancelCalled).toBe(true);
    expect(req.body?.locked).toBe(false); // Reader lock released
  });

  test("stops reading and cancels stream as soon as chunks exceed maxBytes without Content-Length", async () => {
    let cancelCalled = false;
    let chunksEmitted = 0;

    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (chunksEmitted < 10) {
          chunksEmitted++;
          controller.enqueue(new Uint8Array(100)); // 100 bytes per chunk
        } else {
          controller.close();
        }
      },
      cancel() {
        cancelCalled = true;
      },
    });

    const req = new NextRequest("https://vibelock.bd/api/test", {
      method: "POST",
      body: stream,
    });

    // Limit to 250 bytes (chunk 1: 100, chunk 2: 200, chunk 3: 300 -> exceeds 250)
    const result = await readBoundedBodyText(req, 250);
    expect(result).toEqual({ tooLarge: true });
    expect(cancelCalled).toBe(true);
    // Should have aborted after chunk 3, far before 10 chunks were emitted
    expect(chunksEmitted).toBeLessThanOrEqual(4);
    expect(req.body?.locked).toBe(false); // Reader lock released
  });

  test("correctly decodes multibyte UTF-8 characters across chunk boundaries", async () => {
    // "বাংলা" in UTF-8
    const text = "বাংলা ভাষা ও সাহিত্য";
    const encoded = new TextEncoder().encode(text);
    const half = Math.floor(encoded.length / 2);

    const chunk1 = encoded.slice(0, half);
    const chunk2 = encoded.slice(half);

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(chunk1);
        controller.enqueue(chunk2);
        controller.close();
      },
    });

    const req = new NextRequest("https://vibelock.bd/api/test", {
      method: "POST",
      body: stream,
    });

    const result = await readBoundedBodyText(req, 1024);
    expect(result).toEqual({ tooLarge: false, text });
  });

  test("cleans up reader, releases lock, and propagates error when stream read throws", async () => {
    const stream = new ReadableStream<Uint8Array>({
      pull() {
        throw new Error("Network stream failure");
      },
    });

    const req = new NextRequest("https://vibelock.bd/api/test", {
      method: "POST",
      body: stream,
    });

    await expect(readBoundedBodyText(req, 1024)).rejects.toThrow("Network stream failure");
    expect(req.body?.locked).toBe(false); // Reader lock released via finally block
  });
});
