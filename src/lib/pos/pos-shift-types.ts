export type PosShiftStatus = "OPEN" | "CLOSED";

export interface PosCashDropItem {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
  cashierName: string;
}

export interface PosShiftSummary {
  shiftId: string;
  isOpen: boolean;
  openedAt: string;
  closedAt?: string | null;
  cashierId: string;
  cashierName: string;
  openingFloat: number;
  cashSales: number;
  bkashSales: number;
  cardSales: number;
  totalSales: number;
  cashDrops: number;
  ordersCount: number;
  expectedCash: number; // openingFloat + cashSales - cashDrops
  notes?: string | null;
}

export interface PosZReportData {
  reportId: string;
  shiftId: string;
  cashierName: string;
  cashierEmail: string;
  openedAt: string;
  closedAt: string;
  openingFloat: number;
  cashSales: number;
  bkashSales: number;
  cardSales: number;
  totalSales: number;
  totalOrders: number;
  cashDrops: number;
  expectedCash: number;
  countedCash: number;
  variance: number; // countedCash - expectedCash
  varianceStatus: "EXACT" | "SHORTAGE" | "SURPLUS";
  closingNotes?: string | null;
}

export interface OpenShiftInput {
  openingFloat: number;
  notes?: string;
}

export interface RecordCashDropInput {
  amount: number;
  reason: string;
}

export interface CloseShiftInput {
  countedCash: number;
  notes?: string;
}
