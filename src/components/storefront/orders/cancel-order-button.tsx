"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cancelOrderAction } from "@/lib/orders/actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CancelOrderButtonProps {
  orderNumber: string;
  className?: string;
  variant?: "destructive" | "outline" | "secondary" | "danger";
  size?: "default" | "sm" | "lg" | "xs";
  label?: string;
}

export function CancelOrderButton({
  orderNumber,
  className,
  variant = "destructive",
  size = "sm",
  label = "Cancel Order",
}: CancelOrderButtonProps) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);

  async function handleCancel() {
    if (
      !window.confirm("Are you sure you want to cancel this order? This action cannot be undone.")
    ) {
      return;
    }

    setIsCancelling(true);
    try {
      const result = await cancelOrderAction(orderNumber);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <Button
      variant={variant}
      className={className}
      onClick={handleCancel}
      type="button"
      size={size}
      disabled={isCancelling}
    >
      {isCancelling ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Cancelling...
        </>
      ) : (
        label
      )}
    </Button>
  );
}
