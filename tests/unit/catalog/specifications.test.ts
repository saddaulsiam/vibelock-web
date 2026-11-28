import {
  LIFESTYLE_PRESETS,
  parseProductSpecifications,
  type ProductSpecifications,
} from "@/lib/catalog/specifications";
import { describe, expect, it } from "vitest";

describe("Product Specifications - Lifestyle Catalog Engine", () => {
  it("returns null for null, undefined, empty, or invalid input", () => {
    expect(parseProductSpecifications(null)).toBeNull();
    expect(parseProductSpecifications(undefined)).toBeNull();
    expect(parseProductSpecifications("")).toBeNull();
    expect(parseProductSpecifications("   ")).toBeNull();
    expect(parseProductSpecifications("{}")).toBeNull();
    expect(parseProductSpecifications("invalid-json")).toBeNull();
    expect(parseProductSpecifications(123)).toBeNull();
  });

  it("safely parses valid JSON string payload", () => {
    const raw = JSON.stringify({
      categoryPreset: "leather",
      attributes: [
        { label: "Material", value: "Full-Grain Leather" },
        { label: "Dimensions", value: "11cm x 9cm" },
      ],
      careInstructions: ["Wipe clean with dry cloth."],
    });

    const parsed = parseProductSpecifications(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.categoryPreset).toBe("leather");
    expect(parsed?.attributes).toHaveLength(2);
    expect(parsed?.attributes[0]).toEqual({ label: "Material", value: "Full-Grain Leather" });
    expect(parsed?.careInstructions).toEqual(["Wipe clean with dry cloth."]);
  });

  it("handles object input directly from Prisma JsonValue", () => {
    const rawObj: ProductSpecifications = {
      categoryPreset: "apparel",
      attributes: [{ label: "Fabric", value: "100% Combed Cotton" }],
      careInstructions: ["Machine wash cold"],
    };

    const parsed = parseProductSpecifications(rawObj);
    expect(parsed).toEqual(rawObj);
  });

  it("filters out empty or invalid attribute entries", () => {
    const messy = {
      attributes: [
        { label: "Fabric", value: "Cotton" },
        { label: "", value: "Empty label" },
        { label: "No value", value: "   " },
        null,
        123,
      ],
      careInstructions: ["Valid care note", "", "   ", null],
    };

    const parsed = parseProductSpecifications(messy);
    expect(parsed).not.toBeNull();
    expect(parsed?.attributes).toEqual([{ label: "Fabric", value: "Cotton" }]);
    expect(parsed?.careInstructions).toEqual(["Valid care note"]);
  });

  it("verifies all lifestyle presets (Apparel, Headwear, Leather, Accessories) have valid structure", () => {
    const presets = ["apparel", "headwear", "leather", "accessories"] as const;

    for (const key of presets) {
      const preset = LIFESTYLE_PRESETS[key];
      expect(preset).toBeDefined();
      expect(preset.categoryPreset).toBe(key);
      expect(preset.attributes.length).toBeGreaterThanOrEqual(3);
      expect(preset.careInstructions.length).toBeGreaterThanOrEqual(2);

      for (const attr of preset.attributes) {
        expect(attr.label.trim().length).toBeGreaterThan(0);
        expect(attr.value.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
