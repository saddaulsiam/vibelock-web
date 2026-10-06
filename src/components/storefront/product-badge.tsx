import * as React from "react";
import { cn } from "@/lib/utils";

interface ProductBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  label: string;
  variant?: "default" | "sale" | "new";
}

export function ProductBadge({
  label,
  variant = "default",
  className,
  ...props
}: ProductBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-xs font-semibold uppercase tracking-wider",
        variant === "default" && "bg-secondary text-secondary-foreground",
        variant === "sale" && "bg-destructive text-destructive-foreground",
        variant === "new" && "bg-accent text-accent-foreground",
        className
      )}
      {...props}
    >
      {label}
    </span>
  );
}
