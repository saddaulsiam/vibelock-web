import type { PosReceiptData, PosReceiptItem, PosPaymentMethod } from "./pos-types";

export interface PosOrderSummaryItem {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  itemsCount: number;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PosPaymentMethod;
  amountPaid: number;
  changeDue: number;
  cashierName: string;
  cashierEmail: string;
  items: PosReceiptItem[];
  status: string;
  receiptData: PosReceiptData;
}

export interface PosTodayOrdersStats {
  totalOrders: number;
  totalRevenue: number;
  cashTotal: number;
  digitalTotal: number;
}
