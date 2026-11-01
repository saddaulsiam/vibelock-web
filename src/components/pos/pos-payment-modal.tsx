"use client";

import { useState } from "react";
import {
  Banknote,
  QrCode,
  CreditCard,
  Loader2,
  CheckCircle2,
  AlertTriangle,
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
import type { PosPaymentMethod } from "@/lib/pos/pos-types";

interface PosPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  grandTotal: number;
  onConfirmPayment: (paymentMethod: PosPaymentMethod, amountPaid: number, notes?: string) => Promise<void>;
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

  const changeDue = Math.max(0, tenderAmount - grandTotal);
  const isShortage = tenderAmount < grandTotal;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (method === "CASH" && isShortage) {
      return;
    }

    const finalAmountPaid = method === "CASH" ? tenderAmount : grandTotal;
    await onConfirmPayment(method, finalAmountPaid, referenceNotes);
  };

  return (
    <DialogContent className="max-w-md bg-white p-6 shadow-2xl rounded-xl border border-slate-200">
      <DialogHeader className="pb-2 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <DialogTitle className="text-lg font-bold text-slate-900">
            Counter Payment & Settlement
          </DialogTitle>
        </div>
        <DialogDescription className="text-xs text-slate-500">
          Select customer tender method and confirm transaction to print thermal receipt.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Total Amount Callout */}
        <div className="bg-slate-900 text-white rounded-lg p-3 flex items-center justify-between shadow-inner">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Payable:
          </span>
          <span className="text-2xl font-bold font-mono text-amber-400">
            ৳{grandTotal.toFixed(0)}
          </span>
        </div>

        {/* Payment Method Selector */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              setMethod("CASH");
              setTenderAmount(grandTotal);
            }}
            className={`p-2.5 rounded-lg border flex flex-col items-center justify-center space-y-1 transition-all ${
              method === "CASH"
                ? "border-amber-500 bg-amber-50/70 text-slate-950 font-bold shadow-sm"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Banknote className="h-5 w-5 text-emerald-600" />
            <span className="text-xs">Cash</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMethod("BKASH");
              setTenderAmount(grandTotal);
            }}
            className={`p-2.5 rounded-lg border flex flex-col items-center justify-center space-y-1 transition-all ${
              method === "BKASH"
                ? "border-amber-500 bg-amber-50/70 text-slate-950 font-bold shadow-sm"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <QrCode className="h-5 w-5 text-pink-600" />
            <span className="text-xs">bKash QR</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMethod("CARD");
              setTenderAmount(grandTotal);
            }}
            className={`p-2.5 rounded-lg border flex flex-col items-center justify-center space-y-1 transition-all ${
              method === "CARD"
                ? "border-amber-500 bg-amber-50/70 text-slate-950 font-bold shadow-sm"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <CreditCard className="h-5 w-5 text-blue-600" />
            <span className="text-xs">Debit/Card</span>
          </button>
        </div>

        {/* Method Specific Fields */}
        {method === "CASH" && (
          <div className="space-y-3 pt-1">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Cash Received (৳)</Label>
              <Input
                type="number"
                min={0}
                step="any"
                autoFocus
                value={tenderAmount || ""}
                onChange={(e) => setTenderAmount(Number(e.target.value) || 0)}
                className="text-lg font-mono font-bold h-11 border-2 border-slate-300 focus-visible:border-amber-500 mt-1"
              />
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Presets:</span>
              {getDenominationPresets().map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTenderAmount(preset)}
                  className="text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono font-semibold transition-colors"
                >
                  ৳{preset}
                </button>
              ))}
            </div>

            {/* Change Return Callout */}
            <div
              className={`p-3 rounded-lg border flex items-center justify-between ${
                isShortage
                  ? "bg-red-50 border-red-200 text-red-900"
                  : "bg-emerald-50 border-emerald-200 text-emerald-950"
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
              <span className="text-lg font-bold font-mono">
                ৳{isShortage ? (grandTotal - tenderAmount).toFixed(0) : changeDue.toFixed(0)}
              </span>
            </div>
          </div>
        )}

        {method === "BKASH" && (
          <div className="space-y-3 pt-1">
            <div className="bg-pink-50 border border-pink-200 p-3 rounded-lg text-xs text-pink-900">
              <p className="font-semibold">Counter Merchant Payment</p>
              <p className="text-[11px] mt-0.5">
                Ask customer to scan counter bKash QR code or make payment to merchant account.
              </p>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                bKash TrxID (Optional)
              </Label>
              <Input
                type="text"
                placeholder="e.g. BL9A8X21"
                value={referenceNotes}
                onChange={(e) => setReferenceNotes(e.target.value)}
                className="font-mono text-xs uppercase h-9 border-slate-300 mt-1"
              />
            </div>
          </div>
        )}

        {method === "CARD" && (
          <div className="space-y-3 pt-1">
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-xs text-blue-900">
              <p className="font-semibold">POS Terminal Swipe / Tap</p>
              <p className="text-[11px] mt-0.5">
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
                className="font-mono text-xs uppercase h-9 border-slate-300 mt-1"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onClose}
            className="w-1/3 h-11 text-xs text-slate-700"
          >
            Cancel [Esc]
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting || (method === "CASH" && isShortage)}
            className="w-2/3 h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs tracking-wide rounded-lg flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Complete Sale & Print</span>
            )}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

export function PosPaymentModal(props: PosPaymentModalProps) {
  return (
    <Dialog open={props.isOpen} onOpenChange={(open) => !open && !props.isSubmitting && props.onClose()}>
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
