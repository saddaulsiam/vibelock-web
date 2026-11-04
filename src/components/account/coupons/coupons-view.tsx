"use client";

import { useState } from "react";
import Link from "next/link";
import { Ticket, Copy, Check, Sparkles, ArrowRight, ShieldCheck, Tag } from "lucide-react";
import { toast } from "sonner";

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
      <div className="overflow-hidden rounded-2xl border border-[#101114]/8 bg-white shadow-2xs">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#101114]/8 p-4 sm:p-6 md:p-7">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold tracking-[0.15em] text-[#00D9FF] uppercase sm:text-[11px] sm:tracking-[0.2em]">
                Vouchers & Rewards
              </span>
              <span className="text-neutral-300">•</span>
              <span className="text-[11px] text-neutral-500 sm:text-xs">
                Official VibeLock Vault
              </span>
            </div>
            <h1 className="mt-0.5 text-base font-bold tracking-tight text-[#101114] uppercase sm:text-2xl">
              Coupons & Vouchers
            </h1>
            <p className="mt-0.5 text-xs text-neutral-500">
              Apply valid voucher codes at checkout to unlock member discounts and credits
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
              {coupons.length} {coupons.length === 1 ? "Coupon Available" : "Coupons Available"}
            </span>
          </div>
        </div>

        {/* Content */}
        {coupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 py-16 text-center sm:p-14">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-neutral-100 text-[#101114]">
              <Sparkles className="size-6 text-neutral-400" />
            </div>
            <h2 className="mt-4 text-base font-bold text-[#101114] uppercase">
              No active coupons right now
            </h2>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-neutral-500 sm:text-sm">
              Keep an eye on seasonal drop announcements, member rewards, or private sales for
              secret vault codes.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/shop"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#101114] px-5 text-xs font-semibold tracking-wider text-white uppercase transition-colors hover:bg-neutral-800"
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
                  <div
                    key={coupon.id}
                    className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#101114]/10 bg-white p-4 shadow-2xs transition-all hover:border-[#101114]/30 hover:shadow-xs sm:p-5"
                  >
                    <div>
                      {/* Top Row: Type & Discount Badge */}
                      <div className="flex items-center justify-between gap-2">
                        {coupon.isPersonalCredit ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-amber-800 uppercase">
                            <ShieldCheck className="size-3 text-amber-600" />
                            Store Credit Voucher
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-neutral-600 uppercase">
                            <Tag className="size-3 text-neutral-500" />
                            Member Promo
                          </span>
                        )}

                        <span className="inline-flex items-center rounded-full bg-[#101114] px-2.5 py-0.5 text-xs font-bold text-white">
                          {discountDisplay}
                        </span>
                      </div>

                      {/* Code Block */}
                      <div className="mt-3.5 flex items-center justify-between gap-2 rounded-xl border border-dashed border-[#101114]/20 bg-[#FAF9F5] p-3">
                        <span className="font-mono text-sm font-bold tracking-wider text-[#101114] uppercase sm:text-base">
                          {coupon.code}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleCopy(coupon.code)}
                          className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-[#101114]/15 bg-white px-3 py-1 text-xs font-semibold tracking-wider uppercase shadow-2xs transition-colors hover:bg-[#101114] hover:text-white"
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
                        </button>
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
                  </div>
                );
              })}
            </div>

            {/* How to Redeem Banner */}
            <div className="mt-6 rounded-2xl border border-[#101114]/8 bg-[#FAF9F5] p-4 sm:p-5">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#101114] uppercase">
                <Ticket className="size-3.5 text-[#101114]" />
                <span>How to Redeem at Checkout</span>
              </div>
              <ul className="mt-2.5 grid grid-cols-1 gap-2 text-xs text-neutral-600 sm:grid-cols-3">
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-[#101114]">1.</span>
                  <span>Copy any eligible coupon code from this page.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-[#101114]">2.</span>
                  <span>Paste the code in the &quot;Have a promo code?&quot; box at checkout.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-[#101114]">3.</span>
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
