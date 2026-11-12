import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { selectTriggerVariants } from "@/components/ui/select";
import { NativeSelect } from "@/components/ui/select-native";

describe("Unified Global Select Component", () => {
  describe("SelectTrigger Variants", () => {
    const variants = [
      { name: "default", expectedClass: "rounded-brand" },
      { name: "brand", expectedClass: "rounded-brand border-neutral-200" },
      {
        name: "dark",
        expectedClass: "bg-surface-dark border-[var(--color-border-dark-input)] text-white",
      },
    ] as const;

    for (const { name, expectedClass } of variants) {
      it(`computes variant="${name}" styling consistently`, () => {
        const cls = selectTriggerVariants({ variant: name });
        for (const part of expectedClass.split(" ")) {
          expect(cls).toContain(part);
        }
      });
    }
  });

  describe("SelectTrigger Sizes", () => {
    const sizes = [
      { name: "sm", expectedClass: "h-7 text-xs" },
      { name: "default", expectedClass: "h-8" },
      { name: "lg", expectedClass: "h-10 text-sm" },
      { name: "xl", expectedClass: "h-12 text-base" },
    ] as const;

    for (const { name, expectedClass } of sizes) {
      it(`matches input height and typography for size="${name}"`, () => {
        const cls = selectTriggerVariants({ size: name });
        for (const part of expectedClass.split(" ")) {
          expect(cls).toContain(part);
        }
      });
    }
  });

  describe("NativeSelect Consistency", () => {
    it("renders native select with chevron icon and standard accessible slot", () => {
      const html = renderToStaticMarkup(
        <NativeSelect defaultValue="dhaka" variant="brand" size="lg">
          <option value="dhaka">Dhaka</option>
          <option value="chittagong">Chittagong</option>
        </NativeSelect>
      );

      expect(html).toContain('data-slot="native-select"');
      expect(html).toContain("rounded-brand");
      expect(html).toContain("h-10");
      expect(html).toContain("Dhaka");
      expect(html).toContain("Chittagong");
    });
  });
});
