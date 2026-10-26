"use client";

import * as React from "react";
import { Check, CheckCircle2, PackageCheck, ShoppingBag } from "lucide-react";

interface OrderItemData {
  id: string;
  productName: string;
  size?: string | null;
  color?: string | null;
  sku: string;
  quantity: number;
  unitPrice: unknown;
  lineTotal: unknown;
}

function formatBdt(value: unknown): string {
  const num = typeof value === "number" ? value : Number(value || 0);
  const [integerPart, fractionPart] = (Number.isFinite(num) ? num : 0).toFixed(2).split(".");
  const sign = integerPart.startsWith("-") ? "-" : "";
  const unsignedInteger = sign ? integerPart.slice(1) : integerPart;
  const groupedInteger = unsignedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `৳${sign}${groupedInteger}.${fractionPart ?? "00"}`;
}

const emptySubscribe = () => () => {};

export function OrderPickPackChecklist({
  orderId,
  items,
}: {
  orderId: string;
  items: OrderItemData[];
}) {
  const isMounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [packedIds, setPackedIds] = React.useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(`vibelock-pack-${orderId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleItemPacked = (id: string) => {
    setPackedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      try {
        localStorage.setItem(`vibelock-pack-${orderId}`, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const markAllPacked = () => {
    const all = items.map((i) => i.id);
    setPackedIds(all);
    try {
      localStorage.setItem(`vibelock-pack-${orderId}`, JSON.stringify(all));
    } catch {
      // ignore
    }
  };

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const packedCount = isMounted ? items.filter((i) => packedIds.includes(i.id)).length : 0;
  const isAllPacked = items.length > 0 && packedCount === items.length;
  const progressPercent = Math.round((packedCount / items.length) * 100);

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200/90 bg-white shadow-2xs">
      {/* Header with Packing Progress */}
      <div className="flex flex-col gap-3 border-b border-neutral-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-neutral-900">Order Items &amp; Pick-Pack Audit</h2>
            <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
              <ShoppingBag className="size-3 text-neutral-500" />
              <span>{items.length} lines &middot; {totalQuantity} units</span>
            </span>
          </div>
          <p className="mt-0.5 text-xs text-neutral-500">
            Tick items as they are picked and packed in the parcel bag
          </p>
        </div>

        {/* Progress & Quick Action */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 overflow-hidden rounded-full bg-neutral-100">
              <div
                className={`h-full transition-all duration-300 ${
                  isAllPacked ? "bg-emerald-500" : "bg-neutral-900"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-neutral-800">
              {packedCount}/{items.length} packed
            </span>
          </div>

          {!isAllPacked ? (
            <button
              type="button"
              onClick={markAllPacked}
              className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50"
            >
              Pack All
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="size-3 text-emerald-600" />
              <span>Ready for Bag</span>
            </span>
          )}
        </div>
      </div>

      {/* Completion Banner */}
      {isAllPacked ? (
        <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50/80 px-5 py-2.5 text-xs font-semibold text-emerald-900">
          <PackageCheck className="size-4 text-emerald-700" />
          <span>Pick &amp; Pack Verified: All items physically confirmed for this parcel.</span>
        </div>
      ) : null}

      {/* Items Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-neutral-100 bg-neutral-50/70 text-[11px] font-semibold tracking-wider text-neutral-600 uppercase">
            <tr>
              <th className="px-4 py-3 text-center print:hidden">Check</th>
              <th className="px-5 py-3">Product Name &amp; Variant</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3 text-center">Qty</th>
              <th className="px-4 py-3 text-right">Unit Price</th>
              <th className="px-5 py-3 text-right">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {items.map((item) => {
              const isPacked = isMounted && packedIds.includes(item.id);

              return (
                <tr
                  key={item.id}
                  className={`transition-colors ${
                    isPacked ? "bg-emerald-50/30" : "hover:bg-neutral-50/50"
                  }`}
                >
                  {/* Pick & Pack Toggle Button (Hidden in print) */}
                  <td className="px-4 py-3.5 text-center print:hidden">
                    <button
                      type="button"
                      onClick={() => toggleItemPacked(item.id)}
                      className={`inline-flex size-6 items-center justify-center rounded-md border transition-all ${
                        isPacked
                          ? "border-emerald-600 bg-emerald-600 text-white shadow-2xs"
                          : "border-neutral-300 bg-white text-transparent hover:border-neutral-500"
                      }`}
                      title={isPacked ? "Mark unpacked" : "Mark packed"}
                    >
                      <Check className="size-3.5 stroke-[3]" />
                    </button>
                  </td>

                  {/* Product Details */}
                  <td className="px-5 py-3.5">
                    <div
                      className={`font-semibold ${
                        isPacked ? "text-neutral-900" : "text-neutral-900"
                      }`}
                    >
                      {item.productName}
                    </div>
                    {item.size || item.color ? (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {item.size ? (
                          <span className="inline-flex items-center rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-700">
                            Size: {item.size}
                          </span>
                        ) : null}
                        {item.color ? (
                          <span className="inline-flex items-center rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-700">
                            Color: {item.color}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </td>

                  <td className="px-4 py-3.5 font-mono text-[11px] text-neutral-600">
                    {item.sku}
                  </td>

                  <td className="px-4 py-3.5 text-center font-bold text-neutral-900">
                    {item.quantity}
                  </td>

                  <td className="px-4 py-3.5 text-right font-medium text-neutral-700">
                    {formatBdt(item.unitPrice)}
                  </td>

                  <td className="px-5 py-3.5 text-right font-bold text-neutral-900">
                    {formatBdt(item.lineTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
