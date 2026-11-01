export interface PosCartItem {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  size?: string | null;
  color?: string | null;
  price: number; // Unit selling/effective price
  costPrice: number;
  quantity: number;
  maxStock: number;
  image?: string | null;
}

export interface PosProductVariant {
  id: string;
  sku: string;
  size?: string | null;
  color?: string | null;
  costPrice: number;
  sellingPrice: number;
  discountPrice?: number | null;
  effectivePrice: number;
  availableStock: number;
}

export interface PosProductSummary {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  categoryIds: string[];
  categoryNames: string[];
  variants: PosProductVariant[];
  minPrice: number;
  maxPrice: number;
  totalAvailableStock: number;
}

export interface PosCategory {
  id: string;
  name: string;
  slug: string;
}

export type PosPaymentMethod = "CASH" | "BKASH" | "CARD" | "SPLIT";

export interface PosPaymentSplitInput {
  method: "CASH" | "BKASH" | "CARD";
  amount: number;
  tenderAmount?: number;
  reference?: string;
}

export interface PosPaymentSplitDetail {
  method: "CASH" | "BKASH" | "CARD";
  amount: number;
  tenderAmount?: number;
  changeDue?: number;
  reference?: string;
}

export interface PosCreateOrderInput {
  items: Array<{
    variantId: string;
    quantity: number;
  }>;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  paymentMethod: PosPaymentMethod;
  amountPaid: number;
  discount?: number;
  notes?: string;
  splitPayments?: PosPaymentSplitInput[];
}

export interface PosReceiptItem {
  name: string;
  sku: string;
  size?: string | null;
  color?: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface PosReceiptData {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  cashierName: string;
  cashierEmail: string;
  customerName: string;
  customerPhone: string;
  items: PosReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PosPaymentMethod;
  amountPaid: number;
  changeDue: number;
  notes?: string | null;
  splits?: PosPaymentSplitDetail[];
}

export interface PosActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

