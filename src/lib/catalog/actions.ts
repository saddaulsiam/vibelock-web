"use server";

import { getDiscoveredProducts, type DiscoveryResult } from "./discovery";
import { parseDiscoverySearchParams } from "./validation";

export async function loadMoreProductsAction(
  searchParams: Record<string, string | string[] | undefined>,
  page: number
): Promise<DiscoveryResult> {
  const parsedParams = parseDiscoverySearchParams({
    ...searchParams,
    page: String(page),
  });

  return getDiscoveredProducts(parsedParams);
}

