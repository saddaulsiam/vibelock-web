export type PosReturnReason =
  "SIZE_MISMATCH" | "DEFECTIVE_OR_DAMAGED" | "WRONG_ITEM" | "CUSTOMER_CHANGE_OF_MIND" | "OTHER";

export type PosItemCondition = "RESELLABLE" | "DAMAGED";

export interface PosReturnableItem {
  orderItemId: string;
  productName: string;
  sku: string;
  size?: string | null;
  color?: string | null;
  unitPrice: number;
  originalQuantity: number;
  returnableQuantity: number;
}

export interface PosOrderLookupResult {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  salesChannel: string;
  total: number;
  items: PosReturnableItem[];
  daysElapsed: number;
  isReturnablePeriodValid: boolean; // within 7 days
}

export interface PosReturnSelectedItem {
  orderItemId: string;
  quantity: number;
  reason: PosReturnReason;
  condition: PosItemCondition;
}

export interface PosExchangeReplacementItem {
  variantId: string;
  productName: string;
  sku: string;
  size?: string | null;
  color?: string | null;
  unitPrice: number;
  quantity: number;
}

export interface PosProcessReturnInput {
  orderId: string;
  returnedItems: PosReturnSelectedItem[];
  resolution: "REFUND_CASH" | "EXCHANGE";
  exchangeItems?: PosExchangeReplacementItem[];
  notes?: string;
}

export interface PosReturnReceiptData {
  returnMemoNumber: string;
  originalOrderNumber: string;
  createdAt: string;
  cashierName: string;
  customerName: string;
  customerPhone: string;
  returnedItems: Array<{
    name: string;
    sku: string;
    size?: string | null;
    color?: string | null;
    unitPrice: number;
    quantity: number;
    condition: PosItemCondition;
    lineTotal: number;
  }>;
  exchangeItems: Array<{
    name: string;
    sku: string;
    size?: string | null;
    color?: string | null;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }>;
  totalReturnValue: number;
  totalExchangeValue: number;
  netDifference: number; // exchangeValue - returnValue
  netAction: "REFUND_TO_CUSTOMER" | "CHARGE_CUSTOMER" | "EVEN_EXCHANGE";
  notes?: string | null;
}
