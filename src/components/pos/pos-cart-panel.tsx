"use client";

import {
  Trash2,
  Plus,
  Minus,
  User,
  Phone,
  Tag,
  ShoppingCart,
  PauseCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { PosCartItem } from "@/lib/pos/pos-types";

interface PosCartPanelProps {
  cartItems: PosCartItem[];
  customerPhone: string;
  setCustomerPhone: (val: string) => void;
  customerName: string;
  setCustomerName: (val: string) => void;
  discount: number;
  setDiscount: (val: number) => void;
  onUpdateQuantity: (variantId: string, quantity: number) => void;
  onRemoveItem: (variantId: string) => void;
  onClearCart: () => void;
  onOpenPaymentModal: () => void;
  onParkCart?: () => void;
}

export function PosCartPanel({
  cartItems,
  customerPhone,
  setCustomerPhone,
  customerName,
  setCustomerName,
  discount,
  setDiscount,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOpenPaymentModal,
  onParkCart,
}: PosCartPanelProps) {
  // Financial computations
  const totalItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const effectiveDiscount = Math.min(subtotal, Math.max(0, discount));
  const grandTotal = Math.max(0, subtotal - effectiveDiscount);

  const applyPercentDiscount = (percent: number) => {
    const calculated = Math.round((subtotal * percent) / 100);
    setDiscount(calculated);
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200">
      {/* Cart Header */}
      <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShoppingCart className="h-5 w-5 text-amber-400" />
          <h3 className="font-semibold text-sm tracking-wide">Current Sale</h3>
          <Badge className="bg-amber-500 text-slate-950 font-bold text-xs h-5 px-1.5 hover:bg-amber-500">
            {totalItemsCount}
          </Badge>
        </div>

        {cartItems.length > 0 && (
          <div className="flex items-center space-x-1">
            {onParkCart && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onParkCart}
                className="text-amber-400 hover:text-amber-300 hover:bg-slate-800 h-7 px-2 text-xs flex items-center space-x-1"
                title="Hold / Suspend this cart [F4]"
              >
                <PauseCircle className="h-3.5 w-3.5" />
                <span>Hold</span>
                <span className="text-[10px] bg-slate-800 px-1 rounded text-slate-400 font-mono hidden sm:inline">
                  F4
                </span>
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearCart}
              className="text-slate-400 hover:text-red-400 hover:bg-slate-800 h-7 px-2 text-xs"
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Customer Quick Capture (Phone & Name) */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 grid grid-cols-2 gap-2 text-xs">
        <div>
          <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center mb-1">
            <Phone className="h-3 w-3 mr-1 text-slate-400" /> Customer Phone
          </Label>
          <Input
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="017XXXXXXXX"
            className="h-8 text-xs bg-white border-slate-300 font-mono"
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center mb-1">
            <User className="h-3 w-3 mr-1 text-slate-400" /> Customer Name
          </Label>
          <Input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Walk-in Customer"
            className="h-8 text-xs bg-white border-slate-300"
          />
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400 px-4">
            <ShoppingCart className="h-10 w-10 text-slate-300 stroke-1 mb-2" />
            <p className="text-xs font-semibold text-slate-600">Counter Cart is Empty</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Scan barcode or select an item from the catalog to begin billing.
            </p>
          </div>
        ) : (
          cartItems.map((item) => {
            const variantDesc = [item.size, item.color].filter(Boolean).join(" / ");
            const itemTotal = item.price * item.quantity;
            const isAtMaxStock = item.quantity >= item.maxStock;

            return (
              <div key={item.variantId} className="py-2 px-1 flex items-center justify-between text-xs">
                {/* Product Name & SKU */}
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-semibold text-slate-900 truncate leading-snug">{item.productName}</p>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className="font-mono text-[10px] text-slate-500 font-medium">{item.sku}</span>
                    {variantDesc && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-slate-300">
                        {variantDesc}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    ৳{item.price.toFixed(0)} each
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.variantId, item.quantity - 1)}
                    className="h-6 w-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
                    title="Decrease quantity"
                  >
                    <Minus className="h-3 w-3" />
                  </button>

                  <span className="w-7 text-center font-bold text-xs text-slate-900 font-mono">
                    {item.quantity}
                  </span>

                  <button
                    type="button"
                    disabled={isAtMaxStock}
                    onClick={() => onUpdateQuantity(item.variantId, item.quantity + 1)}
                    className={`h-6 w-6 rounded flex items-center justify-center transition-colors ${
                      isAtMaxStock
                        ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                    title={isAtMaxStock ? `Max available stock reached (${item.maxStock})` : "Increase quantity"}
                  >
                    <Plus className="h-3 w-3" />
                  </button>

                  {/* Line Total */}
                  <div className="w-16 text-right font-bold text-slate-900 font-mono text-xs ml-1">
                    ৳{itemTotal.toFixed(0)}
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.variantId)}
                    className="text-slate-400 hover:text-red-500 p-1 transition-colors ml-1"
                    title="Remove item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bill Calculation & Summary */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2">
        {/* Discount Row & Quick Presets */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium flex items-center">
              <Tag className="h-3 w-3 mr-1 text-slate-400" /> Counter Discount (৳)
            </span>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => applyPercentDiscount(5)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 font-semibold text-slate-700"
              >
                5%
              </button>
              <button
                type="button"
                onClick={() => applyPercentDiscount(10)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 font-semibold text-slate-700"
              >
                10%
              </button>
              <Input
                type="number"
                min="0"
                max={subtotal}
                value={discount === 0 ? "" : discount}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                placeholder="0"
                className="w-20 h-7 text-right text-xs bg-white border-slate-300 font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {/* Totals Breakdown */}
        <div className="space-y-1 text-xs pt-1 border-t border-slate-200">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal:</span>
            <span className="font-mono font-medium">৳{subtotal.toFixed(0)}</span>
          </div>

          {effectiveDiscount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Discount:</span>
              <span className="font-mono font-medium">- ৳{effectiveDiscount.toFixed(0)}</span>
            </div>
          )}

          <div className="flex justify-between items-baseline pt-1 border-t border-slate-200 text-slate-950 font-bold">
            <span className="text-sm">Payable Amount:</span>
            <span className="text-xl font-mono text-slate-900 tracking-tight">
              ৳{grandTotal.toFixed(0)}
            </span>
          </div>
        </div>

        {/* Checkout Button */}
        <Button
          type="button"
          disabled={cartItems.length === 0}
          onClick={onOpenPaymentModal}
          className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm tracking-wide shadow-md transition-all rounded-lg mt-2 flex items-center justify-center space-x-2"
        >
          <span>CHARGE ৳{grandTotal.toFixed(0)}</span>
          <span className="bg-amber-600/30 px-1.5 py-0.5 rounded text-[11px] font-mono">[F9]</span>
        </Button>
      </div>
    </div>
  );
}
