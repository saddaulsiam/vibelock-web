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
        "inline-flex items-center rounded-[2px] px-2 py-0.5 text-[10px] leading-tight font-bold tracking-wider uppercase shadow-xs select-none",
        variant === "default" && "bg-[#101114] text-white",
        variant === "sale" && "bg-[#E50010] text-white",
        variant === "new" && "bg-[#E50010] text-white",
        className
      )}
      {...props}
    >
      {label}
    </span>
  );
}
