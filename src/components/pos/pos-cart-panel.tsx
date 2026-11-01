"use client";

import { useState, useEffect, useTransition } from "react";
import Image from "next/image";
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
  Package,
  X,
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
  onCloseMobile?: () => void;
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
  onCloseMobile,
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
        return "bg-vl-cyan text-vl-black font-heading font-black shadow-[0_0_8px_rgba(0,217,255,0.35)]";
      case "GOLD":
        return "bg-amber-400 text-slate-950 font-bold";
      case "SILVER":
        return "bg-slate-200 text-slate-900 font-semibold";
      default:
        return "bg-vl-border text-vl-white";
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
    <div className="flex h-full flex-col border-l border-[#d6d2c4] bg-white">
      {/* Cart Header */}
      <div className="bg-vl-black text-vl-white border-vl-border flex items-center justify-between border-b p-3">
        <div className="flex items-center space-x-2">
          {onCloseMobile && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onCloseMobile}
              className="text-vl-white/80 -ml-1 h-7 w-7 rounded-lg hover:bg-white/10 hover:text-white lg:hidden"
              title="Close ticket and return to catalog"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <ShoppingCart className="text-vl-cyan h-5 w-5" />
          <h3 className="font-heading text-vl-white text-sm font-black tracking-wider">
            Current Sale
          </h3>
          <Badge className="bg-vl-cyan font-heading text-vl-black hover:bg-vl-cyan h-5 px-1.5 text-xs font-black">
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
                className="text-vl-cyan hover:bg-vl-cyan/15 flex h-7 items-center space-x-1 px-2 text-xs hover:text-white"
                title="Hold / Suspend this cart [F4]"
              >
                <PauseCircle className="h-3.5 w-3.5" />
                <span>Hold</span>
                <span className="text-vl-white/70 hidden rounded bg-white/10 px-1 font-mono text-[10px] sm:inline">
                  F4
                </span>
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearCart}
              className="text-vl-white/60 h-7 px-2 text-xs hover:bg-white/10 hover:text-red-400"
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Customer Quick Capture (Phone & Name) */}
      <div className="space-y-2 border-b border-[#e2ded2] bg-[#faf9f5] p-3 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-vl-grey mb-1 flex items-center justify-between text-[10px] font-bold tracking-wider uppercase">
              <span className="flex items-center">
                <Phone className="text-vl-grey mr-1 h-3 w-3" /> Customer Phone
              </span>
              {isLookingUp && <Loader2 className="text-vl-cyan h-3 w-3 animate-spin" />}
            </Label>
            <Input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="017XXXXXXXX"
              className="focus-visible:border-vl-cyan focus-visible:ring-vl-cyan/20 h-8 border-[#d6d2c4] bg-white font-mono text-xs"
            />
          </div>
          <div>
            <Label className="text-vl-grey mb-1 flex items-center text-[10px] font-bold tracking-wider uppercase">
              <User className="text-vl-grey mr-1 h-3 w-3" /> Customer Name
            </Label>
            <Input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Walk-in Customer"
              className="focus-visible:border-vl-cyan focus-visible:ring-vl-cyan/20 h-8 border-[#d6d2c4] bg-white text-xs"
            />
          </div>
        </div>

        {/* Customer Recognized Loyalty Banner */}
        {customerProfile ? (
          <div className="animate-in fade-in-50 border-vl-cyan/40 bg-vl-black text-vl-white space-y-1.5 rounded-md border p-2.5 shadow-xs duration-200">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center space-x-1.5">
                <Crown className="text-vl-cyan h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-vl-white truncate text-[11px] font-bold">
                  {customerProfile.name}
                </span>
                <Badge
                  className={`h-4 px-1.5 py-0 text-[10px] ${getTierBadgeStyle(customerProfile.tier)}`}
                >
                  {customerProfile.tier}
                </Badge>
              </div>
              <span className="text-vl-grey flex-shrink-0 font-mono text-[10px]">
                {customerProfile.ordersCount}{" "}
                {customerProfile.ordersCount === 1 ? "order" : "orders"} &middot; ৳
                {customerProfile.totalSpent.toLocaleString()} LTV
              </span>
            </div>

            {/* Points & Redemption */}
            <div className="border-vl-border flex items-center justify-between border-t pt-1.5 text-[11px]">
              <span className="text-vl-white/80">
                Points:{" "}
                <strong className="text-vl-cyan font-mono">
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
                    className="rounded border border-emerald-400 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 transition-colors hover:bg-red-500/20 hover:text-red-300"
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
                    className="bg-vl-cyan text-vl-black rounded px-2 py-0.5 text-[10px] font-bold shadow-[0_0_10px_rgba(0,217,255,0.3)] transition-all hover:bg-[#2ae0ff]"
                  >
                    Redeem (-৳{customerProfile.pointsDiscountValue})
                  </button>
                ))}
            </div>
          </div>
        ) : (
          hasSearched &&
          customerPhone.replace(/\D/g, "").length >= 11 && (
            <div className="text-vl-grey flex items-center space-x-1 px-0.5 text-[10px]">
              <Sparkles className="text-vl-cyan h-3 w-3" />
              <span>New Customer &middot; Profile will be saved upon checkout</span>
            </div>
          )
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 divide-y divide-slate-100 overflow-y-auto p-2">
        {cartItems.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center px-4 text-center text-slate-400">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#e2ded2] bg-[#faf9f5] text-slate-300">
              <ShoppingCart className="h-7 w-7 stroke-1 text-slate-400" />
            </div>
            <p className="font-heading text-vl-black text-xs font-bold">Counter Cart is Empty</p>
            <p className="text-vl-grey mt-1 max-w-[200px] text-[11px]">
              Scan barcode or select an item from the catalog to begin billing.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {cartItems.map((item) => {
              const variantDesc = [item.size, item.color].filter(Boolean).join(" / ");
              const itemTotal = item.price * item.quantity;
              const isAtMaxStock = item.quantity >= item.maxStock;

              return (
                <div
                  key={item.variantId}
                  className="group flex items-center justify-between rounded-xl border border-transparent p-2 transition-all hover:border-[#e2ded2] hover:bg-[#faf9f5]"
                >
                  {/* Item Thumbnail */}
                  <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg border border-[#e2ded2] bg-[#f2f2f2]">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.productName}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-300">
                        <Package className="h-5 w-5 stroke-1" />
                      </div>
                    )}
                  </div>

                  {/* Product Name & SKU */}
                  <div className="min-w-0 flex-1 px-2.5">
                    <p className="font-heading text-vl-black truncate text-xs leading-snug font-bold">
                      {item.productName}
                    </p>
                    <div className="mt-0.5 flex items-center space-x-1.5">
                      <span className="text-vl-grey font-mono text-[10px] font-medium">
                        {item.sku}
                      </span>
                      {variantDesc && (
                        <Badge
                          variant="outline"
                          className="text-vl-black border-[#d6d2c4] bg-white px-1.5 py-0 text-[9px] font-medium"
                        >
                          {variantDesc}
                        </Badge>
                      )}
                    </div>
                    <p className="text-vl-grey mt-0.5 font-mono text-[11px] font-medium">
                      ৳{item.price.toFixed(0)} each
                    </p>
                  </div>

                  {/* Quantity Controls & Line Total */}
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.variantId, item.quantity - 1)}
                      className="text-vl-black flex h-7 w-7 items-center justify-center rounded-lg border border-[#d6d2c4] bg-white transition-all hover:bg-[#f0ede6] active:scale-90"
                      title="Decrease quantity"
                    >
                      <Minus className="h-3 w-3" />
                    </button>

                    <span className="text-vl-black w-6 text-center font-mono text-xs font-black">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      disabled={isAtMaxStock}
                      onClick={() => onUpdateQuantity(item.variantId, item.quantity + 1)}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${
                        isAtMaxStock
                          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300"
                          : "text-vl-black border-[#d6d2c4] bg-white hover:bg-[#f0ede6] active:scale-90"
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
                    <div className="text-vl-black ml-1 w-16 text-right font-mono text-xs font-black">
                      ৳{itemTotal.toFixed(0)}
                    </div>

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.variantId)}
                      className="ml-1 rounded-md p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 active:scale-90"
                      title="Remove item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bill Calculation & Summary */}
      <div className="space-y-3 border-t border-[#e2ded2] bg-[#faf9f5] p-3.5">
        {/* Discount Row & Quick Presets */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-vl-grey flex items-center text-[10px] font-bold tracking-wider uppercase">
              <Tag className="text-vl-grey mr-1 h-3 w-3" /> Counter Discount
            </span>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => applyPercentDiscount(5)}
                className="text-vl-black hover:border-vl-cyan hover:bg-vl-cyan/10 rounded-md border border-[#d6d2c4] bg-white px-2 py-0.5 font-mono text-[10px] font-bold transition-colors"
              >
                5%
              </button>
              <button
                type="button"
                onClick={() => applyPercentDiscount(10)}
                className="text-vl-black hover:border-vl-cyan hover:bg-vl-cyan/10 rounded-md border border-[#d6d2c4] bg-white px-2 py-0.5 font-mono text-[10px] font-bold transition-colors"
              >
                10%
              </button>
              <div className="relative">
                <span className="text-vl-grey absolute top-1.5 left-2 text-[10px] font-bold">
                  ৳
                </span>
                <Input
                  type="number"
                  min="0"
                  max={subtotal}
                  value={discount === 0 ? "" : discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                  className="focus-visible:border-vl-cyan h-7 w-20 rounded-md border-[#d6d2c4] bg-white pr-1 pl-4 text-right font-mono text-xs font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Totals Breakdown */}
        <div className="space-y-2 border-t border-[#e2ded2] pt-2 text-xs">
          <div className="text-vl-grey flex justify-between font-medium">
            <span>Subtotal ({totalItemsCount} items):</span>
            <span className="text-vl-black font-mono font-semibold">৳{subtotal.toFixed(0)}</span>
          </div>

          {effectiveDiscount > 0 && (
            <div className="flex justify-between font-medium text-emerald-600">
              <span>Counter Discount:</span>
              <span className="font-mono font-semibold">- ৳{effectiveDiscount.toFixed(0)}</span>
            </div>
          )}

          {/* Net Payable Box */}
          <div className="border-vl-border bg-vl-black text-vl-white rounded-xl border p-3 shadow-xs">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="font-heading text-vl-grey text-xs font-bold tracking-widest uppercase">
                  Net Payable
                </span>
                <p className="text-vl-white/60 text-[10px]">Tax inclusive</p>
              </div>
              <span className="font-heading text-vl-cyan text-3xl font-black tracking-tight">
                ৳{grandTotal.toFixed(0)}
              </span>
            </div>
          </div>
        </div>

        {/* Checkout Button */}
        <Button
          type="button"
          disabled={cartItems.length === 0}
          onClick={onOpenPaymentModal}
          className={`font-heading flex h-12 w-full items-center justify-center space-x-2 rounded-xl text-sm font-black tracking-widest shadow-md transition-all active:scale-[0.99] ${
            !isOnline
              ? "border-vl-border text-vl-grey cursor-not-allowed border bg-[#212228]"
              : "bg-vl-cyan text-vl-black shadow-[0_0_24px_rgba(0,217,255,0.35)] hover:bg-[#2ae0ff] hover:shadow-[0_0_32px_rgba(0,217,255,0.5)]"
          }`}
        >
          <span>
            {!isOnline
              ? `OFFLINE (LOCKED) ৳${grandTotal.toFixed(0)}`
              : `CHARGE ৳${grandTotal.toFixed(0)}`}
          </span>
          <span className="text-vl-black rounded bg-black/20 px-2 py-0.5 font-mono text-[11px] font-bold">
            [F9]
          </span>
        </Button>
      </div>
    </div>
  );
}
