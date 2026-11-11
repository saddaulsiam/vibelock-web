import * as React from "react";
import { Badge } from "@/components/ui/badge";

interface ProductBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  label: string;
  variant?: "default" | "sale" | "new" | "featured";
}

export function ProductBadge({
  label,
  variant = "default",
  className,
  ...props
}: ProductBadgeProps) {
  const badgeVariant =
    variant === "sale"
      ? "sale"
      : variant === "new"
      ? "new"
      : variant === "featured"
      ? "featured"
      : "brand";

  return (
    <Badge
      variant={badgeVariant}
      size="sm"
      className={className}
      {...props}
    >
      {label}
    </Badge>
  );
}
