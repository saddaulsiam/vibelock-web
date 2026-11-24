import { describe, it, expect } from "vitest";
import { parseHeightToInches, recommendSize } from "@/lib/catalog/sizing";

describe("Catalog Sizing Utilities", () => {
  describe("parseHeightToInches", () => {
    it("parses feet and inches correctly", () => {
      expect(parseHeightToInches("5'8\"")).toBe(68);
      expect(parseHeightToInches("5 feet 8 inch")).toBe(68);
      expect(parseHeightToInches("6'1\"")).toBe(73);
      expect(parseHeightToInches("5-10")).toBe(70);
    });

    it("parses centimeters correctly", () => {
      expect(parseHeightToInches("175 cm")).toBe(69);
      expect(parseHeightToInches("165cm")).toBe(65);
    });

    it("returns null for invalid inputs", () => {
      expect(parseHeightToInches("abc")).toBeNull();
      expect(parseHeightToInches("")).toBeNull();
    });
  });

  describe("recommendSize", () => {
    it("recommends size S for lower height/weight", () => {
      const rec = recommendSize({
        category: "tops",
        height: "5'5\"",
        weight: 55,
      });
      expect(rec.recommendedSize).toBe("S");
      expect(rec.fitNote).toContain("স্ট্রিটওয়্যার বক্সি ফিট");
    });

    it("recommends size L for 5'10\" and 75 kg", () => {
      const rec = recommendSize({
        category: "tops",
        height: "5'10\"",
        weight: 75,
      });
      expect(rec.recommendedSize).toBe("L");
    });

    it("handles panjabi category", () => {
      const rec = recommendSize({
        category: "panjabi",
        height: "5'8\"",
      });
      expect(rec.recommendedSize).toBe("40");
      expect(rec.chestOrWaist).toBe("42\"");
    });
  });
});
