"use client";

import { useState } from "react";
import { Ticket, X, Copy, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

export interface CouponItem {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minOrderValue: number | null;
  endDate: Date | null;
}

interface AccountCouponsModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupons: CouponItem[];
}

export function AccountCouponsModal({ isOpen, onClose, coupons }: AccountCouponsModalProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Coupon code "${code}" copied to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md rounded-2xl border border-[#101114]/15 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="coupons-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#101114]/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00D9FF]/15 text-[#008ba3]">
              <Ticket className="size-5" />
            </div>
            <div>
              <h3 id="coupons-modal-title" className="text-base font-bold text-[#101114]">
                Active Coupons
              </h3>
              <p className="text-xs text-muted-foreground">
                Apply at checkout to save on your order
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-[#F3F0E8] hover:text-[#101114] transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 max-h-80 overflow-y-auto space-y-3 pr-1">
          {coupons.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              <Sparkles className="mx-auto size-7 text-muted-foreground/50 mb-2" />
              <p className="font-semibold text-[#101114]">No active coupons right now</p>
              <p className="mt-1">Check back during special seasonal drops and events!</p>
            </div>
          ) : (
            coupons.map((coupon) => {
              const isCopied = copiedCode === coupon.code;
              const discountLabel =
                coupon.discountType === "PERCENTAGE"
                  ? `${coupon.discountValue}% OFF`
                  : `৳ ${coupon.discountValue.toLocaleString()} OFF`;

              return (
                <div
                  key={coupon.id}
                  className="flex items-center justify-between rounded-xl border border-dashed border-[#101114]/20 bg-[#F3F0E8]/50 p-3.5 transition-colors hover:border-[#00D9FF]"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-extrabold uppercase tracking-wider text-[#101114]">
                        {coupon.code}
                      </span>
                      <span className="rounded-full bg-[#00D9FF]/20 px-2 py-0.5 text-[10px] font-bold text-[#007b91]">
                        {discountLabel}
                      </span>
                    </div>

                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {coupon.minOrderValue
                        ? `Min. order ৳ ${coupon.minOrderValue.toLocaleString()}`
                        : "No minimum order requirement"}
                      {coupon.endDate && ` • Expires ${new Date(coupon.endDate).toLocaleDateString()}`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(coupon.code)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#101114]/15 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#101114] shadow-2xs hover:bg-[#101114] hover:text-white transition-colors"
                  >
                    {isCopied ? (
                      <>
                        <Check className="size-3 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 border-t border-[#101114]/10 pt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#101114] px-4 py-2 text-xs font-bold text-white hover:bg-[#1f2229] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
