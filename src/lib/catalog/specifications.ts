export interface ProductSpecificationAttribute {
  label: string;
  value: string;
}

export type LifestyleCategoryPreset =
  | "apparel"
  | "headwear"
  | "leather"
  | "accessories"
  | "custom";

export interface ProductSpecifications {
  categoryPreset?: LifestyleCategoryPreset;
  attributes: ProductSpecificationAttribute[];
  careInstructions: string[];
}

export const LIFESTYLE_PRESETS: Record<
  Exclude<LifestyleCategoryPreset, "custom">,
  ProductSpecifications
> = {
  apparel: {
    categoryPreset: "apparel",
    attributes: [
      { label: "Fabric", value: "100% Combed Compact Cotton" },
      { label: "Weight", value: "260 GSM Heavyweight French Terry" },
      { label: "Fit Type", value: "Streetwear Boxy / Drop Shoulder" },
      { label: "Origin", value: "Crafted in Dhaka, BD" },
    ],
    careInstructions: [
      "Machine wash cold inside out with similar colors.",
      "Do not tumble dry. Hang dry in shade to preserve screenprints.",
      "Iron inside-out on low heat; avoid direct iron on print details.",
    ],
  },
  headwear: {
    categoryPreset: "headwear",
    attributes: [
      { label: "Crown", value: "6-Panel Structured High Profile" },
      { label: "Fabric", value: "Heavyweight Cotton Chino Twill" },
      { label: "Visor", value: "Pre-Curved Streetwear Brim" },
      { label: "Closure", value: "Custom Embossed Metal Buckle" },
    ],
    careInstructions: [
      "Spot clean only with a soft damp cloth.",
      "Do not machine wash or immerse in water.",
      "Store on a cap stand to preserve crown shape.",
    ],
  },
  leather: {
    categoryPreset: "leather",
    attributes: [
      { label: "Material", value: "Full-Grain Cowhide Leather" },
      { label: "Hardware", value: "Custom Matte Black YKK Zippers" },
      { label: "Dimensions", value: "11.5 cm x 9.0 cm x 1.8 cm" },
      { label: "Capacity", value: "6 Card Slots + Dual Cash Sleeves" },
    ],
    careInstructions: [
      "Wipe clean with a dry microfiber cloth.",
      "Treat with specialized leather conditioner every 6 months.",
      "Keep away from direct heat and water.",
    ],
  },
  accessories: {
    categoryPreset: "accessories",
    attributes: [
      { label: "Material", value: "316L Surgical Stainless Steel" },
      { label: "Finish", value: "Electroplated High-Polish Matte Black" },
      { label: "Properties", value: "Water-Resistant & Hypoallergenic" },
      { label: "Origin", value: "Precision Engineered" },
    ],
    careInstructions: [
      "Avoid direct contact with harsh perfumes or chlorine.",
      "Polish gently with a soft microfiber cloth after wear.",
      "Store in original protective dust pouch.",
    ],
  },
};

/**
 * Safely parse raw JSON or object from Prisma JSONB field into structured ProductSpecifications.
 * Falls back gracefully to null if input is missing or malformed.
 */
export function parseProductSpecifications(raw: unknown): ProductSpecifications | null {
  if (!raw) return null;

  try {
    let parsed = raw;
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (!trimmed || trimmed === "null" || trimmed === "{}") return null;
      parsed = JSON.parse(trimmed);
    }

    if (typeof parsed !== "object" || parsed === null) return null;

    const data = parsed as Record<string, unknown>;
    const attributes: ProductSpecificationAttribute[] = [];
    const careInstructions: string[] = [];

    if (Array.isArray(data.attributes)) {
      for (const item of data.attributes) {
        if (item && typeof item === "object") {
          const rec = item as Record<string, unknown>;
          if (typeof rec.label === "string" && typeof rec.value === "string") {
            const label = rec.label.trim();
            const value = rec.value.trim();
            if (label && value) {
              attributes.push({ label, value });
            }
          }
        }
      }
    }

    if (Array.isArray(data.careInstructions)) {
      for (const item of data.careInstructions) {
        if (typeof item === "string" && item.trim()) {
          careInstructions.push(item.trim());
        }
      }
    }

    if (attributes.length === 0 && careInstructions.length === 0) {
      return null;
    }

    return {
      categoryPreset:
        typeof data.categoryPreset === "string"
          ? (data.categoryPreset as LifestyleCategoryPreset)
          : undefined,
      attributes,
      careInstructions,
    };
  } catch {
    return null;
  }
}
