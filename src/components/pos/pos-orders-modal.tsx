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
      <DialogContent className="max-full flex max-h-[90vh] flex-col rounded-2xl border border-[#e2ded2] bg-white p-6 shadow-2xl sm:max-w-xl md:max-w-2xl">
        {/* Header */}
        <DialogHeader className="flex-shrink-0 border-b border-[#f0ede6] pb-3">
          <div className="flex items-center justify-between">
            <div className="text-vl-black flex items-center space-x-2">
              <div className="border-vl-cyan/40 bg-vl-black text-vl-cyan rounded-xl border p-2 shadow-[0_0_12px_rgba(0,217,255,0.25)]">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-heading text-vl-black text-lg font-black tracking-tight">
                  Today&apos;s Counter Sales &amp; Invoices
                </DialogTitle>
                <DialogDescription className="text-vl-grey text-xs">
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
              className="text-vl-black hover:border-vl-cyan flex h-9 items-center space-x-1.5 rounded-xl border-[#d6d2c4] text-xs font-bold hover:bg-[#faf9f5]"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isPending ? "text-vl-cyan animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Stats Summary Bar */}
        <div className="my-3 grid flex-shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-[#e2ded2] bg-[#faf9f5] p-2.5 shadow-2xs">
            <span className="text-vl-grey block text-[10px] font-bold tracking-wider uppercase">
              Total Orders
            </span>
            <span className="font-heading text-vl-black font-mono text-lg font-black">
              {stats.totalOrders}
            </span>
          </div>
          <div className="border-vl-border bg-vl-black text-vl-white rounded-xl border p-2.5 shadow-xs">
            <span className="font-heading text-vl-grey block text-[10px] font-black tracking-widest uppercase">
              Total Sales
            </span>
            <span className="font-heading text-vl-cyan font-mono text-lg font-black">
              ৳{stats.totalRevenue.toLocaleString()}
            </span>
          </div>
          <div className="rounded-xl border border-[#e2ded2] bg-[#faf9f5] p-2.5 shadow-2xs">
            <span className="text-vl-grey block text-[10px] font-bold tracking-wider uppercase">
              Cash Tender
            </span>
            <span className="font-heading font-mono text-lg font-black text-emerald-600">
              ৳{stats.cashTotal.toLocaleString()}
            </span>
          </div>
          <div className="rounded-xl border border-[#e2ded2] bg-[#faf9f5] p-2.5 shadow-2xs">
            <span className="text-vl-grey block text-[10px] font-bold tracking-wider uppercase">
              Digital (bKash/Card)
            </span>
            <span className="font-heading text-vl-black font-mono text-lg font-black">
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
              className="focus-visible:border-vl-cyan focus-visible:ring-vl-cyan/15 h-9 rounded-xl border-[#d6d2c4] bg-[#faf9f5] pl-9 text-xs transition-all focus-visible:bg-white focus-visible:ring-4"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            className="bg-vl-black font-heading text-vl-white hover:text-vl-cyan h-9 rounded-xl px-4 text-xs font-black tracking-wider shadow-xs hover:bg-black active:scale-95"
          >
            Search
          </Button>
          {searchQuery && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetSearch}
              className="text-vl-black h-9 rounded-xl border-[#d6d2c4] px-3 text-xs font-semibold hover:bg-[#faf9f5]"
            >
              Clear
            </Button>
          )}
        </form>

        {/* Orders List Container */}
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {isPending ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="text-vl-cyan mb-2 h-6 w-6 animate-spin" />
              <p className="text-xs">Loading sales history...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#d6d2c4] bg-[#faf9f5] p-8 text-center">
              <AlertCircle className="mx-auto mb-2 h-8 w-8 text-slate-400" />
              <p className="font-heading text-vl-black text-sm font-bold">No Orders Found</p>
              <p className="text-vl-grey mt-1 text-xs">
                {searchQuery
                  ? "No transactions matched your search query."
                  : "No POS counter orders completed today yet. Completed sales will appear here."}
              </p>
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="hover:border-vl-cyan flex flex-col justify-between gap-3 rounded-xl border border-[#e2ded2] bg-[#faf9f5] p-3 text-xs transition-all duration-150 hover:bg-white hover:shadow-2xs sm:flex-row sm:items-center"
              >
                {/* Order Details */}
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-vl-black font-mono text-sm font-black">
                      {order.orderNumber}
                    </span>
                    {renderPaymentBadge(order.paymentMethod)}
                    <Badge
                      variant="outline"
                      className="text-vl-grey border-[#d6d2c4] bg-white px-1.5 py-0 font-mono text-[10px]"
                    >
                      {order.itemsCount} {order.itemsCount === 1 ? "item" : "items"}
                    </Badge>
                  </div>

                  <div className="text-vl-grey flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
                    <span className="flex items-center font-mono">
                      <Clock className="text-vl-cyan mr-1 h-3 w-3" />
                      {formatOrderTime(order.createdAt)}
                    </span>
                    <span>
                      Customer:{" "}
                      <strong className="text-vl-black font-semibold">{order.customerName}</strong>
                    </span>
                    {order.customerPhone && order.customerPhone !== "N/A" && (
                      <span className="flex items-center font-mono">
                        <Phone className="text-vl-grey mr-1 h-3 w-3" />
                        {order.customerPhone}
                      </span>
                    )}
                  </div>

                  {/* Line items snippet */}
                  <div className="text-vl-grey line-clamp-1 pt-0.5 text-[11px] italic">
                    {order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                  </div>
                </div>

                {/* Amount & Actions */}
                <div className="flex items-center justify-between space-x-3 border-t border-[#e2ded2] pt-2 sm:justify-end sm:border-t-0 sm:pt-0">
                  <div className="text-right">
                    <span className="text-vl-black block font-mono text-base font-black">
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
                    className="bg-vl-black font-heading text-vl-white hover:bg-vl-cyan hover:text-vl-black flex h-8.5 items-center space-x-1.5 rounded-lg px-3.5 text-xs font-black tracking-wider shadow-xs transition-all active:scale-95"
                    title="Reprint thermal cash memo"
                  >
                    <Printer className="text-vl-cyan h-3.5 w-3.5" />
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
