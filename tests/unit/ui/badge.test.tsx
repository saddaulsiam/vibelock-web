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
      { name: "cyan", expectedClass: "bg-vl-cyan/15 text-vl-cyan-dark" },
      { name: "brand", expectedClass: "bg-vl-black text-vl-white" },
      { name: "sale", expectedClass: "bg-[#E50010] text-white" },
      { name: "new", expectedClass: "bg-[#E50010] text-white" },
      { name: "featured", expectedClass: "bg-amber-400 text-vl-black" },
      { name: "success", expectedClass: "bg-emerald-100 text-emerald-800" },
      { name: "warning", expectedClass: "bg-amber-100 text-amber-800" },
      { name: "error", expectedClass: "bg-rose-100 text-rose-800" },
    ];

    for (const { name, expectedClass } of variants) {
      it(`renders variant="${name}" with design token classes`, () => {
        const html = renderToStaticMarkup(
          <Badge variant={name}>{name} status</Badge>
        );
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
    ];

    for (const { name, expectedClass } of sizes) {
      it(`renders size="${name}" with standard dimensions`, () => {
        const html = renderToStaticMarkup(
          <Badge size={name}>Label</Badge>
        );
        for (const cls of expectedClass.split(" ")) {
          expect(html).toContain(cls);
        }
      });
    }
  });

  describe("Custom overrides and attributes", () => {
    it("merges custom className without dropping variant classes", () => {
      const html = renderToStaticMarkup(
        <Badge variant="cyan" className="custom-extra-class">Verified</Badge>
      );
      expect(html).toContain("custom-extra-class");
      expect(html).toContain("bg-vl-cyan/15");
    });
  });
});

