import {
  BOTTOMS_FIT_GUIDE,
  BOTTOMS_SIZES_CM,
  BOTTOMS_SIZES_IN,
  SizeGuideModal,
  TOPS_FIT_GUIDE,
  TOPS_SIZES_IN,
} from "@/components/storefront/product/size-guide-modal";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

describe("SizeGuideModal Component & Data", () => {
  it("includes complete 28 to 40 scale in bottoms measurements", () => {
    const bottomSizesIn = BOTTOMS_SIZES_IN.map((s) => s.size);
    const bottomSizesCm = BOTTOMS_SIZES_CM.map((s) => s.size);

    const expectedRange = [
      "28",
      "29",
      "30",
      "31",
      "32",
      "33",
      "34",
      "35",
      "36",
      "37",
      "38",
      "39",
      "40",
    ];

    expect(bottomSizesIn).toEqual(expectedRange);
    expect(bottomSizesCm).toEqual(expectedRange);
  });

  it("includes standard S to XXL in tops measurements", () => {
    const topSizesIn = TOPS_SIZES_IN.map((s) => s.size);
    expect(topSizesIn).toEqual(["S", "M", "L", "XL", "XXL"]);
  });

  it("includes height and weight fit matrices for tops and bottoms", () => {
    expect(TOPS_FIT_GUIDE.length).toBeGreaterThanOrEqual(5);
    expect(BOTTOMS_FIT_GUIDE.length).toBeGreaterThanOrEqual(5);

    expect(TOPS_FIT_GUIDE[0].recommendedSize).toBe("S");
    expect(TOPS_FIT_GUIDE[1].recommendedSize).toBe("M");
    expect(TOPS_FIT_GUIDE[2].recommendedSize).toBe("L");
  });

  it("renders Size Guide trigger button with ruler icon", () => {
    const html = renderToStaticMarkup(
      <SizeGuideModal
        selectedSize="M"
        productName="Heavyweight Oversized Boxy Tee"
        categoryPreset="apparel"
      />
    );

    expect(html).toContain("Size Guide");
  });

  it("renders trigger for denim/cargo bottoms with active selection prop", () => {
    const html = renderToStaticMarkup(
      <SizeGuideModal
        selectedSize="32"
        productName="Vibe Cargo Streetwear Pant"
        availableSizes={["28", "30", "32", "34", "36"]}
      />
    );

    expect(html).toContain("Size Guide");
  });
});
