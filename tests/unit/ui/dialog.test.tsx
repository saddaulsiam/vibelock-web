import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DialogHeader,
  DialogFooter,
  dialogContentVariants,
} from "@/components/ui/dialog";

describe("Unified Global Dialog / Modal Component", () => {
  describe("Content Variants", () => {
    const variants = [
      { name: "default", expectedClass: "bg-popover text-popover-foreground border-border" },
      { name: "brand", expectedClass: "bg-white text-[#101114] border-[#101114]/10" },
      { name: "dark", expectedClass: "bg-surface-dark text-vl-white border-border-dark" },
    ] as const;

    for (const { name, expectedClass } of variants) {
      it(`computes variant="${name}" classes accurately`, () => {
        const cls = dialogContentVariants({ variant: name });
        for (const part of expectedClass.split(" ")) {
          expect(cls).toContain(part);
        }
      });
    }
  });

  describe("Content Sizes", () => {
    const sizes = [
      { name: "sm", expectedClass: "sm:max-w-sm" },
      { name: "default", expectedClass: "sm:max-w-md" },
      { name: "lg", expectedClass: "sm:max-w-lg" },
      { name: "xl", expectedClass: "sm:max-w-xl" },
      { name: "2xl", expectedClass: "sm:max-w-2xl" },
      { name: "full", expectedClass: "sm:max-w-4xl" },
    ] as const;

    for (const { name, expectedClass } of sizes) {
      it(`computes size="${name}" max-width class accurately`, () => {
        const cls = dialogContentVariants({ size: name });
        expect(cls).toContain(expectedClass);
      });
    }
  });

  describe("Header, Title, Description, and Footer", () => {
    it("renders dialog typography and layout structure within Dialog root", () => {
      const html = renderToStaticMarkup(
        <div>
          <DialogHeader>
            <h2 className="text-base font-semibold">Modal Heading</h2>
            <p className="text-sm text-neutral-500">Modal description for user context</p>
          </DialogHeader>
          <DialogFooter>
            <button type="button">Confirm</button>
          </DialogFooter>
        </div>
      );

      expect(html).toContain("Modal Heading");
      expect(html).toContain("Modal description for user context");
      expect(html).toContain("Confirm");
      expect(html).toContain("data-slot=\"dialog-header\"");
      expect(html).toContain("data-slot=\"dialog-footer\"");
    });
  });
});
