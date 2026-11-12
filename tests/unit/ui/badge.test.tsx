import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { Badge } from "@/components/ui/badge";

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>["variant"]>;
type BadgeSize = NonNullable<ComponentProps<typeof Badge>["size"]>;

describe("Unified Global Badge Component", () => {
  describe("Variants", () => {
    const variants: { name: BadgeVariant; expectedClass: string }[] = [
      { name: "default", expectedClass: "bg-primary text-primary-foreground" },
      { name: "secondary", expectedClass: "bg-secondary text-secondary-foreground" },
      { name: "outline", expectedClass: "border-border text-foreground" },
      { name: "cyan", expectedClass: "bg-vl-cyan-100 text-vl-cyan-dark" },
      { name: "brand", expectedClass: "bg-vl-black text-vl-white" },
      { name: "sale", expectedClass: "bg-status-sale text-white" },
      { name: "new", expectedClass: "bg-status-sale text-white" },
      { name: "featured", expectedClass: "bg-amber-400 text-vl-black" },
      { name: "success", expectedClass: "bg-emerald-100 text-emerald-800" },
      { name: "warning", expectedClass: "bg-amber-100 text-amber-800" },
      { name: "error", expectedClass: "bg-rose-100 text-rose-800" },
      { name: "glow", expectedClass: "bg-vl-cyan/15 text-vl-cyan" },
      { name: "dark", expectedClass: "bg-vl-dark-900 text-white" },
      { name: "glass", expectedClass: "bg-black/55 backdrop-blur-md text-white" },
      { name: "vip", expectedClass: "bg-amber-500/10 text-amber-500" },
      { name: "drop", expectedClass: "bg-purple-100 text-purple-800" },
      { name: "info", expectedClass: "bg-blue-100 text-blue-800" },
    ];

    for (const { name, expectedClass } of variants) {
      it(`renders variant="${name}" with design token classes`, () => {
        const html = renderToStaticMarkup(<Badge variant={name}>{name} status</Badge>);
        for (const cls of expectedClass.split(" ")) {
          expect(html).toContain(cls);
        }
      });
    }
  });

  describe("Sizes", () => {
    const sizes: { name: BadgeSize; expectedClass: string }[] = [
      { name: "sm", expectedClass: "h-4.5 px-1.5 text-3xs" },
      { name: "default", expectedClass: "h-5 px-2 text-2xs" },
      { name: "lg", expectedClass: "h-6 px-2.5 text-xs" },
      { name: "xl", expectedClass: "h-7 px-3 text-xs" },
    ];

    for (const { name, expectedClass } of sizes) {
      it(`renders size="${name}" with standard dimensions`, () => {
        const html = renderToStaticMarkup(<Badge size={name}>Label</Badge>);
        for (const cls of expectedClass.split(" ")) {
          expect(html).toContain(cls);
        }
      });
    }
  });

  describe("Shapes", () => {
    it("renders default shape as rounded-full (pill)", () => {
      const html = renderToStaticMarkup(<Badge>Pill</Badge>);
      expect(html).toContain("rounded-full");
    });

    it("renders shape='square' with rounded-brand brutalist style", () => {
      const html = renderToStaticMarkup(<Badge shape="square">Square</Badge>);
      expect(html).toContain("rounded-brand");
    });

    it("renders shape='sharp' with rounded-none unrounded style", () => {
      const html = renderToStaticMarkup(<Badge shape="sharp">Sharp</Badge>);
      expect(html).toContain("rounded-none");
    });
  });

  describe("Status Dots & Radar Ping", () => {
    it("renders solid dot indicator when dot=true", () => {
      const html = renderToStaticMarkup(
        <Badge variant="success" dot>
          In Stock
        </Badge>
      );
      expect(html).toContain("size-1.5");
      expect(html).toContain("bg-emerald-500");
    });

    it("renders radar pulse animation when dot='pulse'", () => {
      const html = renderToStaticMarkup(
        <Badge variant="cyan" dot="pulse">
          Live Drop
        </Badge>
      );
      expect(html).toContain("animate-ping");
      expect(html).toContain("bg-vl-cyan");
    });
  });

  describe("Icon & Removable Button", () => {
    it("renders prefix icon", () => {
      const html = renderToStaticMarkup(
        <Badge icon={<span data-testid="prefix-icon" />}>Verified</Badge>
      );
      expect(html).toContain('data-testid="prefix-icon"');
    });

    it("renders accessible remove button when removable=true", () => {
      const html = renderToStaticMarkup(
        <Badge removable removeLabel="Remove size filter">
          Size: L
        </Badge>
      );
      expect(html).toContain('aria-label="Remove size filter"');
      expect(html).toContain("<button");
    });
  });

  describe("Custom overrides and attributes", () => {
    it("merges custom className without dropping variant classes", () => {
      const html = renderToStaticMarkup(
        <Badge variant="cyan" className="custom-extra-class">
          Verified
        </Badge>
      );
      expect(html).toContain("custom-extra-class");
      expect(html).toContain("bg-vl-cyan-100");
    });
  });
});
