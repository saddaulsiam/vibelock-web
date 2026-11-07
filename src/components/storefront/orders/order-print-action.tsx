"use client";

import { useState } from "react";
import { Copy, Check, Printer } from "lucide-react";
import { printCustomerInvoice, type PrintableOrder } from "@/lib/orders/print-invoice";
import { Button } from "@/components/ui/button";

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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
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
        </Button>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handlePrint}
      >
        <Printer className="size-3.5 text-neutral-400" />
        <span>Print Receipt</span>
      </Button>
    </div>
  );
}
