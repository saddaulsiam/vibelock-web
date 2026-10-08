import { z } from "zod";

export const SortOption = z.enum(["newest", "name-asc", "name-desc"]);
export type SortOptionType = z.infer<typeof SortOption>;

export const DiscoverySearchParamsSchema = z.object({
  q: z.string().optional().catch(undefined),
  category: z.string().optional().catch(undefined),
  size: z.string().optional().catch(undefined),
  color: z.string().optional().catch(undefined),
  minPrice: z.coerce.number().min(0).optional().catch(undefined),
  maxPrice: z.coerce.number().min(0).optional().catch(undefined),
  sort: SortOption.optional().catch(undefined).default("newest"),
  page: z.coerce.number().int().min(1).optional().catch(undefined).default(1),
});

export type DiscoverySearchParams = z.infer<typeof DiscoverySearchParamsSchema>;

export function parseDiscoverySearchParams(
  searchParams: Record<string, string | string[] | undefined>
): DiscoverySearchParams {
  const normalizedParams: Record<string, string | undefined> = {};

  for (const key in searchParams) {
    const val = searchParams[key];
    if (Array.isArray(val)) {
      normalizedParams[key] = val.join(",");
    } else {
      normalizedParams[key] = val;
    }
  }

  const parsed = DiscoverySearchParamsSchema.parse(normalizedParams);

  if (
    parsed.minPrice !== undefined &&
    parsed.maxPrice !== undefined &&
    parsed.minPrice > parsed.maxPrice
  ) {
    const temp = parsed.minPrice;
    parsed.minPrice = parsed.maxPrice;
    parsed.maxPrice = temp;
  }

  return parsed;
}
