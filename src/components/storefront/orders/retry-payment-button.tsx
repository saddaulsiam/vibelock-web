"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { retryOrderPaymentAction } from "@/lib/orders/actions";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";

interface RetryPaymentButtonProps {
  orderNumber: string;
  gateway?: string;
  className?: string;
  variant?: "primary" | "brand" | "outline" | "secondary";
  size?: "default" | "sm" | "lg" | "xs";
  label?: string;
}

export function RetryPaymentButton({
  orderNumber,
  gateway,
  className,
  variant = "brand",
  size = "sm",
  label = "Try Again",
}: RetryPaymentButtonProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  async function handleRetry() {
    setIsRetrying(true);
    try {
      const result = await retryOrderPaymentAction(orderNumber, gateway);
      if (result.success && result.redirectUrl) {
        toast.info("Connecting to payment gateway...");
        window.location.href = result.redirectUrl;
      } else {
        toast.error(result.error || "Failed to retry payment.");
        setIsRetrying(false);
      }
    } catch {
      toast.error("An unexpected network error occurred.");
      setIsRetrying(false);
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleRetry}
      disabled={isRetrying}
      type="button"
    >
      {isRetrying ? (
        <>
          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          <span>Connecting...</span>
        </>
      ) : (
        <>
          <RefreshCw className="mr-1.5 size-3.5" />
          <span>{label}</span>
        </>
      )}
    </Button>
  );
}
