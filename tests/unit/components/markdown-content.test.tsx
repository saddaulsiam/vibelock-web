import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownContent } from "@/components/chat/MarkdownContent";

describe("MarkdownContent Component", () => {
  it("renders internal relative links like [T-Shirt](/product/t-shirt) as clickable links", () => {
    const html = renderToStaticMarkup(
      <MarkdownContent content="[T-Shirt](/product/t-shirt) - মূল্য: ৳৮০০" />
    );

    expect(html).toContain('href="/product/t-shirt"');
    expect(html).toContain("T-Shirt");
    expect(html).not.toContain("[T-Shirt](/product/t-shirt)");
  });

  it("renders external links with target=_blank and rel=noopener", () => {
    const html = renderToStaticMarkup(
      <MarkdownContent content="[Google Maps](https://maps.app.goo.gl/HDGLvX8VBsM4v5iF6)" />
    );

    expect(html).toContain('href="https://maps.app.goo.gl/HDGLvX8VBsM4v5iF6"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("sanitizes dangerous schemes like javascript:", () => {
    const html = renderToStaticMarkup(
      <MarkdownContent content="[Click](javascript:alert(1))" />
    );

    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<a");
    expect(html).toContain("Click");
  });

  it("renders bold and lists properly", () => {
    const html = renderToStaticMarkup(
      <MarkdownContent content={"**bold text**\n- Item 1\n- Item 2"} />
    );

    expect(html).toContain("<strong");
    expect(html).toContain("<ul");
    expect(html).toContain("<li");
  });
});
