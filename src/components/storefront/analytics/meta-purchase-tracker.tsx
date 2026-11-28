"use client";

import { trackCapiPurchaseAction } from "@/lib/analytics/actions";
import { trackMetaPixelEvent } from "@/lib/analytics/meta-pixel";
import { useEffect, useRef } from "react";

interface MetaPurchaseTrackerProps {
  orderNumber: string;
  total: number;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    name?: string;
  }>;
}

export function MetaPurchaseTracker({ orderNumber, total, items }: MetaPurchaseTrackerProps) {
  const hasExecuted = useRef(false);

  useEffect(() => {
    if (hasExecuted.current) return;
    hasExecuted.current = true;

    // Prevent duplicate firing on page reloads/navigation using sessionStorage
    const storageKey = `vibelock_meta_purchase_${orderNumber}`;
    if (typeof window !== "undefined") {
      const alreadyTracked = window.sessionStorage.getItem(storageKey);
      if (alreadyTracked) {
        return;
      }
      window.sessionStorage.setItem(storageKey, "1");
    }

    const contents = items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      item_price: item.price,
      title: item.name,
    }));

    // 1. Client-side Meta Pixel Purchase event with eventID for deduplication
    trackMetaPixelEvent(
      "Purchase",
      {
        content_ids: items.map((item) => item.id),
        contents,
        num_items: items.reduce((sum, item) => sum + item.quantity, 0),
        value: total,
        currency: "BDT",
        order_id: orderNumber,
      },
      {
        eventID: orderNumber, // Matches server CAPI event_id exactly
      }
    );

    // 2. Server-side Meta CAPI Purchase event (fire-and-forget)
    trackCapiPurchaseAction(orderNumber).catch((err) => {
      console.warn("[Meta CAPI Purchase Trigger Error]:", err);
    });
  }, [orderNumber, total, items]);

  return null;
}
