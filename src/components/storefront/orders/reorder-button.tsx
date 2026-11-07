"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { reorderItemsAction } from "@/lib/orders/actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ReorderButtonProps {
  orderNumber: string;
}

export function ReorderButton({ orderNumber }: ReorderButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleReorder = async () => {
    setLoading(true);
    try {
      const res = await reorderItemsAction(orderNumber);
      if (res.success && res.addedCount && res.addedCount > 0) {
        toast.success(`Added ${res.addedCount} items to your cart!`);
        router.push("/cart");
      } else if (res.success) {
        toast.info("Items from this order are currently out of stock.");
      } else {
        toast.error(res.error || "Could not reorder items.");
      }
    } catch {
      toast.error("An error occurred while reordering.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleReorder}
      disabled={loading}
      loading={loading}
    >
      {!loading && <RefreshCw className="size-3.5 text-neutral-600" />}
      <span>{loading ? "Adding..." : "Buy Again"}</span>
    </Button>
  );
}
