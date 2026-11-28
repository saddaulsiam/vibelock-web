"use client";

import { trackMetaPixelEvent } from "@/lib/analytics/meta-pixel";
import { useEffect, useRef } from "react";

interface MetaInitiateCheckoutProps {
  cartId: string;
  totalQuantity: number;
  subtotal: number;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    name?: string;
  }>;
}

export function MetaInitiateCheckout({
  cartId,
  totalQuantity,
  subtotal,
  items,
}: MetaInitiateCheckoutProps) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;

    const contents = items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      item_price: item.price,
      title: item.name,
    }));

    trackMetaPixelEvent(
      "InitiateCheckout",
      {
        content_ids: items.map((item) => item.id),
        contents,
        num_items: totalQuantity,
        value: subtotal,
        currency: "BDT",
      },
      {
        eventID: `checkout_${cartId}`,
      }
    );
  }, [cartId, totalQuantity, subtotal, items]);

  return null;
}
