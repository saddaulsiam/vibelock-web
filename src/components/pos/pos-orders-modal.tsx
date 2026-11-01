"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import {
  Receipt,
  Search,
  Printer,
  RefreshCw,
  Banknote,
  QrCode,
  CreditCard,
  Phone,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getPosTodayOrdersAction } from "@/lib/pos/pos-order-history-actions";
import type { PosOrderSummaryItem, PosTodayOrdersStats } from "@/lib/pos/pos-order-history-types";
import type { PosReceiptData } from "@/lib/pos/pos-types";
import { toast } from "sonner";

interface PosOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReprintReceipt: (receipt: PosReceiptData) => void;
}

export function PosOrdersModal({ isOpen, onClose, onReprintReceipt }: PosOrdersModalProps) {
  const [orders, setOrders] = useState<PosOrderSummaryItem[]>([]);
  const [stats, setStats] = useState<PosTodayOrdersStats>({
    totalOrders: 0,
    totalRevenue: 0,
    cashTotal: 0,
    digitalTotal: 0,
  });
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const fetchOrders = useCallback((query?: string) => {
    startTransition(async () => {
      const res = await getPosTodayOrdersAction(query);
      if (res.success && res.data) {
        setOrders(res.data.orders);
        setStats(res.data.stats);
      } else {
        toast.error(res.error || "Failed to load counter orders.");
      }
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchOrders();
    }
  }, [isOpen, fetchOrders]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders(searchQuery);
  };

  const handleResetSearch = () => {
    setSearchQuery("");
    fetchOrders("");
  };

  const formatOrderTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const renderPaymentBadge = (method: string) => {
    switch (method) {
      case "BKASH":
        return (
          <Badge className="flex items-center space-x-1 border-pink-200 bg-pink-100 text-pink-700 hover:bg-pink-100">
            <QrCode className="h-3 w-3" />
            <span>bKash</span>
          </Badge>
        );
      case "CARD":
        return (
          <Badge className="flex items-center space-x-1 border-blue-200 bg-blue-100 text-blue-700 hover:bg-blue-100">
            <CreditCard className="h-3 w-3" />
            <span>Card</span>
          </Badge>
        );
      default:
        return (
          <Badge className="flex items-center space-x-1 border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
            <Banknote className="h-3 w-3" />
            <span>Cash</span>
          </Badge>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-xl flex-col rounded-2xl border border-[#e2ded2] bg-white p-6 shadow-2xl lg:max-w-2xl">
        {/* Header */}
        <DialogHeader className="flex-shrink-0 border-b border-[#f0ede6] pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-vl-black">
              <div className="rounded-xl border border-vl-cyan/40 bg-vl-black p-2 text-vl-cyan shadow-[0_0_12px_rgba(0,217,255,0.25)]">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-heading font-black text-lg tracking-tight text-vl-black">
                  Today&apos;s Counter Sales &amp; Invoices
                </DialogTitle>
                <DialogDescription className="text-xs text-vl-grey">
                  Real-time sales history for today&apos;s counter register. Instant receipt
                  reprint.
                </DialogDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fetchOrders(searchQuery)}
              disabled={isPending}
              className="flex h-9 items-center space-x-1.5 rounded-xl border-[#d6d2c4] text-xs font-bold text-vl-black hover:border-vl-cyan hover:bg-[#faf9f5]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin text-vl-cyan" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Stats Summary Bar */}
        <div className="my-3 grid flex-shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-[#e2ded2] bg-[#faf9f5] p-2.5 shadow-2xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-vl-grey">Total Orders</span>
            <span className="font-heading font-mono text-lg font-black text-vl-black">{stats.totalOrders}</span>
          </div>
          <div className="rounded-xl border border-vl-border bg-vl-black p-2.5 text-vl-white shadow-xs">
            <span className="block text-[10px] font-heading font-black uppercase tracking-widest text-vl-grey">Total Sales</span>
            <span className="font-heading font-mono text-lg font-black text-vl-cyan">
              ৳{stats.totalRevenue.toLocaleString()}
            </span>
          </div>
          <div className="rounded-xl border border-[#e2ded2] bg-[#faf9f5] p-2.5 shadow-2xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-vl-grey">Cash Tender</span>
            <span className="font-heading font-mono text-lg font-black text-emerald-600">
              ৳{stats.cashTotal.toLocaleString()}
            </span>
          </div>
          <div className="rounded-xl border border-[#e2ded2] bg-[#faf9f5] p-2.5 shadow-2xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-vl-grey">
              Digital (bKash/Card)
            </span>
            <span className="font-heading font-mono text-lg font-black text-vl-black">
              ৳{stats.digitalTotal.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Search Toolbar */}
        <form onSubmit={handleSearchSubmit} className="mb-3 flex flex-shrink-0 gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Invoice # (e.g. VL-POS-...), customer phone or name..."
              className="h-9 rounded-xl border-[#d6d2c4] bg-[#faf9f5] pl-9 text-xs transition-all focus-visible:bg-white focus-visible:border-vl-cyan focus-visible:ring-4 focus-visible:ring-vl-cyan/15"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            className="h-9 rounded-xl bg-vl-black px-4 font-heading text-xs font-black tracking-wider text-vl-white shadow-xs hover:bg-black hover:text-vl-cyan active:scale-95"
          >
            Search
          </Button>
          {searchQuery && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetSearch}
              className="h-9 rounded-xl border-[#d6d2c4] px-3 text-xs font-semibold text-vl-black hover:bg-[#faf9f5]"
            >
              Clear
            </Button>
          )}
        </form>

        {/* Orders List Container */}
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {isPending ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="mb-2 h-6 w-6 animate-spin text-vl-cyan" />
              <p className="text-xs">Loading sales history...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#d6d2c4] bg-[#faf9f5] p-8 text-center">
              <AlertCircle className="mx-auto mb-2 h-8 w-8 text-slate-400" />
              <p className="font-heading text-sm font-bold text-vl-black">No Orders Found</p>
              <p className="mt-1 text-xs text-vl-grey">
                {searchQuery
                  ? "No transactions matched your search query."
                  : "No POS counter orders completed today yet. Completed sales will appear here."}
              </p>
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-[#e2ded2] bg-[#faf9f5] p-3 text-xs transition-all duration-150 hover:border-vl-cyan hover:bg-white hover:shadow-2xs sm:flex-row sm:items-center"
              >
                {/* Order Details */}
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sm font-black text-vl-black">
                      {order.orderNumber}
                    </span>
                    {renderPaymentBadge(order.paymentMethod)}
                    <Badge variant="outline" className="border-[#d6d2c4] bg-white px-1.5 py-0 font-mono text-[10px] text-vl-grey">
                      {order.itemsCount} {order.itemsCount === 1 ? "item" : "items"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-vl-grey">
                    <span className="flex items-center font-mono">
                      <Clock className="mr-1 h-3 w-3 text-vl-cyan" />
                      {formatOrderTime(order.createdAt)}
                    </span>
                    <span>
                      Customer: <strong className="font-semibold text-vl-black">{order.customerName}</strong>
                    </span>
                    {order.customerPhone && order.customerPhone !== "N/A" && (
                      <span className="flex items-center font-mono">
                        <Phone className="mr-1 h-3 w-3 text-vl-grey" />
                        {order.customerPhone}
                      </span>
                    )}
                  </div>

                  {/* Line items snippet */}
                  <div className="line-clamp-1 pt-0.5 text-[11px] text-vl-grey italic">
                    {order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                  </div>
                </div>

                {/* Amount & Actions */}
                <div className="flex items-center justify-between space-x-3 border-t border-[#e2ded2] pt-2 sm:justify-end sm:border-t-0 sm:pt-0">
                  <div className="text-right">
                    <span className="block font-mono text-base font-black text-vl-black">
                      ৳{order.total.toLocaleString()}
                    </span>
                    {order.discount > 0 && (
                      <span className="block font-mono text-[10px] font-medium text-emerald-600">
                        -৳{order.discount} off
                      </span>
                    )}
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      onReprintReceipt(order.receiptData);
                      onClose();
                    }}
                    className="flex h-8.5 items-center space-x-1.5 rounded-lg bg-vl-black px-3.5 font-heading text-xs font-black tracking-wider text-vl-white shadow-xs transition-all hover:bg-vl-cyan hover:text-vl-black active:scale-95"
                    title="Reprint thermal cash memo"
                  >
                    <Printer className="h-3.5 w-3.5 text-vl-cyan" />
                    <span>Reprint</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
