"use client";

import { useEffect, useRef } from "react";
import { trackMetaPixelEvent } from "@/lib/analytics/meta-pixel";

interface MetaViewContentProps {
  productId: string;
  productName: string;
  price: number;
  categoryName?: string;
}

export function MetaViewContent({
  productId,
  productName,
  price,
  categoryName,
}: MetaViewContentProps) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;

    trackMetaPixelEvent(
      "ViewContent",
      {
        content_ids: [productId],
        content_name: productName,
        content_type: "product",
        value: price,
        currency: "BDT",
        content_category: categoryName,
      },
      {
        eventID: `view_${productId}`,
      }
    );
  }, [productId, productName, price, categoryName]);

  return null;
}
