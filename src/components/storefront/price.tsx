import * as React from "react";
import { cn } from "@/lib/utils";

interface PriceProps extends React.HTMLAttributes<HTMLDivElement> {
  amount: number;
  originalAmount?: number;
  currencyCode?: string;
}

export function Price({
  amount,
  originalAmount,
  currencyCode = "BDT",
  className,
  ...props
}: PriceProps) {
  // Simple formatter for demonstration
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className={cn("flex flex-wrap items-baseline gap-2", className)} {...props}>
      <span className="font-bold tracking-tight">{formatPrice(amount)}</span>
      {originalAmount && originalAmount > amount && (
        <span className="text-sm text-muted-foreground line-through">
          {formatPrice(originalAmount)}
        </span>
      )}
    </div>
  );
}
