import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
}

export function Section({ className, as: Component = "section", ...props }: SectionProps) {
  return <Component className={cn("py-12 md:py-16 lg:py-24", className)} {...props} />;
}
