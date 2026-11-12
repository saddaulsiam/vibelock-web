"use client";

import { useState } from "react";
import { Ticket, Copy, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Coupon code "${code}" copied to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent variant="brand" size="lg">
        {/* Header */}
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="bg-vl-cyan-100 text-vl-cyan-dark flex size-9 items-center justify-center rounded-xl">
              <Ticket className="size-5" />
            </div>
            <div>
              <DialogTitle>Active Coupons</DialogTitle>
              <DialogDescription>Apply at checkout to save on your order</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="mt-2 max-h-80 space-y-3 overflow-y-auto pr-1">
          {coupons.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center text-xs">
              <Sparkles className="text-muted-foreground/50 mx-auto mb-2 size-7" />
              <p className="text-vl-dark-900 font-semibold">No active coupons right now</p>
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
                  className="border-vl-dark-900/20 bg-vl-white-300/50 hover:border-vl-cyan flex items-center justify-between rounded-xl border border-dashed p-3.5 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-vl-dark-900 font-mono text-sm font-extrabold tracking-wider uppercase">
                        {coupon.code}
                      </span>
                      <Badge variant="cyan" size="sm">
                        {discountLabel}
                      </Badge>
                    </div>

                    <p className="text-muted-foreground mt-1 text-[11px]">
                      {coupon.minOrderValue
                        ? `Min. order ৳ ${coupon.minOrderValue.toLocaleString()}`
                        : "No minimum order requirement"}
                      {coupon.endDate &&
                        ` • Expires ${new Date(coupon.endDate).toLocaleDateString()}`}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => handleCopy(coupon.code)}
                    className="gap-1 font-semibold"
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
                  </Button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-vl-dark-900/10 mt-3 flex justify-end border-t pt-3">
          <Button variant="primary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
