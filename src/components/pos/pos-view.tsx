"use client";

import { createPosOrderAction } from "@/lib/pos/pos-actions";
import type { PosParkedCart } from "@/lib/pos/pos-parked-types";
import type { PosReturnReceiptData } from "@/lib/pos/pos-returns-types";
import type { PosShiftSummary, PosZReportData } from "@/lib/pos/pos-shift-types";
import type {
  PosCartItem,
  PosCategory,
  PosPaymentMethod,
  PosProductSummary,
  PosProductVariant,
  PosReceiptData,
} from "@/lib/pos/pos-types";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PosCartPanel } from "./pos-cart-panel";
import { PosHeader } from "./pos-header";
import { PosParkedModal } from "./pos-parked-modal";
import { PosPaymentModal } from "./pos-payment-modal";
import { PosProductGrid } from "./pos-product-grid";
import { PosProductScanner } from "./pos-product-scanner";
import { PosReturnModal } from "./pos-return-modal";
import { PosReturnReceipt } from "./pos-return-receipt";
import { PosShiftModal } from "./pos-shift-modal";
import { PosShiftZReport } from "./pos-shift-z-report";
import { PosThermalReceipt } from "./pos-thermal-receipt";

const PARKED_CARTS_STORAGE_KEY = "vibelock_pos_parked_carts";

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
  // Cart State
  const [cartItems, setCartItems] = useState<PosCartItem[]>([]);
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [discount, setDiscount] = useState<number>(0);

  // Shift & Cash Drawer State
  const [shift, setShift] = useState<PosShiftSummary | null>(initialShift || null);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState<boolean>(!initialShift?.isOpen);
  const [zReportData, setZReportData] = useState<PosZReportData | null>(null);
  const [isZReportOpen, setIsZReportOpen] = useState<boolean>(false);

  // Returns & Exchanges State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState<boolean>(false);
  const [returnReceiptData, setReturnReceiptData] = useState<PosReturnReceiptData | null>(null);
  const [isReturnReceiptOpen, setIsReturnReceiptOpen] = useState<boolean>(false);

  // Parked / Held Carts State
  const [parkedCarts, setParkedCarts] = useState<PosParkedCart[]>([]);
  const [isParkedModalOpen, setIsParkedModalOpen] = useState<boolean>(false);

  // Billing Modals
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [receiptData, setReceiptData] = useState<PosReceiptData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Scanner Input Ref for F2 shortcut
  const scannerRef = useRef<HTMLInputElement | null>(null);

  // Load parked carts from localStorage on client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PARKED_CARTS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setParkedCarts(parsed);
        }
      }
    } catch {
      // LocalStorage access issues fallback gracefully
    }
  }, []);

  // Save parked carts to localStorage
  const saveParkedCarts = (updatedCarts: PosParkedCart[]) => {
    setParkedCarts(updatedCarts);
    try {
      localStorage.setItem(PARKED_CARTS_STORAGE_KEY, JSON.stringify(updatedCarts));
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

  // Open Payment Modal (Requires active shift)
  const handleOpenPayment = useCallback(() => {
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
  }, [cartItems.length, shift]);

  // Execute Payment & Order Creation
  const handleConfirmPayment = async (
    paymentMethod: PosPaymentMethod,
    amountPaid: number,
    notes?: string
  ) => {
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

      // Update shift drawer sales stats in real time
      if (shift && shift.isOpen) {
        const saleAmt = result.data.total;
        setShift((prev) => {
          if (!prev) return null;
          const isCash = paymentMethod === "CASH";
          const isBkash = paymentMethod === "BKASH";
          const isCard = paymentMethod === "CARD";
          return {
            ...prev,
            cashSales: prev.cashSales + (isCash ? saleAmt : 0),
            bkashSales: prev.bkashSales + (isBkash ? saleAmt : 0),
            cardSales: prev.cardSales + (isCard ? saleAmt : 0),
            totalSales: prev.totalSales + saleAmt,
            ordersCount: prev.ordersCount + 1,
            expectedCash: prev.expectedCash + (isCash ? saleAmt : 0),
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
      } else if (e.key === "F9") {
        e.preventDefault();
        if (
          cartItems.length > 0 &&
          !isPaymentOpen &&
          !isReceiptOpen &&
          !isShiftModalOpen &&
          !isReturnModalOpen &&
          !isParkedModalOpen
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
    handleOpenPayment,
    handleParkCart,
  ]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-100 select-none">
      {/* Top Header with Live Drawer Badge & Returns Button */}
      <PosHeader
        cashierName={cashierName}
        cashierRole={cashierRole}
        shift={shift}
        onOpenShiftModal={() => setIsShiftModalOpen(true)}
        onOpenReturnModal={() => setIsReturnModalOpen(true)}
        parkedCount={parkedCarts.length}
        onOpenParkedModal={() => setIsParkedModalOpen(true)}
      />

      {/* Main Billing Counter Workspace */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left Section: Scanner + Catalog Grid (60-65% width) */}
        <section className="flex min-w-0 flex-1 flex-col">
          {/* Quick Barcode Scanner Bar */}
          <div className="border-b border-slate-200 bg-white p-3 shadow-sm">
            <PosProductScanner onAddVariant={handleAddVariant} scannerRef={scannerRef} />
          </div>

          {/* Product Grid & Categories */}
          <div className="flex-1 overflow-hidden">
            <PosProductGrid
              products={products}
              categories={categories}
              onAddVariant={handleAddVariant}
            />
          </div>
        </section>

        {/* Right Section: Billing Cart Panel (35-40% width) */}
        <aside className="z-10 h-full w-96 shadow-lg lg:w-[420px] xl:w-[460px]">
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
          />
        </aside>
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
