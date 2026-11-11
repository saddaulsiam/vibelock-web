import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Button, buttonVariants, type ButtonProps } from "@/components/ui/button";

describe("Unified Global Button Component", () => {
  describe("Variants", () => {
    const variants = [
      { name: "primary", expectedClass: "bg-vl-black text-vl-white" },
      { name: "brand", expectedClass: "bg-vl-cyan text-vl-dark-900" },
      { name: "secondary", expectedClass: "bg-secondary text-secondary-foreground" },
      { name: "outline", expectedClass: "border border-border bg-transparent text-foreground" },
      { name: "ghost", expectedClass: "border-transparent bg-transparent hover:bg-muted" },
      { name: "destructive", expectedClass: "bg-destructive/10 text-destructive" },
      { name: "link", expectedClass: "text-primary underline-offset-4" },
      { name: "danger", expectedClass: "bg-red-500 text-white" },
    ] as const;

    for (const { name, expectedClass } of variants) {
      it(`renders variant="${name}" with correct design token classes`, () => {
        const html = renderToStaticMarkup(
          <Button variant={name as NonNullable<ButtonProps["variant"]>}>{name} action</Button>
        );
        for (const cls of expectedClass.split(" ")) {
          expect(html).toContain(cls);
        }
      });
    }

    it("renders default variant matching primary action styling", () => {
      const htmlDefault = renderToStaticMarkup(<Button>Default Action</Button>);
      const htmlPrimary = renderToStaticMarkup(<Button variant="primary">Primary Action</Button>);

      expect(htmlDefault).toContain("bg-vl-black text-vl-white");
      expect(htmlPrimary).toContain("bg-vl-black text-vl-white");
    });
  });

  describe("Sizes", () => {
    const sizes = [
      { name: "xs", expectedClass: "h-7" },
      { name: "sm", expectedClass: "h-8" },
      { name: "default", expectedClass: "h-10" },
      { name: "lg", expectedClass: "h-12" },
      { name: "xl", expectedClass: "h-12" },
      { name: "2xl", expectedClass: "h-12" },
      { name: "icon", expectedClass: "size-8" },
      { name: "icon-xs", expectedClass: "size-6" },
      { name: "icon-sm", expectedClass: "size-7" },
      { name: "icon-lg", expectedClass: "size-9" },
    ] as const;

    for (const { name, expectedClass } of sizes) {
      it(`renders size="${name}" with target dimension ${expectedClass}`, () => {
        const html = renderToStaticMarkup(
          <Button size={name as NonNullable<ButtonProps["size"]>}>Button size</Button>
        );
        expect(html).toContain(expectedClass);
      });
    }
  });

  describe("Props and Behaviors", () => {
    it("renders children content accurately", () => {
      const html = renderToStaticMarkup(<Button>Submit Order</Button>);
      expect(html).toContain("Submit Order");
      expect(html).toContain("<button");
    });

    it("supports custom className extension without clobbering base variants", () => {
      const html = renderToStaticMarkup(
        <Button variant="primary" className="custom-test-class">
          Primary CTA
        </Button>
      );
      expect(html).toContain("custom-test-class");
      expect(html).toContain("bg-vl-black text-vl-white");
    });

    it("supports fullWidth prop adding w-full class", () => {
      const normalHtml = renderToStaticMarkup(<Button>Normal</Button>);
      const fullWidthHtml = renderToStaticMarkup(<Button fullWidth>Full Width</Button>);

      expect(normalHtml).not.toContain("w-full");
      expect(fullWidthHtml).toContain("w-full");
    });

    it("supports disabled state preventing interaction", () => {
      const html = renderToStaticMarkup(<Button disabled>Disabled Action</Button>);
      expect(html).toContain("disabled");
      expect(html).toContain("disabled:pointer-events-none");
    });

    it("supports loading state with spinner, disabled attribute, and aria-busy", () => {
      const html = renderToStaticMarkup(<Button loading>Processing</Button>);

      expect(html).toContain("disabled");
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('data-loading=""');
      expect(html).toContain("animate-spin");
      expect(html).toContain("Processing");
    });

    it("supports asChild delegation for navigation links", () => {
      const html = renderToStaticMarkup(
        <Button asChild variant="primary">
          <a href="/shop">Browse Catalog</a>
        </Button>
      );

      expect(html).toContain('<a href="/shop"');
      expect(html).toContain("bg-vl-black text-vl-white");
      expect(html).toContain("Browse Catalog");
    });

    it("supports render prop for custom Base UI element rendering", () => {
      const html = renderToStaticMarkup(
        <Button render={<a href="/about" />}>About Us</Button>
      );

      expect(html).toContain('<a href="/about"');
      expect(html).toContain("About Us");
    });
  });

  describe("buttonVariants Helper", () => {
    it("exports buttonVariants cva function producing clean class strings", () => {
      const classes = buttonVariants({ variant: "outline", size: "lg", fullWidth: true });
      expect(classes).toContain("border border-border");
      expect(classes).toContain("h-12");
      expect(classes).toContain("w-full");
    });
  });
});
