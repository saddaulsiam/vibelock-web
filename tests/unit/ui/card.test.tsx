import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

type CardVariant = NonNullable<ComponentProps<typeof Card>["variant"]>;

describe("Unified Global Card Component", () => {
  describe("Variants", () => {
    const variants: { name: CardVariant; expectedClass: string }[] = [
      { name: "default", expectedClass: "bg-card border border-border" },
      { name: "brand", expectedClass: "bg-white border border-vl-black/8 rounded-card" },
      { name: "dark", expectedClass: "bg-surface-dark text-vl-white border border-border-dark" },
      { name: "panel", expectedClass: "bg-surface-warm-soft border border-vl-black/8" },
      { name: "interactive", expectedClass: "hover:border-vl-black/30 hover:shadow-xs" },
    ];

    for (const { name, expectedClass } of variants) {
      it(`renders variant="${name}" with design token classes`, () => {
        const html = renderToStaticMarkup(
          <Card variant={name}>Content</Card>
        );
        for (const cls of expectedClass.split(" ")) {
          expect(html).toContain(cls);
        }
      });
    }

    it("renders default variant when no variant specified", () => {
      const html = renderToStaticMarkup(<Card>Content</Card>);
      expect(html).toContain("bg-card");
      expect(html).toContain("border-border");
    });
  });

  describe("Subcomponents", () => {
    it("renders full card structure with header, title, description, content, and footer", () => {
      const html = renderToStaticMarkup(
        <Card variant="brand">
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
            <CardDescription>Test Description</CardDescription>
          </CardHeader>
          <CardContent>Body content</CardContent>
          <CardFooter>Footer content</CardFooter>
        </Card>
      );
      expect(html).toContain("Test Title");
      expect(html).toContain("Test Description");
      expect(html).toContain("Body content");
      expect(html).toContain("Footer content");
    });
  });
});

