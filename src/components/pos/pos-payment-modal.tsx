"use client";

import { useState } from "react";
import {
  Banknote,
  QrCode,
  CreditCard,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PosPaymentMethod, PosPaymentSplitInput } from "@/lib/pos/pos-types";

interface PosPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  grandTotal: number;
  onConfirmPayment: (
    paymentMethod: PosPaymentMethod,
    amountPaid: number,
    notes?: string,
    splitPayments?: PosPaymentSplitInput[]
  ) => Promise<void>;
  isSubmitting: boolean;
}

function PosPaymentModalContent({
  onClose,
  grandTotal,
  onConfirmPayment,
  isSubmitting,
}: Omit<PosPaymentModalProps, "isOpen">) {
  const [method, setMethod] = useState<PosPaymentMethod>("CASH");
  const [tenderAmount, setTenderAmount] = useState<number>(grandTotal);
  const [referenceNotes, setReferenceNotes] = useState<string>("");

  // Split Tender State
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitCashTender, setSplitCashTender] = useState<number>(0);
  const [splitBanglaQr, setSplitBanglaQr] = useState<number>(0);
  const [splitBanglaQrRef, setSplitBanglaQrRef] = useState<string>("");
  const [splitCard, setSplitCard] = useState<number>(0);
  const [splitCardRef, setSplitCardRef] = useState<string>("");

  const changeDue = Math.max(0, tenderAmount - grandTotal);
  const isShortage = tenderAmount < grandTotal;

  // Split computations
  const splitTotalAllocated = splitCash + splitBanglaQr + splitCard;
  const splitRemaining = Math.max(0, grandTotal - splitTotalAllocated);
  const splitCashChange = Math.max(0, splitCashTender - splitCash);
  const isSplitShortage = splitTotalAllocated < grandTotal;
  const isSplitCashTenderShortage = splitCash > 0 && splitCashTender < splitCash;

  // Quick denomination suggestions for Cash
  const getDenominationPresets = () => {
    const presets = [grandTotal];
    const next50 = Math.ceil(grandTotal / 50) * 50;
    if (!presets.includes(next50)) presets.push(next50);

    const next100 = Math.ceil(grandTotal / 100) * 100;
    if (!presets.includes(next100)) presets.push(next100);

    const next500 = Math.ceil(grandTotal / 500) * 500;
    if (!presets.includes(next500)) presets.push(next500);

    const next1000 = Math.ceil(grandTotal / 1000) * 1000;
    if (!presets.includes(next1000)) presets.push(next1000);

    return presets.slice(0, 4);
  };

  const allocateRemainingTo = (target: "CASH" | "BANGLA_QR" | "CARD") => {
    if (splitRemaining <= 0) return;
    if (target === "CASH") {
      setSplitCash((prev) => prev + splitRemaining);
      setSplitCashTender((prev) => prev + splitRemaining);
    } else if (target === "BANGLA_QR") {
      setSplitBanglaQr((prev) => prev + splitRemaining);
    } else if (target === "CARD") {
      setSplitCard((prev) => prev + splitRemaining);
    }
  };

  const splitEvenlyCashBanglaQr = () => {
    const half = Math.floor(grandTotal / 2);
    setSplitCash(half);
    setSplitCashTender(half);
    setSplitBanglaQr(grandTotal - half);
    setSplitCard(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (method === "CASH" && isShortage) {
      return;
    }

    if (method === "SPLIT") {
      if (isSplitShortage || isSplitCashTenderShortage) {
        return;
      }
      const splits: PosPaymentSplitInput[] = [];
      if (splitCash > 0) {
        splits.push({
          method: "CASH",
          amount: splitCash,
          tenderAmount: splitCashTender || splitCash,
        });
      }
      if (splitBanglaQr > 0) {
        splits.push({
          method: "BANGLA_QR",
          amount: splitBanglaQr,
          reference: splitBanglaQrRef.trim() || undefined,
        });
      }
      if (splitCard > 0) {
        splits.push({
          method: "CARD",
          amount: splitCard,
          reference: splitCardRef.trim() || undefined,
        });
      }
      const totalTendered = splits.reduce((sum, s) => sum + (s.tenderAmount ?? s.amount), 0);
      await onConfirmPayment("SPLIT", totalTendered, referenceNotes, splits);
      return;
    }

    const finalAmountPaid = method === "CASH" ? tenderAmount : grandTotal;
    await onConfirmPayment(method, finalAmountPaid, referenceNotes);
  };

  const isSubmitDisabled =
    isSubmitting ||
    (method === "CASH" && isShortage) ||
    (method === "SPLIT" && (isSplitShortage || isSplitCashTenderShortage));

  return (
    <DialogContent className="max-h-[92vh] w-full overflow-y-auto rounded-2xl border border-vl-white-400 bg-white p-6 shadow-2xl sm:max-w-xl">
      <DialogHeader className="border-b border-vl-white-200 pb-3">
        <div className="flex items-center justify-between">
          <DialogTitle className="font-heading text-vl-black text-xl font-black tracking-tight">
            Counter Payment & Settlement
          </DialogTitle>
        </div>
        <DialogDescription className="text-vl-grey text-xs">
          Select customer tender method or split across multiple payments.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Total Amount Callout */}
        <div className="border-vl-border bg-vl-black text-vl-white flex items-center justify-between rounded-xl border p-4 shadow-xs">
          <div>
            <span className="font-heading text-vl-grey block text-[10px] font-black tracking-widest uppercase">
              Total Payable
            </span>
            <p className="text-vl-white/60 text-[10px]">Final counter bill</p>
          </div>
          <span className="font-heading text-vl-cyan font-mono text-3xl font-black tracking-tight">
            ৳{grandTotal.toFixed(0)}
          </span>
        </div>

        {/* Payment Method Selector */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setMethod("CASH");
              setTenderAmount(grandTotal);
            }}
            className={`flex h-auto flex-col items-center justify-center space-y-1.5 rounded-xl border p-3 transition-all duration-150 ${
              method === "CASH"
                ? "border-vl-cyan bg-vl-black text-vl-cyan font-heading border-2 font-black shadow-[0_0_15px_rgba(0,217,255,0.25)]"
                : "text-vl-black/80 hover:border-vl-cyan-300 border border-vl-white-400 bg-vl-white-100 font-medium hover:bg-white"
            }`}
          >
            <Banknote className="h-5 w-5 text-emerald-500" />
            <span className="text-xs">Cash</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setMethod("BANGLA_QR");
              setTenderAmount(grandTotal);
            }}
            className={`flex h-auto flex-col items-center justify-center space-y-1.5 rounded-xl border p-3 transition-all duration-150 ${
              method === "BANGLA_QR"
                ? "border-vl-cyan bg-vl-black text-vl-cyan font-heading border-2 font-black shadow-[0_0_15px_rgba(0,217,255,0.25)]"
                : "text-vl-black/80 hover:border-vl-cyan-300 border border-vl-white-400 bg-vl-white-100 font-medium hover:bg-white"
            }`}
          >
            <QrCode className="h-5 w-5 text-teal-600" />
            <span className="text-xs">Bangla QR</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setMethod("CARD");
              setTenderAmount(grandTotal);
            }}
            className={`flex h-auto flex-col items-center justify-center space-y-1.5 rounded-xl border p-3 transition-all duration-150 ${
              method === "CARD"
                ? "border-vl-cyan bg-vl-black text-vl-cyan font-heading border-2 font-black shadow-[0_0_15px_rgba(0,217,255,0.25)]"
                : "text-vl-black/80 hover:border-vl-cyan-300 border border-vl-white-400 bg-vl-white-100 font-medium hover:bg-white"
            }`}
          >
            <CreditCard className="h-5 w-5 text-blue-500" />
            <span className="text-xs">Card</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setMethod("SPLIT");
              if (splitCash === 0 && splitBanglaQr === 0 && splitCard === 0) {
                splitEvenlyCashBanglaQr();
              }
            }}
            className={`flex h-auto flex-col items-center justify-center space-y-1.5 rounded-xl border p-3 transition-all duration-150 ${
              method === "SPLIT"
                ? "border-vl-cyan bg-vl-black text-vl-cyan font-heading border-2 font-black shadow-[0_0_15px_rgba(0,217,255,0.25)]"
                : "text-vl-black/80 hover:border-vl-cyan-300 border border-vl-white-400 bg-vl-white-100 font-medium hover:bg-white"
            }`}
          >
            <Layers className="text-vl-cyan h-5 w-5" />
            <span className="text-xs">Split</span>
          </Button>
        </div>

        {/* Method Specific Fields */}
        {method === "CASH" && (
          <div className="space-y-3 pt-1">
            <div>
              <Label className="text-vl-grey text-xs font-bold tracking-wider uppercase">
                Cash Received (৳)
              </Label>
              <Input
                type="number"
                min={0}
                step="any"
                autoFocus
                value={tenderAmount || ""}
                onChange={(e) => setTenderAmount(Number(e.target.value) || 0)}
                className="text-vl-black focus-visible:border-vl-cyan focus-visible:ring-vl-cyan-400 mt-1 h-12 rounded-xl border border-vl-white-500 bg-vl-white-100 font-mono text-2xl font-black shadow-xs focus-visible:bg-white focus-visible:ring-4"
              />
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex items-center space-x-1.5">
              <span className="text-vl-grey text-[10px] font-bold tracking-wider uppercase">
                Presets:
              </span>
              {getDenominationPresets().map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => setTenderAmount(preset)}
                  className="text-vl-black hover:border-vl-cyan hover:bg-vl-cyan-50 h-7 border-vl-white-500 bg-white px-2.5 font-mono text-xs font-bold shadow-2xs"
                >
                  ৳{preset}
                </Button>
              ))}
            </div>

            {/* Change Return Callout */}
            <div
              className={`flex items-center justify-between rounded-xl border p-3.5 ${
                isShortage
                  ? "border-red-200 bg-red-50 text-red-900"
                  : "border-emerald-200 bg-emerald-50 text-emerald-950"
              }`}
            >
              <div className="flex items-center space-x-2">
                {isShortage ? (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                )}
                <span className="text-xs font-bold">
                  {isShortage ? "Shortage Amount:" : "Change to Return:"}
                </span>
              </div>
              <span className="font-mono text-2xl font-black">
                ৳{isShortage ? (grandTotal - tenderAmount).toFixed(0) : changeDue.toFixed(0)}
              </span>
            </div>
          </div>
        )}

        {method === "BANGLA_QR" && (
          <div className="space-y-3 pt-1">
            <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-xs text-teal-900">
              <p className="font-semibold">Counter Merchant Payment</p>
              <p className="mt-0.5 text-[11px]">
                Ask customer to scan counter Bangla QR using any bank or MFS app (bKash, Nagad,
                Rocket, Upay, etc.).
              </p>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Bangla QR / TrxID (Optional)
              </Label>
              <Input
                type="text"
                placeholder="e.g. BL9A8X21"
                value={referenceNotes}
                onChange={(e) => setReferenceNotes(e.target.value)}
                className="mt-1 h-9 border-slate-300 font-mono text-xs uppercase"
              />
            </div>
          </div>
        )}

        {method === "CARD" && (
          <div className="space-y-3 pt-1">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
              <p className="font-semibold">POS Terminal Swipe / Tap</p>
              <p className="mt-0.5 text-[11px]">
                Swipe customer Visa/Mastercard/Amex on counter POS machine.
              </p>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Auth / Approval Code (Optional)
              </Label>
              <Input
                type="text"
                placeholder="e.g. 549120"
                value={referenceNotes}
                onChange={(e) => setReferenceNotes(e.target.value)}
                className="mt-1 h-9 border-slate-300 font-mono text-xs uppercase"
              />
            </div>
          </div>
        )}

        {/* Split Tender Allocation Mode */}
        {method === "SPLIT" && (
          <div className="space-y-3 pt-1">
            {/* Split Allocation Status Header */}
            <div
              className={`flex items-center justify-between rounded-lg border p-2.5 text-xs ${
                isSplitShortage
                  ? "border-amber-300 bg-amber-50 text-amber-950"
                  : "border-emerald-300 bg-emerald-50 text-emerald-950"
              }`}
            >
              <div className="flex items-center space-x-2">
                {isSplitShortage ? (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                )}
                <span className="font-semibold">
                  {isSplitShortage
                    ? `Remaining to allocate: ৳${splitRemaining}`
                    : "Total Allocated in Full ✓"}
                </span>
              </div>
              <span className="font-mono font-bold">
                Allocated: ৳{splitTotalAllocated} / ৳{grandTotal}
              </span>
            </div>

            {/* Quick Fill Helpers */}
            {splitRemaining > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">
                  Fill Remainder:
                </span>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => allocateRemainingTo("CASH")}
                  className="h-6 border-emerald-300 bg-emerald-50 px-2 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  + Cash (৳{splitRemaining})
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => allocateRemainingTo("BANGLA_QR")}
                  className="h-6 border-teal-300 bg-teal-50 px-2 text-[11px] font-medium text-teal-700 hover:bg-teal-100"
                >
                  + Bangla QR (৳{splitRemaining})
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => allocateRemainingTo("CARD")}
                  className="h-6 border-blue-300 bg-blue-50 px-2 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                >
                  + Card (৳{splitRemaining})
                </Button>
              </div>
            )}

            {/* Split Row 1: Cash */}
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center text-xs font-semibold text-slate-800">
                  <Banknote className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Cash Portion
                </span>
                {splitCashChange > 0 && (
                  <span className="font-mono text-[11px] font-bold text-emerald-700">
                    Change: ৳{splitCashChange.toFixed(0)}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] font-medium text-slate-500 uppercase">
                    Portion (৳)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={splitCash || ""}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setSplitCash(val);
                      if (splitCashTender < val) setSplitCashTender(val);
                    }}
                    placeholder="0"
                    className="h-8 bg-white font-mono text-xs font-bold"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-medium text-slate-500 uppercase">
                    Tendered (৳)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={splitCashTender || ""}
                    onChange={(e) => setSplitCashTender(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="h-8 bg-white font-mono text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Split Row 2: Bangla QR */}
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
              <span className="flex items-center text-xs font-semibold text-slate-800">
                <QrCode className="mr-1.5 h-3.5 w-3.5 text-teal-600" /> Bangla QR Portion
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] font-medium text-slate-500 uppercase">
                    Portion (৳)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={splitBanglaQr || ""}
                    onChange={(e) => setSplitBanglaQr(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="h-8 bg-white font-mono text-xs font-bold"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-medium text-slate-500 uppercase">
                    TrxID (Optional)
                  </Label>
                  <Input
                    type="text"
                    value={splitBanglaQrRef}
                    onChange={(e) => setSplitBanglaQrRef(e.target.value)}
                    placeholder="e.g. BL9A8..."
                    className="h-8 bg-white font-mono text-xs uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Split Row 3: Card */}
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
              <span className="flex items-center text-xs font-semibold text-slate-800">
                <CreditCard className="mr-1.5 h-3.5 w-3.5 text-blue-600" /> Card Portion
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] font-medium text-slate-500 uppercase">
                    Portion (৳)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={splitCard || ""}
                    onChange={(e) => setSplitCard(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="h-8 bg-white font-mono text-xs font-bold"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-medium text-slate-500 uppercase">
                    Auth / Ref (Optional)
                  </Label>
                  <Input
                    type="text"
                    value={splitCardRef}
                    onChange={(e) => setSplitCardRef(e.target.value)}
                    placeholder="e.g. 5491..."
                    className="h-8 bg-white font-mono text-xs uppercase"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 border-t border-vl-white-200 pt-3">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onClose}
            className="text-vl-black h-12 w-1/3 rounded-xl border border-vl-white-500 text-xs font-bold hover:bg-vl-white-100"
          >
            Cancel [Esc]
          </Button>

          <Button
            type="submit"
            disabled={isSubmitDisabled}
            className="bg-vl-cyan text-vl-black font-heading flex h-12 w-2/3 items-center justify-center space-x-2 rounded-xl text-xs font-black tracking-wider shadow-[0_0_24px_rgba(0,217,255,0.35)] transition-all hover:bg-vl-cyan-400 hover:shadow-[0_0_32px_rgba(0,217,255,0.5)] active:scale-[0.99] disabled:opacity-50 disabled:shadow-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="text-vl-black h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Complete Sale &amp; Print</span>
            )}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

export function PosPaymentModal(props: PosPaymentModalProps) {
  return (
    <Dialog
      open={props.isOpen}
      onOpenChange={(open) => !open && !props.isSubmitting && props.onClose()}
    >
      {props.isOpen && (
        <PosPaymentModalContent
          key={`${props.isOpen}-${props.grandTotal}`}
          onClose={props.onClose}
          grandTotal={props.grandTotal}
          onConfirmPayment={props.onConfirmPayment}
          isSubmitting={props.isSubmitting}
        />
      )}
    </Dialog>
  );
}
