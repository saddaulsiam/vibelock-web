export const RETURN_REASONS = [
  { value: "WRONG_SIZE", label: "Wrong Size (Too Small / Too Big)", requiresProof: false },
  { value: "DEFECTIVE", label: "Defective or Damaged Product", requiresProof: true },
  { value: "WRONG_ITEM", label: "Wrong Item Received", requiresProof: true },
  { value: "NOT_AS_EXPECTED", label: "Not as Expected / Quality Issue", requiresProof: false },
  { value: "OTHER", label: "Other Reason", requiresProof: false },
] as const;

export type ReturnReasonCategory = (typeof RETURN_REASONS)[number]["value"];

export interface ParsedReturnReason {
  category: string;
  categoryLabel: string;
  customerNote: string;
  images: string[];
  requiresProof: boolean;
  formattedDisplay: string;
}

export function parseReturnReason(raw: string | null | undefined): ParsedReturnReason {
  if (!raw) {
    return {
      category: "NOT_SPECIFIED",
      categoryLabel: "Not specified",
      customerNote: "",
      images: [],
      requiresProof: false,
      formattedDisplay: "No reason stated",
    };
  }

  try {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const parsed = JSON.parse(trimmed);
      const category = String(parsed.category || parsed.reason || "OTHER");
      const matched = RETURN_REASONS.find((r) => r.value === category);
      const categoryLabel = matched ? matched.label : category;
      const customerNote = String(parsed.customerNote || parsed.note || "");
      const images = Array.isArray(parsed.images)
        ? parsed.images.filter(
            (img: unknown): img is string =>
              typeof img === "string" && (img.startsWith("http") || img.startsWith("data:"))
          )
        : [];

      return {
        category,
        categoryLabel,
        customerNote,
        images,
        requiresProof: matched ? matched.requiresProof : false,
        formattedDisplay: customerNote ? `${categoryLabel} — "${customerNote}"` : categoryLabel,
      };
    }
  } catch {
    // Legacy plain string fallback
  }

  const matched = RETURN_REASONS.find((r) => r.value === raw);
  return {
    category: matched ? matched.value : "OTHER",
    categoryLabel: matched ? matched.label : raw,
    customerNote: matched ? "" : raw,
    images: [],
    requiresProof: matched ? matched.requiresProof : false,
    formattedDisplay: raw,
  };
}

export function serializeReturnReason({
  category,
  customerNote,
  images,
}: {
  category: string;
  customerNote?: string;
  images?: string[];
}): string {
  return JSON.stringify({
    category,
    customerNote: customerNote?.trim() || "",
    images: images || [],
  });
}
