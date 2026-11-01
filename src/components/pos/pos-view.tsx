"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { PosHeader } from "./pos-header";
import { PosProductScanner } from "./pos-product-scanner";
import { PosProductGrid } from "./pos-product-grid";
import { PosCartPanel } from "./pos-cart-panel";
import { PosPaymentModal } from "./pos-payment-modal";
import { PosThermalReceipt } from "./pos-thermal-receipt";
import { createPosOrderAction } from "@/lib/pos/pos-actions";
import type {
  PosCartItem,
  PosCategory,
  PosPaymentMethod,
  PosProductSummary,
  PosProductVariant,
  PosReceiptData,
} from "@/lib/pos/pos-types";
import { toast } from "sonner";

interface PosViewProps {
  products: PosProductSummary[];
  categories: PosCategory[];
  cashierName: string;
  cashierRole: string;
}

export function PosView({
  products,
  categories,
  cashierName,
  cashierRole,
}: PosViewProps) {
  // State
  const [cartItems, setCartItems] = useState<PosCartItem[]>([]);
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [discount, setDiscount] = useState<number>(0);

  // Modals
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [receiptData, setReceiptData] = useState<PosReceiptData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Scanner Input Ref for F2 shortcut
  const scannerRef = useRef<HTMLInputElement | null>(null);

  // Add Variant to Cart Handler
  const handleAddVariant = useCallback(
    (variant: PosProductVariant, product: PosProductSummary) => {
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
    },
    []
  );

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

  // Open Payment Modal
  const handleOpenPayment = useCallback(() => {
    if (cartItems.length === 0) {
      toast.error("Cart is empty. Add items before proceeding to payment.");
      return;
    }
    setIsPaymentOpen(true);
  }, [cartItems.length]);

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

      // Reset cart
      setCartItems([]);
      setCustomerPhone("");
      setCustomerName("");
      setDiscount(0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred during checkout";
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

  // Global Keyboard Shortcuts (F2: Scanner, F9: Payment, Esc: Close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        scannerRef.current?.focus();
      } else if (e.key === "F9") {
        e.preventDefault();
        if (cartItems.length > 0 && !isPaymentOpen && !isReceiptOpen) {
          handleOpenPayment();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cartItems.length, isPaymentOpen, isReceiptOpen, handleOpenPayment]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 select-none">
      {/* Top Header */}
      <PosHeader cashierName={cashierName} cashierRole={cashierRole} />

      {/* Main Billing Counter Workspace */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Section: Scanner + Catalog Grid (60-65% width) */}
        <section className="flex-1 flex flex-col min-w-0">
          {/* Quick Barcode Scanner Bar */}
          <div className="p-3 bg-white border-b border-slate-200 shadow-sm">
            <PosProductScanner
              onAddVariant={handleAddVariant}
              scannerRef={scannerRef}
            />
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
        <aside className="w-96 lg:w-[420px] xl:w-[460px] h-full shadow-lg z-10">
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
          />
        </aside>
      </main>

      {/* Payment Settlement Modal */}
      <PosPaymentModal
        isOpen={isPaymentOpen}
        onClose={() => !isSubmitting && setIsPaymentOpen(false)}
        grandTotal={grandTotal}
        onConfirmPayment={handleConfirmPayment}
        isSubmitting={isSubmitting}
      />

      {/* Thermal Cash Memo Receipt Modal */}
      <PosThermalReceipt
        receipt={receiptData}
        isOpen={isReceiptOpen}
        onNewSale={handleNewSale}
      />
    </div>
  );
}
