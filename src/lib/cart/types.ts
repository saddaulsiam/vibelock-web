import { ProductVariantSummary } from "@/lib/catalog/types";

export interface CartItemDTO {
  id: string;
  variantId: string;
  quantity: number;
  variant: ProductVariantSummary;
  productSlug: string;
  productName: string;
  productImage: string | null;
  lineTotal: number;
  availableQuantity: number;
}

export interface CartDTO {
  id: string;
  items: CartItemDTO[];
  subtotal: number;
  totalQuantity: number;
}
