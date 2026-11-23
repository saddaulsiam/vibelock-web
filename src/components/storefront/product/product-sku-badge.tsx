"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

interface ProductSkuBadgeProps {
  initialSku?: string | null;
}

export function ProductSkuBadge({ initialSku }: ProductSkuBadgeProps) {
  const [sku, setSku] = useState(initialSku ?? "");
  const [copiedSku, setCopiedSku] = useState(false);

  useEffect(() => {
    const handleSkuSelected = (e: Event) => {
      const customEvent = e as CustomEvent<{ sku?: string }>;
      if (customEvent.detail?.sku) {
        setSku(customEvent.detail.sku);
      }
    };

    window.addEventListener("vl:sku-selected", handleSkuSelected);
    return () => window.removeEventListener("vl:sku-selected", handleSkuSelected);
  }, []);

  if (!sku) return null;

  const handleCopySku = async () => {
    if (!sku) return;
    try {
      await navigator.clipboard.writeText(sku);
      setCopiedSku(true);
      setTimeout(() => setCopiedSku(false), 2000);
    } catch {
      // Gracefully ignore clipboard failures
    }
  };

  return (
    <div className="flex items-center gap-1 font-mono text-[10px] text-vl-dark-900/60 sm:text-[11px]">
      <span className="text-[9px] tracking-wider text-vl-dark-900/40 uppercase sm:text-[10px]">
        SKU:
      </span>
      <span className="font-semibold text-vl-dark-900">{sku}</span>
      <button
        type="button"
        onClick={handleCopySku}
        className="text-vl-dark-900/40 hover:text-vl-dark-900 rounded p-0.5 transition-colors focus-visible:outline-none"
        title="Copy SKU for customer support or order inquiry"
        aria-label="Copy SKU"
      >
        {copiedSku ? (
          <Check className="size-3 text-emerald-600" />
        ) : (
          <Copy className="size-3" />
        )}
      </button>
      {copiedSku && (
        <span className="font-sans text-[10px] font-bold text-emerald-600">Copied!</span>
      )}
    </div>
  );
}
