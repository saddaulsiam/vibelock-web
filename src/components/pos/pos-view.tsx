"use client";

import { createPosOrderAction } from "@/lib/pos/pos-actions";
import { usePosOnlineStatus } from "@/lib/pos";
import type { PosParkedCart } from "@/lib/pos/pos-parked-types";
import type { PosReturnReceiptData } from "@/lib/pos/pos-returns-types";
import type { PosShiftSummary, PosZReportData } from "@/lib/pos/pos-shift-types";
import type {
  PosCartItem,
  PosCategory,
  PosPaymentMethod,
  PosPaymentSplitInput,
  PosProductSummary,
  PosProductVariant,
  PosReceiptData,
} from "@/lib/pos/pos-types";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { PosCartPanel } from "./pos-cart-panel";
import { PosHeader } from "./pos-header";
import { PosParkedModal } from "./pos-parked-modal";
import { PosOrdersModal } from "./pos-orders-modal";
import { PosPaymentModal } from "./pos-payment-modal";
import { PosProductGrid } from "./pos-product-grid";
import { PosProductScanner } from "./pos-product-scanner";
import { PosReturnModal } from "./pos-return-modal";
import { PosReturnReceipt } from "./pos-return-receipt";
import { PosShiftModal } from "./pos-shift-modal";
import { PosShiftZReport } from "./pos-shift-z-report";
import { PosThermalReceipt } from "./pos-thermal-receipt";

const PARKED_CARTS_STORAGE_KEY = "vibelock_pos_parked_carts";

let cachedParkedRaw: string | null = null;
let cachedParkedList: PosParkedCart[] = [];

function getParkedSnapshot(): PosParkedCart[] {
  if (typeof window === "undefined") return cachedParkedList;
  try {
    const raw = localStorage.getItem(PARKED_CARTS_STORAGE_KEY);
    if (raw === cachedParkedRaw) {
      return cachedParkedList;
    }
    cachedParkedRaw = raw;
    if (!raw) {
      cachedParkedList = [];
      return cachedParkedList;
    }
    const parsed = JSON.parse(raw);
    cachedParkedList = Array.isArray(parsed) ? parsed : [];
    return cachedParkedList;
  } catch {
    return cachedParkedList;
  }
}

const EMPTY_PARKED_CARTS: PosParkedCart[] = [];
function getParkedServerSnapshot(): PosParkedCart[] {
  return EMPTY_PARKED_CARTS;
}

function subscribeParked(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("vibelock-pos-parked-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("vibelock-pos-parked-change", callback);
  };
}

interface PosViewProps {
  products: PosProductSummary[];
  categories: PosCategory[];
  cashierName: string;
  cashierRole: string;
  initialShift?: PosShiftSummary | null;
}

export function PosView({
  products,
  categories,
  cashierName,
  cashierRole,
  initialShift,
}: PosViewProps) {
  // Real-time Internet Connectivity Guard
  const isOnline = usePosOnlineStatus();

  // Cart State
  const [cartItems, setCartItems] = useState<PosCartItem[]>([]);
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [discount, setDiscount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false);

  // Shift & Cash Drawer State
  const [shift, setShift] = useState<PosShiftSummary | null>(initialShift || null);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState<boolean>(!initialShift?.isOpen);
  const [zReportData, setZReportData] = useState<PosZReportData | null>(null);
  const [isZReportOpen, setIsZReportOpen] = useState<boolean>(false);

  // Returns & Exchanges State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState<boolean>(false);
  const [returnReceiptData, setReturnReceiptData] = useState<PosReturnReceiptData | null>(null);
  const [isReturnReceiptOpen, setIsReturnReceiptOpen] = useState<boolean>(false);

  // Parked / Held Carts State (synced with localStorage via useSyncExternalStore)
  const parkedCarts = useSyncExternalStore(
    subscribeParked,
    getParkedSnapshot,
    getParkedServerSnapshot
  );
  const [isParkedModalOpen, setIsParkedModalOpen] = useState<boolean>(false);

  // Today's Counter Orders & Reprint State
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState<boolean>(false);

  // Billing Modals
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [receiptData, setReceiptData] = useState<PosReceiptData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Scanner Input Ref for F2 shortcut
  const scannerRef = useRef<HTMLInputElement | null>(null);

  // Save parked carts to localStorage and notify store listeners
  const saveParkedCarts = (updatedCarts: PosParkedCart[]) => {
    try {
      const serialized = JSON.stringify(updatedCarts);
      localStorage.setItem(PARKED_CARTS_STORAGE_KEY, serialized);
      cachedParkedRaw = serialized;
      cachedParkedList = updatedCarts;
      window.dispatchEvent(new Event("vibelock-pos-parked-change"));
    } catch {
      // Fallback
    }
  };

  // Add Variant to Cart Handler
  const handleAddVariant = useCallback((variant: PosProductVariant, product: PosProductSummary) => {
    if (variant.availableStock <= 0) {
      toast.error(`Out of stock: ${variant.sku}`);
      return;
    }

    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.variantId === variant.id);
      if (existingIndex > -1) {
        const item = prev[existingIndex];
        if (item.quantity >= variant.availableStock) {
          toast.warning(
            `Maximum stock available (${variant.availableStock}) already added to cart.`
          );
          return prev;
        }
        const updated = [...prev];
        updated[existingIndex] = {
          ...item,
          quantity: item.quantity + 1,
        };
        return updated;
      }

      const newItem: PosCartItem = {
        variantId: variant.id,
        productId: product.id,
        productName: product.name,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        price: variant.effectivePrice,
        costPrice: variant.costPrice,
        quantity: 1,
        maxStock: variant.availableStock,
        image: product.imageUrl,
      };

      return [...prev, newItem];
    });
  }, []);

  // Update Item Quantity
  const handleUpdateQuantity = useCallback((variantId: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems((prev) => prev.filter((item) => item.variantId !== variantId));
    } else {
      setCartItems((prev) =>
        prev.map((item) => {
          if (item.variantId === variantId) {
            return {
              ...item,
              quantity: Math.min(quantity, item.maxStock),
            };
          }
          return item;
        })
      );
    }
  }, []);

  // Remove Item
  const handleRemoveItem = useCallback((variantId: string) => {
    setCartItems((prev) => prev.filter((item) => item.variantId !== variantId));
  }, []);

  // Clear Cart
  const handleClearCart = useCallback(() => {
    setCartItems([]);
    setDiscount(0);
  }, []);

  // Compute Grand Total
  const totalItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const effectiveDiscount = Math.min(subtotal, Math.max(0, discount));
  const grandTotal = Math.max(0, subtotal - effectiveDiscount);

  // Park Current Cart (Hold Sale)
  const handleParkCart = useCallback(() => {
    if (cartItems.length === 0) {
      toast.error("Cannot hold an empty cart.");
      return;
    }

    const itemsCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);
    const label =
      customerName.trim() || customerPhone.trim() || `Held Sale #${parkedCarts.length + 1}`;

    const newParkedCart: PosParkedCart = {
      id: `park-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      parkedAt: new Date().toISOString(),
      label,
      customerName: customerName.trim() || "Walk-in Customer",
      customerPhone: customerPhone.trim() || "",
      items: [...cartItems],
      discount: effectiveDiscount,
      totalValue: grandTotal,
      itemsCount,
    };

    saveParkedCarts([newParkedCart, ...parkedCarts]);

    // Clear active cart
    setCartItems([]);
    setCustomerPhone("");
    setCustomerName("");
    setDiscount(0);

    toast.success(`Cart held successfully (${label}). Ready for next customer!`);
  }, [cartItems, customerName, customerPhone, effectiveDiscount, grandTotal, parkedCarts]);

  // Resume Parked Cart
  const handleResumeCart = (cart: PosParkedCart) => {
    setCartItems(cart.items);
    setCustomerName(cart.customerName);
    setCustomerPhone(cart.customerPhone);
    setDiscount(cart.discount);

    // Remove from parked
    saveParkedCarts(parkedCarts.filter((c) => c.id !== cart.id));
    setIsParkedModalOpen(false);

    toast.success(`Resumed held cart: ${cart.label}`);
  };

  // Discard Parked Cart
  const handleDiscardCart = (cartId: string) => {
    saveParkedCarts(parkedCarts.filter((c) => c.id !== cartId));
    toast.info("Held cart discarded.");
  };

  // Open Payment Modal (Requires active shift and internet connectivity)
  const handleOpenPayment = useCallback(() => {
    if (!isOnline) {
      toast.error(
        "Counter is currently offline. Cannot settle payment without server connection. You can hold this cart [F4] until connection restores.",
        { duration: 6000 }
      );
      return;
    }

    if (cartItems.length === 0) {
      toast.error("Cart is empty. Add items before proceeding to payment.");
      return;
    }

    if (!shift || !shift.isOpen) {
      toast.warning("Register shift is not open. Please open your shift first.");
      setIsShiftModalOpen(true);
      return;
    }

    setIsPaymentOpen(true);
  }, [cartItems.length, shift, isOnline]);

  // Execute Payment & Order Creation
  const handleConfirmPayment = async (
    paymentMethod: PosPaymentMethod,
    amountPaid: number,
    notes?: string,
    splitPayments?: PosPaymentSplitInput[]
  ) => {
    if (!isOnline) {
      toast.error("Offline: Cannot finalize order. Please wait for internet connection.");
      return;
    }

    if (cartItems.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await createPosOrderAction({
        items: cartItems.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        paymentMethod,
        amountPaid,
        discount: effectiveDiscount,
        notes,
        splitPayments,
      });

      if (!result.success || !result.data) {
        toast.error(result.error || "Failed to complete POS order");
        return;
      }

      // Success
      setReceiptData(result.data);
      setIsPaymentOpen(false);
      setIsReceiptOpen(true);
      toast.success(`Order ${result.data.orderNumber} completed successfully!`);

      // Update shift drawer sales stats in real time (supporting Split Tenders)
      const completedOrder = result.data;
      if (shift && shift.isOpen) {
        const saleAmt = completedOrder.total;
        setShift((prev) => {
          if (!prev) return null;
          let cashAdd = 0;
          let bkashAdd = 0;
          let cardAdd = 0;

          if (completedOrder.splits && completedOrder.splits.length > 0) {
            for (const sp of completedOrder.splits) {
              if (sp.method === "CASH") cashAdd += sp.amount;
              else if (sp.method === "BKASH") bkashAdd += sp.amount;
              else if (sp.method === "CARD") cardAdd += sp.amount;
            }
          } else {
            if (paymentMethod === "CASH") cashAdd = saleAmt;
            else if (paymentMethod === "BKASH") bkashAdd = saleAmt;
            else if (paymentMethod === "CARD") cardAdd = saleAmt;
          }

          return {
            ...prev,
            cashSales: prev.cashSales + cashAdd,
            bkashSales: prev.bkashSales + bkashAdd,
            cardSales: prev.cardSales + cardAdd,
            totalSales: prev.totalSales + saleAmt,
            ordersCount: prev.ordersCount + 1,
            expectedCash: prev.expectedCash + cashAdd,
          };
        });
      }

      // Reset cart
      setCartItems([]);
      setCustomerPhone("");
      setCustomerName("");
      setDiscount(0);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred during checkout";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset for New Sale
  const handleNewSale = useCallback(() => {
    setIsReceiptOpen(false);
    setReceiptData(null);
    setCartItems([]);
    setCustomerPhone("");
    setCustomerName("");
    setDiscount(0);
    setTimeout(() => {
      scannerRef.current?.focus();
    }, 100);
  }, []);

  // Handle In-Store Return Finished
  const handleReturnFinished = (receipt: PosReturnReceiptData) => {
    setReturnReceiptData(receipt);
    setIsReturnReceiptOpen(true);

    // If cash was refunded from drawer, update drawer in real time
    if (receipt.netAction === "REFUND_TO_CUSTOMER" && shift && shift.isOpen) {
      const refundAmt = Math.abs(receipt.netDifference);
      setShift((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          cashDrops: prev.cashDrops + refundAmt,
          expectedCash: Math.max(0, prev.expectedCash - refundAmt),
        };
      });
    }
  };

  // Global Keyboard Shortcuts (F2: Scanner, F3: Returns, F4: Hold/Park, F9: Payment, Esc: Close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        scannerRef.current?.focus();
      } else if (e.key === "F3") {
        e.preventDefault();
        setIsReturnModalOpen(true);
      } else if (e.key === "F4") {
        e.preventDefault();
        if (cartItems.length > 0) {
          handleParkCart();
        } else if (parkedCarts.length > 0) {
          setIsParkedModalOpen(true);
        }
      } else if (e.key === "F5") {
        e.preventDefault();
        setIsOrdersModalOpen(true);
      } else if (e.key === "F9") {
        e.preventDefault();
        if (
          cartItems.length > 0 &&
          !isPaymentOpen &&
          !isReceiptOpen &&
          !isShiftModalOpen &&
          !isReturnModalOpen &&
          !isParkedModalOpen &&
          !isOrdersModalOpen
        ) {
          handleOpenPayment();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    cartItems.length,
    parkedCarts.length,
    isPaymentOpen,
    isReceiptOpen,
    isShiftModalOpen,
    isReturnModalOpen,
    isParkedModalOpen,
    isOrdersModalOpen,
    handleOpenPayment,
    handleParkCart,
  ]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#f2f2f2] select-none">
      {/* Top Header with Live Drawer Badge & Returns Button */}
      <PosHeader
        cashierName={cashierName}
        cashierRole={cashierRole}
        shift={shift}
        onOpenShiftModal={() => setIsShiftModalOpen(true)}
        onOpenReturnModal={() => setIsReturnModalOpen(true)}
        parkedCount={parkedCarts.length}
        onOpenParkedModal={() => setIsParkedModalOpen(true)}
        onOpenOrdersModal={() => setIsOrdersModalOpen(true)}
        isOnline={isOnline}
        cartItemCount={totalItemsCount}
        onToggleCartMobile={() => setIsMobileCartOpen((prev) => !prev)}
      />

      {/* Main Billing Counter Workspace */}
      <main className="relative flex flex-1 overflow-hidden">
        {/* Left Section: Scanner + Catalog Grid (Full width on mobile/tablet, 60-65% on desktop lg+) */}
        <section className="flex min-w-0 flex-1 flex-col">
          {/* Quick Barcode Scanner Bar */}
          <div className="border-b border-[#d6d2c4] bg-white p-2.5 shadow-2xs sm:p-3">
            <PosProductScanner
              onAddVariant={handleAddVariant}
              scannerRef={scannerRef}
              catalogProducts={products}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
            />
          </div>

          {/* Product Grid & Categories */}
          <div className="flex-1 overflow-hidden">
            <PosProductGrid
              products={products}
              categories={categories}
              onAddVariant={handleAddVariant}
              searchQuery={searchQuery}
              onClearSearch={() => setSearchQuery("")}
            />
          </div>
        </section>

        {/* Desktop Section: Billing Cart Panel (35-40% width, permanently visible on lg+) */}
        <aside className="z-10 hidden h-full w-96 border-l border-[#d6d2c4] shadow-md lg:block lg:w-[400px] xl:w-[460px]">
          <PosCartPanel
            cartItems={cartItems}
            customerPhone={customerPhone}
            setCustomerPhone={setCustomerPhone}
            customerName={customerName}
            setCustomerName={setCustomerName}
            discount={discount}
            setDiscount={setDiscount}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            onOpenPaymentModal={handleOpenPayment}
            onParkCart={handleParkCart}
            isOnline={isOnline}
          />
        </aside>

        {/* Mobile & Tablet Slide-Over Cart Sheet / Drawer (< lg) */}
        {isMobileCartOpen && (
          <div className="fixed inset-0 z-50 flex justify-end lg:hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
              onClick={() => setIsMobileCartOpen(false)}
            />
            {/* Slide-over panel */}
            <div className="animate-in slide-in-from-right relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl duration-200">
              <PosCartPanel
                cartItems={cartItems}
                customerPhone={customerPhone}
                setCustomerPhone={setCustomerPhone}
                customerName={customerName}
                setCustomerName={setCustomerName}
                discount={discount}
                setDiscount={setDiscount}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                onClearCart={handleClearCart}
                onOpenPaymentModal={() => {
                  setIsMobileCartOpen(false);
                  handleOpenPayment();
                }}
                onParkCart={handleParkCart}
                isOnline={isOnline}
                onCloseMobile={() => setIsMobileCartOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Mobile & Tablet Floating Cart Bar (< lg) */}
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-2.5 sm:p-3 lg:hidden">
          <button
            type="button"
            onClick={() => setIsMobileCartOpen(true)}
            className="bg-vl-black text-vl-white border-vl-cyan/40 hover:border-vl-cyan pointer-events-auto flex w-full items-center justify-between rounded-2xl border p-3 shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all active:scale-[0.99] sm:p-3.5"
          >
            <div className="flex items-center space-x-2.5 sm:space-x-3">
              <div className="bg-vl-cyan text-vl-black relative flex h-9 w-9 items-center justify-center rounded-xl font-black sm:h-10 sm:w-10">
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                {totalItemsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 font-mono text-[9px] font-bold text-white shadow-xs">
                    {totalItemsCount}
                  </span>
                )}
              </div>
              <div className="text-left">
                <span className="font-heading text-vl-white block text-xs font-black">
                  Current Sale ({totalItemsCount})
                </span>
                <span className="text-vl-grey font-mono text-[11px]">
                  {totalItemsCount === 0 ? "Empty ticket" : `Subtotal: ৳${subtotal.toFixed(0)}`}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-2.5">
              <span className="font-heading text-vl-cyan font-mono text-base font-black sm:text-lg">
                ৳{grandTotal.toFixed(0)}
              </span>
              <div className="bg-vl-cyan font-heading text-vl-black rounded-xl px-2.5 py-1 text-xs font-black shadow-xs sm:px-3 sm:py-1.5">
                View Ticket →
              </div>
            </div>
          </button>
        </div>
      </main>

      {/* Parked Sales / Held Carts Modal */}
      <PosParkedModal
        isOpen={isParkedModalOpen}
        onClose={() => setIsParkedModalOpen(false)}
        parkedCarts={parkedCarts}
        onResumeCart={handleResumeCart}
        onDiscardCart={handleDiscardCart}
        currentCartHasItems={cartItems.length > 0}
      />

      {/* Today's Counter Orders / Invoices Modal */}
      <PosOrdersModal
        isOpen={isOrdersModalOpen}
        onClose={() => setIsOrdersModalOpen(false)}
        onReprintReceipt={(receipt) => {
          setReceiptData(receipt);
          setIsReceiptOpen(true);
        }}
      />

      {/* In-Store Returns & Exchanges Modal */}
      <PosReturnModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        catalogProducts={products}
        onReturnCompleted={handleReturnFinished}
      />

      {/* Thermal Return & Exchange Memo */}
      <PosReturnReceipt
        receipt={returnReceiptData}
        isOpen={isReturnReceiptOpen}
        onClose={() => {
          setIsReturnReceiptOpen(false);
          setReturnReceiptData(null);
        }}
      />

      {/* Cash Drawer & Shift Management Modal */}
      <PosShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        shift={shift}
        onShiftUpdated={setShift}
        onZReportGenerated={(report) => {
          setZReportData(report);
          setIsZReportOpen(true);
        }}
      />

      {/* Official Shift Z-Report Thermal Modal */}
      <PosShiftZReport
        report={zReportData}
        isOpen={isZReportOpen}
        onClose={() => {
          setIsZReportOpen(false);
          setZReportData(null);
        }}
      />

      {/* Payment Settlement Modal */}
      <PosPaymentModal
        isOpen={isPaymentOpen}
        onClose={() => !isSubmitting && setIsPaymentOpen(false)}
        grandTotal={grandTotal}
        onConfirmPayment={handleConfirmPayment}
        isSubmitting={isSubmitting}
      />

      {/* Thermal Cash Memo Receipt Modal */}
      <PosThermalReceipt receipt={receiptData} isOpen={isReceiptOpen} onNewSale={handleNewSale} />
    </div>
  );
}
