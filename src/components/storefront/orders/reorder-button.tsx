"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { reorderItemsAction } from "@/lib/orders/actions";
import { toast } from "sonner";

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
    <button
      type="button"
      onClick={handleReorder}
      disabled={loading}
      className="inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-lg border border-[#101114]/15 bg-white px-3.5 py-1.5 text-xs font-semibold tracking-wider text-[#101114] uppercase transition-colors hover:bg-neutral-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin text-[#101114]" />
      ) : (
        <RefreshCw className="size-3.5 text-neutral-600" />
      )}
      <span>{loading ? "Adding..." : "Buy Again"}</span>
    </button>
  );
}
