import * as React from "react";
import { cn } from "@/lib/utils";

export interface SectionHeadingProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  eyebrow?: string;
  description?: string;
  centered?: boolean;
  align?: "center" | "left" | "between";
  action?: React.ReactNode;
  /** Flip to a light-on-dark palette (for dark-background sections) */
  dark?: boolean;
}

export function SectionHeading({
  title,
  eyebrow,
  description,
  centered,
  align,
  action,
  dark = false,
  className,
  ...props
}: SectionHeadingProps) {
  // If centered is explicitly passed, map to "center", otherwise use align or default to "center"
  const resolvedAlign = align ?? (centered === false ? "left" : "center");

  if (resolvedAlign === "between" && action) {
    return (
      <div
        className={cn("mb-8 flex items-end justify-between gap-4 sm:mb-10", className)}
        {...props}
      >
        <div>
          {eyebrow && (
            <p
              className="mb-1 text-[10px] font-extrabold tracking-[0.22em] uppercase sm:text-[11px]"
              style={{ color: dark ? "#FFB800" : "#00D9FF" }}
            >
              {eyebrow}
            </p>
          )}
          <h2
            className="text-xl font-black tracking-wide uppercase sm:text-2xl md:text-3xl"
            style={{ color: dark ? "#ffffff" : "#101114" }}
          >
            {title}
          </h2>
          <div
            className="mt-2.5 h-1 w-12"
            style={{ background: dark ? "#FFB800" : "#101114" }}
            aria-hidden="true"
          />
          {description && (
            <p className="mt-2 max-w-2xl text-xs text-muted-foreground sm:text-sm">
              {description}
            </p>
          )}
        </div>
        <div className="shrink-0">{action}</div>
      </div>
    );
  }

  const isLeft = resolvedAlign === "left";

  return (
    <div
      className={cn(
        "mb-8 sm:mb-10",
        isLeft ? "text-left" : "text-center",
        className
      )}
      {...props}
    >
      {eyebrow && (
        <p
          className="mb-1 text-[10px] font-extrabold tracking-[0.22em] uppercase sm:text-[11px]"
          style={{ color: dark ? "#FFB800" : "#00D9FF" }}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className="text-xl font-black tracking-wide uppercase sm:text-2xl md:text-3xl"
        style={{ color: dark ? "#ffffff" : "#101114" }}
      >
        {title}
      </h2>
      <div
        className={cn("mt-2.5 h-1 w-12", !isLeft && "mx-auto")}
        style={{ background: dark ? "#FFB800" : "#101114" }}
        aria-hidden="true"
      />
      {description && (
        <p
          className={cn(
            "mt-3 text-xs text-muted-foreground sm:text-sm",
            !isLeft && "mx-auto max-w-2xl"
          )}
        >
          {description}
        </p>
      )}
      {action && <div className={cn("mt-4", !isLeft && "flex justify-center")}>{action}</div>}
    </div>
  );
}
