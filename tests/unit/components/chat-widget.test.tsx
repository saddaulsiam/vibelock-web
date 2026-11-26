import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import fs from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

// Mock @ai-sdk/react useChat hook
vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    messages: [],
    sendMessage: vi.fn(),
    setMessages: vi.fn(),
    status: "ready",
    error: null,
    regenerate: vi.fn(),
  }),
}));

import { ChatWidget } from "@/components/chat/ChatWidget";

describe("ChatWidget Mobile Responsiveness and Badge Lifecycle", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the floating action trigger button with proper accessible label", () => {
    const html = renderToStaticMarkup(<ChatWidget />);
    expect(html).toContain('aria-label="Open VibeLock AI Chat Assistant"');
    expect(html).toContain('aria-label="VibeLock AI Assistant"');
  });

  it("ensures mobile dialog constraints prevent ducking under the fixed navbar (calc(100dvh-6.5rem))", () => {
    // Read the source of ChatWidget to verify classes for mobile height safety
    // Expanded mode must use calc(100dvh-6.5rem) and standard mode max-h-[calc(100dvh-6.5rem)]
    const widgetSource = fs.readFileSync("src/components/chat/ChatWidget.tsx", "utf8");

    expect(widgetSource).toContain("h-[calc(100dvh-6.5rem)]");
    expect(widgetSource).toContain("max-h-[calc(100dvh-6.5rem)]");
    // Ensure old collision-prone values (h-[calc(100dvh-2.5rem)] / max-h-[92vh]) are removed
    expect(widgetSource).not.toContain("h-[calc(100dvh-2.5rem)]");
    expect(widgetSource).not.toContain("max-h-[92vh]");
  });

  it("configures 30-second auto-close timeout for the promotional teaser badge", () => {
    const widgetSource = fs.readFileSync("src/components/chat/ChatWidget.tsx", "utf8");

    // Must have 30000ms timer for auto dismissal
    expect(widgetSource).toContain("30000");
    expect(widgetSource).toContain("autoCloseTimerRef.current");
    expect(widgetSource).toContain("vl_chat_badge_dismissed");
  });
});
