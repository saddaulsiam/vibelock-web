import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Banknote, CreditCard, Layers, QrCode, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaymentGatewayBadgeProps {
  gateway?: string | null;
  paymentMethod?: string | null;
  className?: string;
  showIcon?: boolean;
}

export interface PaymentGatewayDisplayInfo {
  label: string;
  sublabel?: string;
  colorClass: string;
  icon: "CASH" | "CARD" | "QR" | "PHONE" | "SPLIT";
}

export function formatPaymentGatewayLabel(
  gateway?: string | null,
  paymentMethod?: string | null
): PaymentGatewayDisplayInfo {
  const normalized = (gateway || paymentMethod || "COD").toUpperCase().trim();

  switch (normalized) {
    case "BKASH":
      return {
        label: "bKash",
        colorClass: "border-pink-300 bg-pink-50 text-pink-700 font-bold hover:bg-pink-50",
        icon: "PHONE",
      };
    case "NAGAD":
      return {
        label: "Nagad",
        colorClass: "border-amber-400 bg-amber-50 text-amber-900 font-bold hover:bg-amber-50",
        icon: "PHONE",
      };
    case "SSLCOMMERZ":
    case "ONLINE":
      return {
        label: "SSLCOMMERZ",
        sublabel: "Cards / MFS",
        colorClass: "border-blue-300 bg-blue-50 text-blue-800 font-bold hover:bg-blue-50",
        icon: "CARD",
      };
    case "BANGLA_QR":
      return {
        label: "Bangla QR",
        colorClass: "border-teal-300 bg-teal-50 text-teal-800 font-bold hover:bg-teal-50",
        icon: "QR",
      };
    case "CARD":
      return {
        label: "Card (POS)",
        colorClass: "border-indigo-300 bg-indigo-50 text-indigo-800 font-bold hover:bg-indigo-50",
        icon: "CARD",
      };
    case "SPLIT":
      return {
        label: "Split Tender",
        colorClass: "border-cyan-300 bg-cyan-50 text-cyan-900 font-bold hover:bg-cyan-50",
        icon: "SPLIT",
      };
    case "CASH":
      return {
        label: "Cash Counter",
        colorClass:
          "border-emerald-300 bg-emerald-50 text-emerald-800 font-bold hover:bg-emerald-50",
        icon: "CASH",
      };
    case "COD":
      return {
        label: "COD",
        sublabel: "Cash on Delivery",
        colorClass:
          "border-emerald-300 bg-emerald-50 text-emerald-800 font-bold hover:bg-emerald-50",
        icon: "CASH",
      };
    default:
      return {
        label: normalized || "SSLCOMMERZ",
        sublabel: "Cards / MFS",
        colorClass: "border-slate-300 bg-slate-50 text-slate-800 font-semibold hover:bg-slate-50",
        icon: "CARD",
      };
  }
}

export function PaymentGatewayBadge({
  gateway,
  paymentMethod,
  className,
  showIcon = true,
}: PaymentGatewayBadgeProps) {
  const info = formatPaymentGatewayLabel(gateway, paymentMethod);

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 text-[10px] font-semibold transition-colors",
        info.colorClass,
        className
      )}
      title={info.sublabel ? `${info.label} (${info.sublabel})` : info.label}
    >
      {showIcon && (
        <>
          {info.icon === "CASH" && (
            <Banknote className="size-3 shrink-0 text-emerald-700" aria-hidden="true" />
          )}
          {info.icon === "CARD" && (
            <CreditCard className="size-3 shrink-0 text-blue-700" aria-hidden="true" />
          )}
          {info.icon === "PHONE" && (
            <Smartphone className="size-3 shrink-0 text-pink-700" aria-hidden="true" />
          )}
          {info.icon === "QR" && (
            <QrCode className="size-3 shrink-0 text-teal-700" aria-hidden="true" />
          )}
          {info.icon === "SPLIT" && (
            <Layers className="size-3 shrink-0 text-cyan-700" aria-hidden="true" />
          )}
        </>
      )}
      <span>{info.label}</span>
    </Badge>
  );
}
