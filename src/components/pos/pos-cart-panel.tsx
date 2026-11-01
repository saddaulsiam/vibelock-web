"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Trash2,
  Plus,
  Minus,
  User,
  Phone,
  Tag,
  ShoppingCart,
  PauseCircle,
  Crown,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { PosCartItem } from "@/lib/pos/pos-types";
import { lookupPosCustomerByPhoneAction } from "@/lib/pos/pos-customer-actions";
import type { PosCustomerProfile } from "@/lib/pos/pos-customer-types";
import { toast } from "sonner";

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
  isOnline?: boolean;
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
  isOnline = true,
}: PosCartPanelProps) {
  // Customer Profile & Loyalty state
  const [customerProfile, setCustomerProfile] = useState<PosCustomerProfile | null>(null);
  const [isLookingUp, startLookup] = useTransition();
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Debounced auto-lookup customer by phone
  useEffect(() => {
    const digits = customerPhone.replace(/\D/g, "");
    if (digits.length < 11) {
      return;
    }

    let isMounted = true;

    const timer = setTimeout(() => {
      startLookup(async () => {
        try {
          const res = await lookupPosCustomerByPhoneAction(customerPhone);
          if (!isMounted) return;
          setHasSearched(true);
          if (res.success && res.data) {
            const profile = res.data;
            setCustomerProfile(profile);
            if (!customerName.trim() || customerName.trim() === "Walk-in Customer") {
              setCustomerName(profile.name);
              toast.success(`Customer recognized: ${profile.name} (${profile.tier} Member)`);
            }
          } else {
            setCustomerProfile(null);
          }
        } catch {
          if (isMounted) {
            setCustomerProfile(null);
            setHasSearched(true);
          }
        }
      });
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [customerPhone, customerName, setCustomerName]);

  const getTierBadgeStyle = (tier: string) => {
    switch (tier) {
      case "PLATINUM":
        return "bg-purple-100 text-purple-800 border-purple-200 font-bold";
      case "GOLD":
        return "bg-amber-100 text-amber-900 border-amber-300 font-bold";
      case "SILVER":
        return "bg-sky-100 text-sky-800 border-sky-200 font-semibold";
      default:
        return "bg-orange-100 text-orange-800 border-orange-200";
    }
  };

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
    <div className="flex h-full flex-col border-l border-slate-200 bg-white">
      {/* Cart Header */}
      <div className="flex items-center justify-between bg-slate-900 p-3 text-white">
        <div className="flex items-center space-x-2">
          <ShoppingCart className="h-5 w-5 text-amber-400" />
          <h3 className="text-sm font-semibold tracking-wide">Current Sale</h3>
          <Badge className="h-5 bg-amber-500 px-1.5 text-xs font-bold text-slate-950 hover:bg-amber-500">
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
                className="flex h-7 items-center space-x-1 px-2 text-xs text-amber-400 hover:bg-slate-800 hover:text-amber-300"
                title="Hold / Suspend this cart [F4]"
              >
                <PauseCircle className="h-3.5 w-3.5" />
                <span>Hold</span>
                <span className="hidden rounded bg-slate-800 px-1 font-mono text-[10px] text-slate-400 sm:inline">
                  F4
                </span>
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearCart}
              className="h-7 px-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-red-400"
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Customer Quick Capture (Phone & Name) */}
      <div className="space-y-2 border-b border-slate-200 bg-slate-50 p-3 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="mb-1 flex items-center justify-between text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              <span className="flex items-center">
                <Phone className="mr-1 h-3 w-3 text-slate-400" /> Customer Phone
              </span>
              {isLookingUp && <Loader2 className="h-3 w-3 animate-spin text-amber-500" />}
            </Label>
            <Input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="017XXXXXXXX"
              className="h-8 border-slate-300 bg-white font-mono text-xs"
            />
          </div>
          <div>
            <Label className="mb-1 flex items-center text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              <User className="mr-1 h-3 w-3 text-slate-400" /> Customer Name
            </Label>
            <Input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Walk-in Customer"
              className="h-8 border-slate-300 bg-white text-xs"
            />
          </div>
        </div>

        {/* Customer Recognized Loyalty Banner */}
        {customerProfile ? (
          <div className="animate-in fade-in-50 space-y-1.5 rounded-md border border-amber-200/90 bg-gradient-to-r from-amber-50/80 to-orange-50/80 p-2 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center space-x-1.5">
                <Crown className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                <span className="truncate text-[11px] font-bold text-slate-900">
                  {customerProfile.name}
                </span>
                <Badge
                  className={`h-4 px-1.5 py-0 text-[10px] ${getTierBadgeStyle(customerProfile.tier)}`}
                >
                  {customerProfile.tier}
                </Badge>
              </div>
              <span className="flex-shrink-0 font-mono text-[10px] text-slate-500">
                {customerProfile.ordersCount}{" "}
                {customerProfile.ordersCount === 1 ? "order" : "orders"} &middot; ৳
                {customerProfile.totalSpent.toLocaleString()} LTV
              </span>
            </div>

            {/* Points & Redemption */}
            <div className="flex items-center justify-between border-t border-amber-200/60 pt-1 text-[11px]">
              <span className="text-slate-600">
                Points:{" "}
                <strong className="font-mono text-amber-800">
                  {customerProfile.loyaltyPoints} pts
                </strong>
                {customerProfile.pointsDiscountValue > 0 &&
                  ` (৳${customerProfile.pointsDiscountValue})`}
              </span>
              {customerProfile.pointsDiscountValue > 0 &&
                (discount === customerProfile.pointsDiscountValue ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDiscount(0);
                      toast.info("Loyalty discount removed.");
                    }}
                    className="rounded border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    Points Applied ✓ (Remove)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setDiscount(customerProfile.pointsDiscountValue);
                      toast.success(
                        `Applied ৳${customerProfile.pointsDiscountValue} loyalty discount!`
                      );
                    }}
                    className="rounded border border-amber-400 bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900 shadow-2xs transition-colors hover:bg-amber-300"
                  >
                    Redeem (-৳{customerProfile.pointsDiscountValue})
                  </button>
                ))}
            </div>
          </div>
        ) : (
          hasSearched &&
          customerPhone.replace(/\D/g, "").length >= 11 && (
            <div className="flex items-center space-x-1 px-0.5 text-[10px] text-slate-400">
              <Sparkles className="h-3 w-3 text-slate-400" />
              <span>New Customer &middot; Profile will be saved upon checkout</span>
            </div>
          )
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 divide-y divide-slate-100 overflow-y-auto p-2">
        {cartItems.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center px-4 text-center text-slate-400">
            <ShoppingCart className="mb-2 h-10 w-10 stroke-1 text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">Counter Cart is Empty</p>
            <p className="mt-1 text-[11px] text-slate-400">
              Scan barcode or select an item from the catalog to begin billing.
            </p>
          </div>
        ) : (
          cartItems.map((item) => {
            const variantDesc = [item.size, item.color].filter(Boolean).join(" / ");
            const itemTotal = item.price * item.quantity;
            const isAtMaxStock = item.quantity >= item.maxStock;

            return (
              <div
                key={item.variantId}
                className="flex items-center justify-between px-1 py-2 text-xs"
              >
                {/* Product Name & SKU */}
                <div className="min-w-0 flex-1 pr-2">
                  <p className="truncate leading-snug font-semibold text-slate-900">
                    {item.productName}
                  </p>
                  <div className="mt-0.5 flex items-center space-x-1.5">
                    <span className="font-mono text-[10px] font-medium text-slate-500">
                      {item.sku}
                    </span>
                    {variantDesc && (
                      <Badge variant="outline" className="border-slate-300 px-1 py-0 text-[9px]">
                        {variantDesc}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-600">৳{item.price.toFixed(0)} each</p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.variantId, item.quantity - 1)}
                    className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200"
                    title="Decrease quantity"
                  >
                    <Minus className="h-3 w-3" />
                  </button>

                  <span className="w-7 text-center font-mono text-xs font-bold text-slate-900">
                    {item.quantity}
                  </span>

                  <button
                    type="button"
                    disabled={isAtMaxStock}
                    onClick={() => onUpdateQuantity(item.variantId, item.quantity + 1)}
                    className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
                      isAtMaxStock
                        ? "cursor-not-allowed bg-slate-100 text-slate-300"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                    title={
                      isAtMaxStock
                        ? `Max available stock reached (${item.maxStock})`
                        : "Increase quantity"
                    }
                  >
                    <Plus className="h-3 w-3" />
                  </button>

                  {/* Line Total */}
                  <div className="ml-1 w-16 text-right font-mono text-xs font-bold text-slate-900">
                    ৳{itemTotal.toFixed(0)}
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.variantId)}
                    className="ml-1 p-1 text-slate-400 transition-colors hover:text-red-500"
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
      <div className="space-y-2 border-t border-slate-200 bg-slate-50 p-3">
        {/* Discount Row & Quick Presets */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center font-medium text-slate-600">
              <Tag className="mr-1 h-3 w-3 text-slate-400" /> Counter Discount (৳)
            </span>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => applyPercentDiscount(5)}
                className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-300"
              >
                5%
              </button>
              <button
                type="button"
                onClick={() => applyPercentDiscount(10)}
                className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-300"
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
                className="h-7 w-20 border-slate-300 bg-white text-right font-mono text-xs font-bold"
              />
            </div>
          </div>
        </div>

        {/* Totals Breakdown */}
        <div className="space-y-1 border-t border-slate-200 pt-1 text-xs">
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

          <div className="flex items-baseline justify-between border-t border-slate-200 pt-1 font-bold text-slate-950">
            <span className="text-sm">Payable Amount:</span>
            <span className="font-mono text-xl tracking-tight text-slate-900">
              ৳{grandTotal.toFixed(0)}
            </span>
          </div>
        </div>

        {/* Checkout Button */}
        <Button
          type="button"
          disabled={cartItems.length === 0}
          onClick={onOpenPaymentModal}
          className={`mt-2 flex h-12 w-full items-center justify-center space-x-2 rounded-lg text-sm font-bold tracking-wide shadow-md transition-all ${
            !isOnline
              ? "bg-slate-700 text-slate-200 hover:bg-slate-600"
              : "bg-amber-500 text-slate-950 hover:bg-amber-400"
          }`}
        >
          <span>
            {!isOnline
              ? `OFFLINE (LOCKED) ৳${grandTotal.toFixed(0)}`
              : `CHARGE ৳${grandTotal.toFixed(0)}`}
          </span>
          <span className="rounded bg-black/20 px-1.5 py-0.5 font-mono text-[11px] text-white">
            [F9]
          </span>
        </Button>
      </div>
    </div>
  );
}
