import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WhatsAppFloatingButton } from "@/components/storefront/layout/whatsapp-floating-button";

vi.mock("next/navigation", () => ({
  usePathname: () => "/product/oversized-black-tee",
}));

describe("WhatsAppFloatingButton Component", () => {
  it("renders floating button with accessible label and online indicator in SSR", () => {
    const html = renderToStaticMarkup(<WhatsAppFloatingButton />);

    expect(html).toContain('aria-label="WhatsApp Support Widget"');
    expect(html).toContain('aria-label="Chat with us on WhatsApp"');
    expect(html).toContain("সাইজ বা অর্ডার সহায়তা?");
    expect(html).toContain("/icons/whatsapp.svg");
  });

  it("renders dismissible pill with close button", () => {
    const html = renderToStaticMarkup(<WhatsAppFloatingButton />);

    expect(html).toContain('aria-label="Dismiss message"');
    expect(html).toContain("সাইজ বা অর্ডার সহায়তা?");
  });
});
