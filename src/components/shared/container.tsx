import * as React from "react";
import { cn } from "@/lib/utils";

export const containerSizes = {
  /**
   * default: 1440px (max-w-360 / 90rem).
   * Exact VibeLock wide grid canvas default.
   * Matches original: "mx-auto w-full max-w-360 px-4 sm:px-6 lg:px-8".
   */
  default: "max-w-360",
  /**
   * narrow: 1152px (max-w-6xl / 72rem).
   * Used in Cart, Checkout, Product Detail, Account Shell, and Floating Header.
   */
  narrow: "max-w-6xl",
  /**
   * standard: 1280px (max-w-7xl / 80rem).
   * Standard e-commerce catalog max-width.
   */
  standard: "max-w-7xl",
  /**
   * wide: 1600px (--container-admin: 100rem).
   * Admin operations dashboard layout width.
   */
  wide: "max-w-admin",
  /**
   * full: 100% width with standard responsive horizontal padding.
   */
  full: "max-w-full",
} as const;

export type ContainerSize = keyof typeof containerSizes;

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Container max-width size preset.
   * Defaults to "default" (max-w-360 / 1440px), exactly preserving pre-existing behavior.
   */
  size?: ContainerSize;
  /**
   * Render container as custom HTML element or polymorphic component.
   * Defaults to "div".
   */
  as?: React.ElementType;
}

export function Container({
  className,
  size = "default",
  as: Component = "div",
  ...props
}: ContainerProps) {
  return (
    <Component
      className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", containerSizes[size], className)}
      {...props}
    />
  );
}
