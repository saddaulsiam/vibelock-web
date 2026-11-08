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
  /**
   * Heading scale preset:
   * - "default": Primary high-impact storefront section heading (h2 2xl..4xl font-black uppercase)
   * - "compact": Compact admin/account/card section heading (h2 lg..2xl font-bold uppercase)
   */
  variant?: "default" | "compact";
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
  variant = "default",
  className,
  ...props
}: SectionHeadingProps) {
  const isCompact = variant === "compact";

  // If centered is explicitly passed, map to "center", otherwise use align or default to "center"
  const resolvedAlign = align ?? (centered === false ? "left" : "center");

  // Resolve action: support object `{ href, label }`, url string `"/product"`, explicit props `actionHref`/`actionLabel`, or custom ReactNode
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
      className={cn(
        "group text-vl-black hover:text-vl-cyan inline-flex items-center gap-1.5 font-bold tracking-wider uppercase transition-colors",
        isCompact ? "text-xs" : "text-xs sm:text-sm"
      )}
    >
      <span>{resolvedLabel}</span>
      <ArrowRight
        className="text-vl-cyan size-3.5 transition-transform duration-200 group-hover:translate-x-1"
        aria-hidden="true"
      />
    </Link>
  ) : null;

  if (resolvedAlign === "between" && renderedAction) {
    return (
      <div className={cn(isCompact ? "mb-4 sm:mb-6" : "mb-8 sm:mb-10", className)} {...props}>
        <div className="flex items-end justify-between gap-4">
          <div>
            {eyebrow && (
              <p
                className={cn(
                  "text-vl-cyan font-extrabold uppercase",
                  isCompact
                    ? "text-2xs tracking-streetwear mb-1"
                    : "text-2xs sm:text-compact mb-1.5 tracking-[0.24em] sm:mb-2"
                )}
              >
                {eyebrow}
              </p>
            )}
            <h2
              className={cn(
                "font-heading text-vl-black tracking-tight uppercase",
                isCompact
                  ? "text-lg font-bold sm:text-xl md:text-2xl"
                  : "text-2xl font-black sm:text-3xl md:text-4xl"
              )}
            >
              {title}
            </h2>
            {description && (
              <p
                className={cn(
                  "text-muted-foreground",
                  isCompact ? "mt-1 text-xs" : "mt-2 max-w-2xl text-xs sm:text-sm"
                )}
              >
                {description}
              </p>
            )}
          </div>
          <div className="shrink-0">{renderedAction}</div>
        </div>

        {divider && (
          <div
            className={cn(
              "border-vl-black/8 border-b",
              isCompact ? "mt-4 sm:mt-5" : "mt-6 sm:mt-7"
            )}
            aria-hidden="true"
          />
        )}
      </div>
    );
  }

  const isLeft = resolvedAlign === "left";

  return (
    <div
      className={cn(
        isCompact ? "mb-4 sm:mb-6" : "mb-8 sm:mb-10",
        isLeft ? "text-left" : "text-center",
        className
      )}
      {...props}
    >
      {eyebrow && (
        <p
          className={cn(
            "text-vl-cyan font-extrabold uppercase",
            isCompact
              ? "text-2xs tracking-streetwear mb-1"
              : "text-2xs sm:text-compact mb-1.5 tracking-[0.24em] sm:mb-2"
          )}
        >
          {eyebrow}
        </p>
      )}

      <h2
        className={cn(
          "font-heading text-vl-black tracking-tight uppercase",
          isCompact
            ? "text-lg font-bold sm:text-xl md:text-2xl"
            : "text-2xl leading-[1.08] font-black sm:text-3xl md:text-4xl lg:text-[2.65rem]"
        )}
      >
        {title}
      </h2>

      {description && (
        <p
          className={cn(
            "text-muted-foreground",
            isCompact ? "mt-1 text-xs" : "mt-2.5 text-xs sm:text-sm",
            !isLeft && "mx-auto max-w-2xl"
          )}
        >
          {description}
        </p>
      )}

      {renderedAction && (
        <div
          className={cn(
            isCompact ? "mt-2" : "mt-2.5 sm:mt-3",
            !isLeft && "flex items-center justify-center"
          )}
        >
          {renderedAction}
        </div>
      )}

      {divider && (
        <div
          className={cn("border-vl-black/8 border-b", isCompact ? "mt-4 sm:mt-5" : "mt-6 sm:mt-8")}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
