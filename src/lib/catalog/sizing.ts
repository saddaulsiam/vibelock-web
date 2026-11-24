export type SizingCategory = "tops" | "bottoms" | "panjabi";
export type PreferredFit = "regular" | "slim" | "oversized";

export interface SizingRecommendation {
  category: SizingCategory;
  recommendedSize: string;
  chestOrWaist?: string;
  length?: string;
  fitNote: string;
  heightInput: string;
  weightInput?: number;
}

/**
 * Parses height string (e.g. "5'8\"", "5 feet 8 inch", "172 cm", "5.8") to height in inches.
 */
export function parseHeightToInches(input: string): number | null {
  const clean = input.trim().toLowerCase();

  // Pattern 1: cm (e.g. "175 cm", "175cm")
  const cmMatch = clean.match(/(\d{2,3})\s*(?:cm|centimeter)/);
  if (cmMatch) {
    const cm = parseFloat(cmMatch[1]);
    return cm > 100 && cm < 250 ? Math.round(cm / 2.54) : null;
  }

  // Pattern 2: feet and inches (e.g. 5'8", 5' 8", 5 feet 8 inch, 5 ft 8 in, 5-8)
  const ftInMatch = clean.match(/(\d)\s*(?:'|ft|feet|\s|-)\s*(\d{1,2})?\s*(?:"|in|inch)?/);
  if (ftInMatch) {
    const feet = parseInt(ftInMatch[1], 10);
    const inches = ftInMatch[2] ? parseInt(ftInMatch[2], 10) : 0;
    if (feet >= 4 && feet <= 7 && inches >= 0 && inches < 12) {
      return feet * 12 + inches;
    }
  }

  // Pattern 3: single number cm without unit if > 120 (e.g. "172")
  const num = parseFloat(clean);
  if (!isNaN(num)) {
    if (num > 120 && num < 250) {
      return Math.round(num / 2.54);
    }
    // E.g. "5.8" or "5.9" representing 5'8" or 5'9"
    if (num >= 4.0 && num <= 7.0) {
      const feet = Math.floor(num);
      const inches = Math.round((num - feet) * 10);
      return feet * 12 + inches;
    }
  }

  return null;
}

/**
 * Deterministic VibeLock size recommendation based on official measurements and sizing charts.
 */
export function recommendSize({
  category = "tops",
  height,
  weight,
  preferredFit = "regular",
}: {
  category?: SizingCategory;
  height: string;
  weight?: number;
  preferredFit?: PreferredFit;
}): SizingRecommendation {
  const heightInches = parseHeightToInches(height);

  if (category === "bottoms") {
    let baseSize = "32";
    let fitNote = "স্বাচ্ছন্দ্যময় ওয়াইড-লেগ কার্গো / ডেনিম ড্র্যাপ";

    if (weight) {
      if (weight <= 58) {
        baseSize = "28 – 30";
        fitNote = "টেইলরড ওয়েস্ট ও ক্লিন স্নিকার স্ট্যাক ফিট";
      } else if (weight <= 68) {
        baseSize = "31 – 32";
        fitNote = "রিল্যাক্সড ওয়াইড-লেগ কার্গো / ডেনিম ড্র্যাপ";
      } else if (weight <= 78) {
        baseSize = "33 – 34";
        fitNote = "কমফোর্টেবল মিড-রাইজ ও ফুল থাই রুম";
      } else if (weight <= 88) {
        baseSize = "36";
        fitNote = "স্ট্রিটওয়্যার রিল্যাক্সড কাট";
      } else {
        baseSize = "38 – 40";
        fitNote = "ম্যাক্সিমাম কমফোর্ট ও ওয়াইড লেগ ড্র্যাপ";
      }
    } else if (heightInches) {
      if (heightInches <= 66) baseSize = "28 – 30";
      else if (heightInches <= 69) baseSize = "31 – 32";
      else if (heightInches <= 71) baseSize = "33 – 34";
      else if (heightInches <= 73) baseSize = "36";
      else baseSize = "38 – 40";
    }

    return {
      category: "bottoms",
      recommendedSize: baseSize,
      fitNote,
      heightInput: height,
      weightInput: weight,
    };
  }

  if (category === "panjabi") {
    let size = "40";
    let chest = '42"';
    let length = '42"';

    if (heightInches) {
      if (heightInches <= 66) {
        size = "38";
        chest = '40"';
        length = '40"';
      } else if (heightInches <= 69) {
        size = "40";
        chest = '42"';
        length = '42"';
      } else if (heightInches <= 71) {
        size = "42";
        chest = '44"';
        length = '44"';
      } else {
        size = "44";
        chest = '46"';
        length = '45"';
      }
    }

    return {
      category: "panjabi",
      recommendedSize: size,
      chestOrWaist: chest,
      length,
      fitNote: "টেইলরড ক্লাসিক পাঞ্জাবি ফিট",
      heightInput: height,
      weightInput: weight,
    };
  }

  // Default: TOPS (T-Shirts, Drop Shoulder, Shirts)
  const sizesOrder = ["S", "M", "L", "XL", "XXL"];
  let baseIndex = 1; // Default to M

  if (weight) {
    if (weight <= 58)
      baseIndex = 0; // S
    else if (weight <= 68)
      baseIndex = 1; // M
    else if (weight <= 78)
      baseIndex = 2; // L
    else if (weight <= 88)
      baseIndex = 3; // XL
    else baseIndex = 4; // XXL
  } else if (heightInches) {
    if (heightInches <= 66)
      baseIndex = 0; // S (<= 5'6")
    else if (heightInches <= 69)
      baseIndex = 1; // M (5'7" - 5'9")
    else if (heightInches <= 71)
      baseIndex = 2; // L (5'9" - 5'11")
    else if (heightInches <= 73)
      baseIndex = 3; // XL (5'11" - 6'1")
    else baseIndex = 4; // XXL (> 6'1")
  }

  // Adjust for preferredFit
  if (preferredFit === "oversized" && baseIndex < sizesOrder.length - 1) {
    baseIndex += 1;
  } else if (preferredFit === "slim" && baseIndex > 0) {
    baseIndex -= 1;
  }

  const finalSize = sizesOrder[baseIndex];

  const specs: Record<string, { chest: string; length: string; fitNote: string }> = {
    S: {
      chest: "38 – 40 ইঞ্চি",
      length: "27.5 ইঞ্চি",
      fitNote: "স্ট্রিটওয়্যার বক্সি ফিট (ড্রপ শোল্ডার)",
    },
    M: {
      chest: "40 – 42 ইঞ্চি",
      length: "28.5 ইঞ্চি",
      fitNote: "সিগনেচার VibeLock রিল্যাক্সড ড্র্যাপ",
    },
    L: {
      chest: "42 – 44 ইঞ্চি",
      length: "29.5 ইঞ্চি",
      fitNote: "অথেনটিক স্ট্রিটওয়্যার রিল্যাক্সড সিলুয়েট",
    },
    XL: {
      chest: "44 – 46 ইঞ্চি",
      length: "30.5 ইঞ্চি",
      fitNote: "ওভারসাইজড সিলুয়েট ও স্পেসিয়াস ফিট",
    },
    XXL: {
      chest: "46 – 48 ইঞ্চি",
      length: "31.5 ইঞ্চি",
      fitNote: "ম্যাক্সিমাম ওভারসাইজড স্ট্রিটওয়্যার এস্থেটিক",
    },
  };

  return {
    category: "tops",
    recommendedSize: finalSize,
    chestOrWaist: specs[finalSize].chest,
    length: specs[finalSize].length,
    fitNote: specs[finalSize].fitNote,
    heightInput: height,
    weightInput: weight,
  };
}
