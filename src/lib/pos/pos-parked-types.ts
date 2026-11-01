import type { PosCartItem } from "./pos-types";

export interface PosParkedCart {
  id: string;
  parkedAt: string;
  label: string;
  customerName: string;
  customerPhone: string;
  items: PosCartItem[];
  discount: number;
  notes?: string;
  totalValue: number;
  itemsCount: number;
}

