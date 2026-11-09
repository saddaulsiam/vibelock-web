"use client";

import { useState } from "react";
import Link from "next/link";
import { Ticket, Copy, Check, Sparkles, ArrowRight, ShieldCheck, Tag } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface CustomerCoupon {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minOrderValue: number | null;
  startDate: Date | null;
  endDate: Date | null;
  isPersonalCredit?: boolean;
}

interface CouponsViewProps {
  coupons: CustomerCoupon[];
}

export function CouponsView({ coupons }: CouponsViewProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Coupon code "${code}" copied to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Main Coupons Container ── */}
      <div className="border-vl-dark-900/8 overflow-hidden rounded-2xl border bg-white shadow-2xs">
        {/* Header */}
        <div className="border-vl-dark-900/8 flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-6 md:p-7">
          <div>
            <p className="text-vl-cyan text-[10px] font-semibold tracking-[0.15em] uppercase sm:text-[11px] sm:tracking-[0.2em]">
              Vouchers & Rewards
            </p>
            <h1 className="text-vl-dark-900 mt-0.5 text-base font-bold tracking-tight uppercase sm:text-2xl">
              Coupons & Vouchers
            </h1>
            <p className="mt-0.5 text-xs text-neutral-500">
              Apply valid voucher codes at checkout to unlock member discounts and credits
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="info">
              {coupons.length} {coupons.length === 1 ? "Coupon Available" : "Coupons Available"}
            </Badge>
          </div>
        </div>

        {/* Content */}
        {coupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 py-16 text-center sm:p-14">
            <div className="text-vl-dark-900 flex size-14 items-center justify-center rounded-2xl bg-neutral-100">
              <Sparkles className="size-6 text-neutral-400" />
            </div>
            <h2 className="text-vl-dark-900 mt-4 text-base font-bold uppercase">
              No active coupons right now
            </h2>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-neutral-500 sm:text-sm">
              Keep an eye on seasonal drop announcements, member rewards, or private sales for
              secret vault codes.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/shop"
                className="bg-vl-dark-900 inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-xs font-semibold tracking-wider text-white uppercase transition-colors hover:bg-neutral-800"
              >
                <span>Explore Drops</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 md:p-7">
            {/* Coupon Grid */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {coupons.map((coupon) => {
                const isCopied = copiedCode === coupon.code;
                const isPercentage = coupon.discountType === "PERCENTAGE";
                const discountDisplay = isPercentage
                  ? `${coupon.discountValue}% OFF`
                  : `৳ ${coupon.discountValue.toLocaleString("en-BD")} OFF`;

                return (
                  <Card
                    key={coupon.id}
                    variant="interactive"
                    className="justify-between p-4 sm:p-5"
                  >
                    <div>
                      {/* Top Row: Type & Discount Badge */}
                      <div className="flex items-center justify-between gap-2">
                        {coupon.isPersonalCredit ? (
                          <Badge variant="warning" className="gap-1 font-semibold">
                            <ShieldCheck className="size-3 text-amber-600" />
                            Store Credit Voucher
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1 font-semibold">
                            <Tag className="size-3 text-neutral-500" />
                            Member Promo
                          </Badge>
                        )}

                        <Badge variant="brand" className="font-bold">
                          {discountDisplay}
                        </Badge>
                      </div>

                      {/* Code Block */}
                      <div className="border-vl-dark-900/20 bg-vl-white-100 mt-3.5 flex items-center justify-between gap-2 rounded-xl border border-dashed p-3">
                        <span className="text-vl-dark-900 font-mono text-sm font-bold tracking-wider uppercase sm:text-base">
                          {coupon.code}
                        </span>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(coupon.code)}
                          className="gap-1 font-semibold uppercase"
                        >
                          {isCopied ? (
                            <>
                              <Check className="size-3 text-emerald-600" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-3 text-neutral-500" />
                              <span>Copy</span>
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Conditions & Expiry */}
                      <div className="mt-3 space-y-1 text-xs text-neutral-500">
                        <p>
                          {coupon.minOrderValue
                            ? `Valid on orders above ৳ ${coupon.minOrderValue.toLocaleString("en-BD")}`
                            : "No minimum purchase requirement"}
                        </p>
                        <p className="text-[11px] text-neutral-400">
                          {coupon.endDate
                            ? `Expires on ${formatDate(coupon.endDate)}`
                            : "Ongoing promotion • Subject to stock"}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* How to Redeem Banner */}
            <div className="border-vl-dark-900/8 bg-vl-white-100 mt-6 rounded-2xl border p-4 sm:p-5">
              <div className="text-vl-dark-900 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
                <Ticket className="text-vl-dark-900 size-3.5" />
                <span>How to Redeem at Checkout</span>
              </div>
              <ul className="mt-2.5 grid grid-cols-1 gap-2 text-xs text-neutral-600 sm:grid-cols-3">
                <li className="flex items-start gap-2">
                  <span className="text-vl-dark-900 font-semibold">1.</span>
                  <span>Copy any eligible coupon code from this page.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-vl-dark-900 font-semibold">2.</span>
                  <span>Paste the code in the &quot;Have a promo code?&quot; box at checkout.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-vl-dark-900 font-semibold">3.</span>
                  <span>Instant discount will deduct from your final payable total.</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
