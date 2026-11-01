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
      <DialogContent className="flex max-h-[90vh] max-w-xl flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-2xl lg:max-w-2xl">
        {/* Header */}
        <DialogHeader className="flex-shrink-0 border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-900">
              <div className="rounded-lg bg-vl-cyan/15 p-2 text-vl-cyan border border-vl-cyan/30">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  Today&apos;s Counter Sales &amp; Invoices
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
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
              className="flex h-8 items-center space-x-1 text-xs text-slate-600 hover:text-vl-black hover:border-vl-cyan"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin text-vl-cyan" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Stats Summary Bar */}
        <div className="my-3 grid flex-shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
            <span className="block text-[11px] font-medium text-slate-500">Total Orders</span>
            <span className="font-mono text-lg font-bold text-slate-900">{stats.totalOrders}</span>
          </div>
          <div className="rounded-lg border border-vl-cyan/30 bg-vl-cyan/10 p-2.5">
            <span className="block text-[11px] font-medium text-[#007994]">Total Sales</span>
            <span className="font-mono text-lg font-black text-[#007994]">
              ৳{stats.totalRevenue.toLocaleString()}
            </span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
            <span className="block text-[11px] font-medium text-slate-500">Cash Tender</span>
            <span className="font-mono text-lg font-bold text-slate-700">
              ৳{stats.cashTotal.toLocaleString()}
            </span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
            <span className="block text-[11px] font-medium text-slate-600">
              Digital (bKash/Card)
            </span>
            <span className="font-mono text-lg font-bold text-slate-800">
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
              className="h-9 pl-9 text-xs"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            className="h-9 bg-slate-900 px-3 text-xs hover:bg-slate-800"
          >
            Search
          </Button>
          {searchQuery && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetSearch}
              className="h-9 px-2 text-xs"
            >
              Clear
            </Button>
          )}
        </form>

        {/* Orders List Container */}
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {isPending ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="mb-2 h-6 w-6 animate-spin" />
              <p className="text-xs">Loading sales history...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
              <AlertCircle className="mx-auto mb-2 h-8 w-8 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">No Orders Found</p>
              <p className="mt-1 text-xs text-slate-500">
                {searchQuery
                  ? "No transactions matched your search query."
                  : "No POS counter orders completed today yet. Completed sales will appear here."}
              </p>
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs transition-colors hover:border-slate-300 sm:flex-row sm:items-center"
              >
                {/* Order Details */}
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sm font-bold text-slate-900">
                      {order.orderNumber}
                    </span>
                    {renderPaymentBadge(order.paymentMethod)}
                    <Badge variant="outline" className="bg-white text-[10px] text-slate-600">
                      {order.itemsCount} {order.itemsCount === 1 ? "item" : "items"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                    <span className="flex items-center font-mono">
                      <Clock className="mr-1 h-3 w-3 text-slate-400" />
                      {formatOrderTime(order.createdAt)}
                    </span>
                    <span>
                      Customer: <strong className="text-slate-700">{order.customerName}</strong>
                    </span>
                    {order.customerPhone && order.customerPhone !== "N/A" && (
                      <span className="flex items-center font-mono">
                        <Phone className="mr-1 h-3 w-3 text-slate-400" />
                        {order.customerPhone}
                      </span>
                    )}
                  </div>

                  {/* Line items snippet */}
                  <div className="line-clamp-1 pt-0.5 text-[11px] text-slate-500 italic">
                    {order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                  </div>
                </div>

                {/* Amount & Actions */}
                <div className="flex items-center justify-between space-x-3 border-t border-slate-200 pt-2 sm:justify-end sm:border-t-0 sm:pt-0">
                  <div className="text-right">
                    <span className="block font-mono text-base font-bold text-slate-900">
                      ৳{order.total.toLocaleString()}
                    </span>
                    {order.discount > 0 && (
                      <span className="block text-[10px] text-emerald-600">
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
                    className="flex h-8 items-center space-x-1.5 bg-vl-black hover:bg-black text-vl-white hover:text-vl-cyan px-3 text-xs font-bold transition-colors"
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
