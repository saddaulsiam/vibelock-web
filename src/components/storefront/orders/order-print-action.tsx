"use client";

import { useState } from "react";
import { Copy, Check, Printer } from "lucide-react";
import { printCustomerInvoice, type PrintableOrder } from "@/lib/orders/print-invoice";

export interface OrderPrintActionProps {
  orderNumber?: string;
  order?: PrintableOrder;
}

export function OrderPrintAction({ orderNumber: propOrderNumber, order }: OrderPrintActionProps) {
  const [copied, setCopied] = useState(false);
  const activeOrderNumber = order?.orderNumber ?? propOrderNumber ?? "";

  const handleCopy = async () => {
    if (!activeOrderNumber) return;
    try {
      await navigator.clipboard.writeText(activeOrderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handlePrint = () => {
    if (order) {
      printCustomerInvoice(order);
    } else {
      window.print();
    }
  };

  return (
    <div className="flex items-center gap-2 print:hidden">
      {activeOrderNumber && (
        <button
          type="button"
          onClick={handleCopy}
          className="group inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#101114]/15 bg-white px-3 py-1.5 text-xs font-semibold text-[#101114] transition-colors hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none active:scale-95"
          title="Copy Order ID"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-emerald-600" />
              <span className="text-emerald-700">Copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5 text-neutral-400 group-hover:text-[#101114]" />
              <span>Copy ID</span>
            </>
          )}
        </button>
      )}

      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#101114]/15 bg-white px-3 py-1.5 text-xs font-semibold text-[#101114] transition-colors hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:outline-none active:scale-95"
      >
        <Printer className="size-3.5 text-neutral-400" />
        <span>Print Receipt</span>
      </button>
    </div>
  );
}
