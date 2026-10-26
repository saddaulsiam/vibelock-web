"use client";

import * as React from "react";
import { Printer, X, Tag, ExternalLink } from "lucide-react";

interface ThermalLabelProps {
  orderNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  shippingStreet: string;
  shippingCity: string;
  shippingState?: string | null;
  shippingZip?: string | null;
  paymentMethod: string;
  paymentStatus: string;
  total: unknown;
  itemCount: number;
  courierProvider?: string | null;
  trackingNumber?: string | null;
  providerShipmentId?: string | null;
}

function BarcodeSvg({ value, height = 36 }: { value: string; height?: number }) {
  const chars = value.split("");
  const bars: number[] = [2, 1, 1, 2];
  chars.forEach((char) => {
    const code = char.charCodeAt(0);
    bars.push((code % 3) + 1, ((code >> 1) % 2) + 1, ((code >> 2) % 3) + 1, 1);
  });
  bars.push(2, 3, 1, 1, 2);

  const totalWidth = bars.reduce((acc, b) => acc + b, 0);
  let currentX = 0;

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${height}`}
      className="mx-auto block h-10 w-full max-w-[220px]"
      aria-label={`Barcode: ${value}`}
    >
      {bars.map((barWidth, index) => {
        const isBlack = index % 2 === 0;
        const x = currentX;
        currentX += barWidth;
        if (!isBlack) return null;
        return (
          <rect
            key={index}
            x={x}
            y={0}
            width={barWidth}
            height={height}
            fill="#000000"
          />
        );
      })}
    </svg>
  );
}

export function OrderThermalLabelModal({
  order,
  isOpen,
  onClose,
}: {
  order: ThermalLabelProps;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  const isCod = order.paymentMethod === "COD";
  const numTotal = Number(order.total || 0);
  const formattedTotal = `৳${numTotal.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl print:m-0 print:p-0 print:shadow-none">
        {/* Modal Controls (Hidden when printing) */}
        <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-neutral-900 text-white">
              <Tag className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Thermal Parcel Shipping Label</h3>
              <p className="text-[11px] text-neutral-500">4&quot; × 6&quot; Courier Polybag Sticker Format</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* ── Actual Thermal Printable Label Box ── */}
        <div
          id="thermal-label-print-area"
          className="rounded-lg border-2 border-black bg-white p-4 text-black shadow-xs"
        >
          {/* Header Strip */}
          <div className="flex items-center justify-between border-b-2 border-black pb-2 text-xs">
            <div>
              <h2 className="text-base font-black tracking-tight uppercase">VibeLock Apparel</h2>
              <p className="text-[10px] text-neutral-700">Official Merchant Dispatch &middot; Dhaka, BD</p>
            </div>
            <div className="text-right">
              <span className="inline-block border border-black bg-black px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">
                {order.courierProvider || "EXPRESS"}
              </span>
              <p className="font-mono text-[10px] font-bold text-neutral-800">
                {order.trackingNumber ? `TRK: ${order.trackingNumber}` : "DOMESTIC COURIER"}
              </p>
            </div>
          </div>

          {/* Delivery Recipient Box */}
          <div className="border-b-2 border-black py-3 text-xs">
            <span className="text-[9px] font-black tracking-wider text-neutral-600 uppercase">
              DELIVER TO (RECIPIENT):
            </span>
            <p className="text-sm font-black">{order.customerName || "Customer"}</p>
            <p className="font-mono text-xs font-bold text-neutral-900">
              📞 {order.customerPhone || "No Phone"}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-neutral-800 font-medium">
              {order.shippingStreet}, {order.shippingCity}
              {order.shippingZip ? ` - ${order.shippingZip}` : ""}
            </p>
          </div>

          {/* COD Payment Collection Alert Banner */}
          <div className="border-b-2 border-black py-2.5 text-center">
            {isCod ? (
              <div className="rounded border-2 border-black bg-black p-1.5 text-white">
                <span className="block text-[10px] font-bold tracking-widest uppercase">
                  CASH ON DELIVERY (COD)
                </span>
                <span className="text-lg font-black tracking-tight">{formattedTotal}</span>
                <span className="block text-[9px] text-neutral-300">
                  Collect cash before handing parcel to recipient
                </span>
              </div>
            ) : (
              <div className="rounded border-2 border-dashed border-neutral-700 bg-neutral-100 p-1.5 text-black">
                <span className="block text-[10px] font-black tracking-widest uppercase text-emerald-800">
                  ★ PREPAID PARCEL ★
                </span>
                <span className="text-sm font-black text-neutral-900">COLLECT ৳0.00</span>
                <span className="block text-[9px] text-neutral-600">
                  Paid Online &middot; Do not collect payment
                </span>
              </div>
            )}
          </div>

          {/* Barcode Strip */}
          <div className="py-2.5 text-center">
            <BarcodeSvg
              value={order.providerShipmentId || order.orderNumber}
              height={36}
            />
            <p className="mt-1 font-mono text-xs font-black tracking-wider">
              {order.providerShipmentId
                ? `STEADFAST CID: *${order.providerShipmentId}*`
                : `*${order.orderNumber}*`}
            </p>
            <div className="mt-1 flex items-center justify-between text-[10px] text-neutral-600">
              <span>Qty: {order.itemCount} Units</span>
              {order.trackingNumber ? (
                <span className="font-mono font-bold">TRK: {order.trackingNumber}</span>
              ) : (
                <span>Handle with care</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons (Hidden when printing) */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3 print:hidden">
          {order.courierProvider === "steadfast" && order.providerShipmentId ? (
            <a
              href={`https://steadfast.com.bd/user/consignment/print-label/${order.providerShipmentId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
              title="Open official Steadfast thermal sticker in new tab"
            >
              <ExternalLink className="size-3.5" />
              <span>Steadfast Official (3x3 / 2x3)</span>
            </a>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-900"
            >
              <Printer className="size-3.5" />
              <span>Print Thermal Label</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
