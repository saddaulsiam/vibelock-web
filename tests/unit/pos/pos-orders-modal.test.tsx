import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// Mock Radix Dialog for renderToStaticMarkup SSR testing
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children?: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children?: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/lib/pos/pos-order-history-actions", () => ({
  getPosTodayOrdersAction: vi.fn().mockResolvedValue({
    success: true,
    data: {
      orders: [],
      stats: {
        totalOrders: 0,
        totalRevenue: 0,
        cashTotal: 0,
        digitalTotal: 0,
      },
    },
  }),
}));

import { PosOrdersModal } from "@/components/pos/pos-orders-modal";
import { PosHeader } from "@/components/pos/pos-header";

describe("POS Orders History & Reprint", () => {
  describe("PosOrdersModal Component", () => {
    test("renders modal title, search input and stats strip", () => {
      const html = renderToStaticMarkup(
        <PosOrdersModal
          isOpen={true}
          onClose={vi.fn()}
          onReprintReceipt={vi.fn()}
        />
      );

      expect(html).toContain("Today&#x27;s Counter Sales &amp; Invoices");
      expect(html).toContain("Total Orders");
      expect(html).toContain("Total Sales");
      expect(html).toContain("Cash Tender");
      expect(html).toContain("Digital (bKash/Card)");
      expect(html).toContain("Search by Invoice #");
    });
  });

  describe("PosHeader Orders Action", () => {
    test("renders Orders [F5] button when onOpenOrdersModal handler provided", () => {
      const html = renderToStaticMarkup(
        <PosHeader
          cashierName="Saddam Hossain"
          cashierRole="STAFF"
          onOpenOrdersModal={vi.fn()}
        />
      );

      expect(html).toContain("Orders");
      expect(html).toContain("F5");
    });
  });
});

