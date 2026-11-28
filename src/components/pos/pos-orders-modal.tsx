"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getPosTodayOrdersAction } from "@/lib/pos/pos-order-history-actions";
import type { PosOrderSummaryItem, PosTodayOrdersStats } from "@/lib/pos/pos-order-history-types";
import type { PosReceiptData } from "@/lib/pos/pos-types";
import { voidPosOrderAction } from "@/lib/pos/pos-void-actions";
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  Banknote,
  Clock,
  CreditCard,
  Loader2,
  Phone,
  Printer,
  QrCode,
  Receipt,
  RefreshCw,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

interface PosOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReprintReceipt: (receipt: PosReceiptData) => void;
  cashierRole?: string;
}

export function PosOrdersModal({
  isOpen,
  onClose,
  onReprintReceipt,
  cashierRole = "STAFF",
}: PosOrdersModalProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<PosOrderSummaryItem[]>([]);
  const [stats, setStats] = useState<PosTodayOrdersStats>({
    totalOrders: 0,
    totalRevenue: 0,
    cashTotal: 0,
    digitalTotal: 0,
  });
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [voidConfirmOrder, setVoidConfirmOrder] = useState<PosOrderSummaryItem | null>(null);
  const [voidReason, setVoidReason] = useState<string>("");
  const [isVoiding, setIsVoiding] = useState<boolean>(false);
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

  const handleConfirmVoid = async () => {
    if (!voidConfirmOrder) return;
    setIsVoiding(true);
    try {
      const res = await voidPosOrderAction({
        orderId: voidConfirmOrder.id,
        reason: voidReason.trim() || undefined,
      });
      if (res.success) {
        const msg = res.data?.pointsRefunded
          ? `Order ${voidConfirmOrder.orderNumber} successfully voided! ${res.data.pointsRefunded} loyalty points refunded to customer.`
          : `Order ${voidConfirmOrder.orderNumber} successfully voided and restocked!`;
        toast.success(msg);
        setVoidConfirmOrder(null);
        setVoidReason("");
        fetchOrders(searchQuery);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to void order.");
      }
    } catch {
      toast.error("An error occurred while voiding order.");
    } finally {
      setIsVoiding(false);
    }
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
      case "BANGLA_QR":
      case "BKASH":
        return (
          <Badge className="flex items-center space-x-1 border-teal-200 bg-teal-100 text-teal-800 hover:bg-teal-100">
            <QrCode className="h-3 w-3" />
            <span>Bangla QR</span>
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
      <DialogContent className="max-full border-vl-white-500 rounded-brand flex max-h-[90vh] flex-col border bg-white p-6 shadow-xl sm:max-w-xl md:max-w-2xl">
        {/* Header */}
        <DialogHeader className="border-vl-white-400 shrink-0 border-b pb-3">
          <div className="flex items-center justify-between">
            <div className="text-vl-dark-900 flex items-center space-x-2.5">
              <div className="border-vl-white-500 bg-vl-white-200 text-vl-dark-900 rounded-brand border p-2">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-heading text-vl-dark-900 text-lg font-bold tracking-tight">
                  Today&apos;s Counter Sales &amp; Invoices
                </DialogTitle>
                <DialogDescription className="text-vl-dark-400 text-xs">
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
              className="text-vl-dark-900 hover:border-vl-dark-900 border-vl-white-500 hover:bg-vl-white-100 rounded-brand flex h-9 items-center space-x-1.5 text-xs font-semibold"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isPending ? "text-vl-dark-900 animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Stats Summary Bar */}
        <div className="my-3 grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="border-vl-white-500 bg-vl-white-100 rounded-brand border p-2.5">
            <span className="text-vl-dark-400 block text-[10px] font-bold tracking-wider uppercase">
              Total Orders
            </span>
            <span className="font-heading text-vl-dark-900 text-lg font-black tabular-nums">
              {stats.totalOrders}
            </span>
          </div>
          <div className="border-vl-white-500 bg-vl-white-200 rounded-brand border p-2.5">
            <span className="font-heading text-vl-dark-500 block text-[10px] font-bold tracking-wider uppercase">
              Total Sales
            </span>
            <span className="font-heading text-vl-dark-900 text-lg font-black tabular-nums">
              ৳{stats.totalRevenue.toLocaleString()}
            </span>
          </div>
          <div className="border-vl-white-500 bg-vl-white-100 rounded-brand border p-2.5">
            <span className="text-vl-dark-400 block text-[10px] font-bold tracking-wider uppercase">
              Cash Tender
            </span>
            <span className="font-heading text-lg font-black text-emerald-600 tabular-nums">
              ৳{stats.cashTotal.toLocaleString()}
            </span>
          </div>
          <div className="border-vl-white-500 bg-vl-white-100 rounded-brand border p-2.5">
            <span className="text-vl-dark-400 block text-[10px] font-bold tracking-wider uppercase">
              Digital (Bangla QR/Card)
            </span>
            <span className="font-heading text-vl-dark-900 text-lg font-black tabular-nums">
              ৳{stats.digitalTotal.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Search Toolbar */}
        <form onSubmit={handleSearchSubmit} className="mb-3 flex shrink-0 gap-2">
          <div className="relative flex-1">
            <Search className="text-vl-dark-400 absolute top-2.5 left-3 h-4 w-4" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Invoice # (e.g. VL-POS-...), customer phone or name..."
              className="bg-vl-white-100 pl-9"
            />
          </div>
          <Button type="submit">Search</Button>
          {searchQuery && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetSearch}
              className="text-vl-dark-900 border-vl-white-500 hover:bg-vl-white-100 rounded-brand h-9 px-3 text-xs font-semibold"
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
            <div className="border-vl-white-500 bg-vl-white-100 rounded-brand border border-dashed p-8 text-center">
              <AlertCircle className="mx-auto mb-2 h-8 w-8 text-slate-400" />
              <p className="font-heading text-vl-dark-900 text-sm font-bold">No Orders Found</p>
              <p className="text-vl-dark-400 mt-1 text-xs">
                {searchQuery
                  ? "No transactions matched your search query."
                  : "No POS counter orders completed today yet. Completed sales will appear here."}
              </p>
            </div>
          ) : (
            orders.map((order) => {
              const isCancelled = order.status === "CANCELLED";

              return (
                <div
                  key={order.id}
                  className={`border-vl-white-400 bg-vl-white-100 rounded-brand flex flex-col justify-between gap-3 border p-3 text-xs transition-all duration-150 hover:bg-white hover:shadow-2xs sm:flex-row sm:items-center ${
                    isCancelled ? "opacity-60" : "hover:border-vl-dark-900"
                  }`}
                >
                  {/* Order Details */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-vl-dark-900 font-mono text-sm font-black">
                        {order.orderNumber}
                      </span>
                      {renderPaymentBadge(order.paymentMethod)}
                      <Badge
                        variant="outline"
                        className="text-vl-dark-500 border-vl-white-500 bg-white px-1.5 py-0 font-mono text-[10px]"
                      >
                        {order.itemsCount} {order.itemsCount === 1 ? "item" : "items"}
                      </Badge>
                      {isCancelled && (
                        <Badge className="border-red-200 bg-red-100 font-mono text-[10px] text-red-700 hover:bg-red-100">
                          Voided
                        </Badge>
                      )}
                    </div>

                    <div className="text-vl-dark-400 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
                      <span className="flex items-center font-mono">
                        <Clock className="text-vl-dark-900 mr-1 h-3 w-3" />
                        {formatOrderTime(order.createdAt)}
                      </span>
                      <span>
                        Customer:{" "}
                        <strong className="text-vl-dark-900 font-semibold">
                          {order.customerName}
                        </strong>
                      </span>
                      {order.customerPhone && order.customerPhone !== "N/A" && (
                        <span className="flex items-center font-mono">
                          <Phone className="text-vl-dark-400 mr-1 h-3 w-3" />
                          {order.customerPhone}
                        </span>
                      )}
                    </div>

                    {/* Line items snippet */}
                    <div className="text-vl-dark-400 line-clamp-1 pt-0.5 text-[11px] italic">
                      {order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                    </div>
                  </div>

                  {/* Amount & Actions */}
                  <div className="border-vl-white-400 flex items-center justify-between space-x-3 border-t pt-2 sm:justify-end sm:border-t-0 sm:pt-0">
                    <div className="text-right">
                      <span
                        className={`block font-mono text-base font-black ${
                          isCancelled ? "text-vl-dark-400 line-through" : "text-vl-dark-900"
                        }`}
                      >
                        ৳{order.total.toLocaleString()}
                      </span>
                      {order.discount > 0 && !isCancelled && (
                        <span className="block font-mono text-[10px] font-medium text-emerald-600">
                          -৳{order.discount} off
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onReprintReceipt(order.receiptData);
                          onClose();
                        }}
                        title="Reprint thermal cash memo"
                        className="rounded-brand"
                      >
                        <Printer className="text-vl-dark-900 h-3.5 w-3.5" aria-hidden="true" />
                        <span>Reprint</span>
                      </Button>

                      {!isCancelled && (cashierRole === "MANAGER" || cashierRole === "ADMIN") && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setVoidConfirmOrder(order);
                            setVoidReason("");
                          }}
                          title="Void sale, restock items and refund settlement"
                          className="border-vl-white-500 rounded-brand text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Void</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>

      {/* Manager Void Confirmation Dialog */}
      {voidConfirmOrder && (
        <Dialog
          open={true}
          onOpenChange={(open) => !open && !isVoiding && setVoidConfirmOrder(null)}
        >
          <DialogContent className="border-vl-white-500 rounded-brand max-w-md border bg-white p-6 shadow-xl">
            <DialogHeader className="border-vl-white-400 border-b pb-3">
              <div className="flex items-center space-x-2.5 text-red-600">
                <div className="rounded-brand border border-red-200 bg-red-100 p-2">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="font-heading text-vl-dark-900 text-base font-bold">
                    Void POS Order {voidConfirmOrder.orderNumber}?
                  </DialogTitle>
                  <DialogDescription className="text-vl-dark-400 text-xs">
                    Manager Authorization Required
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="my-2 space-y-3 text-xs">
              <p className="text-vl-dark-700 leading-relaxed">
                Voiding this transaction will mark order{" "}
                <strong className="text-vl-dark-900 font-mono font-bold">
                  {voidConfirmOrder.orderNumber}
                </strong>{" "}
                as cancelled and refund <strong>৳{voidConfirmOrder.total.toLocaleString()}</strong>.
                All <strong>{voidConfirmOrder.itemsCount}</strong> items will be immediately
                returned to active inventory.
              </p>

              <div>
                <label className="text-vl-dark-700 mb-1 block text-xs font-bold">
                  Void Reason (Optional):
                </label>
                <Input
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g. Wrong customer, cash tender error, customer changed mind"
                  className="bg-vl-white-100"
                />
              </div>
            </div>

            <div className="border-vl-white-400 mt-2 flex justify-end space-x-2 border-t pt-3">
              <Button
                type="button"
                variant="outline"
                disabled={isVoiding}
                onClick={() => setVoidConfirmOrder(null)}
                className="rounded-brand"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isVoiding}
                onClick={handleConfirmVoid}
                className="rounded-brand"
              >
                {isVoiding ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin text-white" />
                    <span>Voiding...</span>
                  </>
                ) : (
                  <span>Confirm Void &amp; Restock</span>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
