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
        "inline-flex items-center rounded-xs px-2 py-0.5 text-[10px] font-black tracking-widest uppercase",
        variant === "default" && "bg-vl-black text-vl-white",
        variant === "sale" && "bg-destructive text-white",
        variant === "new" && "bg-vl-cyan text-vl-black shadow-[0_0_12px_rgba(0,217,255,0.4)]",
        className
      )}
      {...props}
    >
      {label}
    </span>
  );
}
