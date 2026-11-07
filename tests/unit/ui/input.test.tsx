import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Input, inputVariants } from "@/components/ui/input";
import { Textarea, textareaVariants } from "@/components/ui/textarea";

describe("Centralized Input and Textarea Primitives", () => {
  describe("Input Variants", () => {
    it("renders default variant with rounded-lg", () => {
      const html = renderToStaticMarkup(<Input placeholder="Default" />);
      expect(html).toContain("rounded-lg");
      expect(html).toContain("data-slot=\"input\"");
    });

    it("renders brand variant with streetwear rounded-xs and cyan focus ring", () => {
      const html = renderToStaticMarkup(<Input variant="brand" placeholder="Brand" />);
      expect(html).toContain("rounded-xs");
      expect(html).toContain("bg-white");
      expect(html).toContain("border-vl-black/15");
      expect(html).toContain("focus-visible:ring-vl-cyan");
    });

    it("renders dark variant with surface-dark background", () => {
      const html = renderToStaticMarkup(<Input variant="dark" placeholder="Dark" />);
      expect(html).toContain("bg-surface-dark");
      expect(html).toContain("text-white");
    });
  });

  describe("Input Sizes (8px Geometric Scale)", () => {
    const sizeMatrix = [
      { size: "sm", expectedClass: "h-8" },
      { size: "default", expectedClass: "h-10" },
      { size: "md", expectedClass: "h-10" },
      { size: "lg", expectedClass: "h-11" },
      { size: "xl", expectedClass: "h-12" },
      { size: "2xl", expectedClass: "h-12" },
    ] as const;

    for (const { size, expectedClass } of sizeMatrix) {
      it(`renders size="${size}" with ${expectedClass}`, () => {
        const html = renderToStaticMarkup(<Input size={size} />);
        expect(html).toContain(expectedClass);
      });
    }
  });

  describe("Textarea Variants & Sizes", () => {
    it("renders brand textarea with rounded-xs and cyan focus ring", () => {
      const html = renderToStaticMarkup(<Textarea variant="brand" placeholder="Note" />);
      expect(html).toContain("rounded-xs");
      expect(html).toContain("bg-white");
      expect(html).toContain("border-vl-black/15");
      expect(html).toContain("focus-visible:ring-vl-cyan");
      expect(html).toContain("data-slot=\"textarea\"");
    });

    it("renders textarea default size with min-h-24", () => {
      const html = renderToStaticMarkup(<Textarea />);
      expect(html).toContain("min-h-24");
    });

    it("renders textarea size sm with min-h-16 and lg with min-h-32", () => {
      const htmlSm = renderToStaticMarkup(<Textarea size="sm" />);
      const htmlLg = renderToStaticMarkup(<Textarea size="lg" />);
      expect(htmlSm).toContain("min-h-16");
      expect(htmlLg).toContain("min-h-32");
    });
  });

  describe("Input and Textarea Helper Functions", () => {
    it("computes inputVariants classes directly", () => {
      const classes = inputVariants({ variant: "brand", size: "lg" });
      expect(classes).toContain("rounded-xs");
      expect(classes).toContain("h-11");
    });

    it("computes textareaVariants classes directly", () => {
      const classes = textareaVariants({ variant: "brand", size: "sm" });
      expect(classes).toContain("rounded-xs");
      expect(classes).toContain("min-h-16");
    });
  });
});

