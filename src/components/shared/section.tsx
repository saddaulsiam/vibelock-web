import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
}

export function Section({ className, as: Component = "section", ...props }: SectionProps) {
  const hasCustomPadding = className && /\b(py-|pt-)/.test(className);
  return <Component className={cn(!hasCustomPadding && "py-6 sm:py-8 lg:py-12", className)} {...props} />;
}
