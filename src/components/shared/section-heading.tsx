import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionHeadingActionConfig {
  href: string;
  label?: string;
}

export type SectionHeadingAction = React.ReactNode | SectionHeadingActionConfig;

export interface SectionHeadingProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  eyebrow?: string;
  description?: string;
  centered?: boolean;
  align?: "center" | "left" | "between";
  action?: SectionHeadingAction;
  actionHref?: string;
  actionLabel?: string;
  /** Display a horizontal divider line beneath the heading block (as shown in the design) */
  divider?: boolean;
}

export function SectionHeading({
  title,
  eyebrow,
  description,
  centered,
  align,
  action,
  actionHref,
  actionLabel,
  divider = true,
  className,
  ...props
}: SectionHeadingProps) {
  // If centered is explicitly passed, map to "center", otherwise use align or default to "center"
  const resolvedAlign = align ?? (centered === false ? "left" : "center");

  // Resolve action: support object `{ href, label }`, url string `"/products"`, explicit props `actionHref`/`actionLabel`, or custom ReactNode
  let resolvedHref: string | undefined = actionHref;
  let resolvedLabel: string = actionLabel ?? "VIEW ALL";
  let customActionNode: React.ReactNode = null;

  if (action) {
    if (typeof action === "string") {
      resolvedHref = action;
    } else if (typeof action === "object" && "href" in action && !React.isValidElement(action)) {
      const config = action as SectionHeadingActionConfig;
      resolvedHref = config.href;
      if (config.label) resolvedLabel = config.label;
    } else {
      customActionNode = action as React.ReactNode;
    }
  }

  const renderedAction = customActionNode ? (
    customActionNode
  ) : resolvedHref ? (
    <Link
      href={resolvedHref}
      className="group inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#101114] uppercase transition-colors hover:text-[#00D9FF] sm:text-sm"
    >
      <span>{resolvedLabel}</span>
      <ArrowRight
        className="size-3.5 text-[#00D9FF] transition-transform duration-200 group-hover:translate-x-1"
        aria-hidden="true"
      />
    </Link>
  ) : null;

  if (resolvedAlign === "between" && renderedAction) {
    return (
      <div className={cn("mb-8 sm:mb-10", className)} {...props}>
        <div className="flex items-end justify-between gap-4">
          <div>
            {eyebrow && (
              <p
                className="mb-1.5 text-[10px] font-extrabold tracking-[0.24em] uppercase sm:mb-2 sm:text-[11px]"
                style={{ color: "#00D9FF" }}
              >
                {eyebrow}
              </p>
            )}
            <h2 className="font-heading text-2xl font-black tracking-tight text-[#101114] uppercase sm:text-3xl md:text-4xl">
              {title}
            </h2>
            {description && (
              <p className="text-muted-foreground mt-2 max-w-2xl text-xs sm:text-sm">
                {description}
              </p>
            )}
          </div>
          <div className="shrink-0">{renderedAction}</div>
        </div>

        {divider && <div className="mt-6 border-b border-black/8 sm:mt-7" aria-hidden="true" />}
      </div>
    );
  }

  const isLeft = resolvedAlign === "left";

  return (
    <div
      className={cn("mb-8 sm:mb-10", isLeft ? "text-left" : "text-center", className)}
      {...props}
    >
      {eyebrow && (
        <p
          className="mb-1.5 text-[10px] font-extrabold tracking-[0.24em] uppercase sm:mb-2 sm:text-[11px]"
          style={{ color: "#00D9FF" }}
        >
          {eyebrow}
        </p>
      )}

      <h2 className="font-heading text-2xl leading-[1.08] font-black tracking-tight text-[#101114] uppercase sm:text-3xl md:text-4xl lg:text-[2.65rem]">
        {title}
      </h2>

      {description && (
        <p
          className={cn(
            "text-muted-foreground mt-2.5 text-xs sm:text-sm",
            !isLeft && "mx-auto max-w-2xl"
          )}
        >
          {description}
        </p>
      )}

      {renderedAction && (
        <div className={cn("mt-2.5 sm:mt-3", !isLeft && "flex items-center justify-center")}>
          {renderedAction}
        </div>
      )}

      {divider && <div className="mt-6 border-b border-black/8 sm:mt-8" aria-hidden="true" />}
    </div>
  );
}
