"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  name?: string;
  activeColor?: "cyan" | "emerald" | "amber" | "purple";
  size?: "sm" | "default";
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      checked: controlledChecked,
      defaultChecked = false,
      onCheckedChange,
      name,
      activeColor = "cyan",
      size = "default",
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const [uncontrolledChecked, setUncontrolledChecked] = React.useState(defaultChecked);
    const isControlled = controlledChecked !== undefined;
    const isChecked = isControlled ? controlledChecked : uncontrolledChecked;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      const nextChecked = !isChecked;
      if (!isControlled) {
        setUncontrolledChecked(nextChecked);
      }
      onCheckedChange?.(nextChecked);
      props.onClick?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        const nextChecked = !isChecked;
        if (!isControlled) {
          setUncontrolledChecked(nextChecked);
        }
        onCheckedChange?.(nextChecked);
      }
      props.onKeyDown?.(e);
    };

    const colorClasses = {
      cyan: "bg-vl-cyan-600",
      emerald: "bg-emerald-600",
      amber: "bg-amber-500",
      purple: "bg-purple-600",
    };

    return (
      <div className="inline-flex items-center">
        {name && (
          <input
            type="hidden"
            name={name}
            value={isChecked ? "true" : "false"}
            disabled={disabled}
          />
        )}
        <button
          type="button"
          ref={ref}
          role="switch"
          aria-checked={isChecked}
          disabled={disabled}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          className={cn(
            "focus-visible:ring-vl-cyan-500 relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2",
            size === "sm" ? "h-5 w-9" : "h-6 w-11",
            isChecked ? colorClasses[activeColor] : "bg-neutral-300",
            disabled && "cursor-not-allowed opacity-50",
            className
          )}
          {...props}
        >
          <span
            className={cn(
              "pointer-events-none inline-block transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
              size === "sm"
                ? cn("size-4", isChecked ? "translate-x-4" : "translate-x-0")
                : cn("size-5", isChecked ? "translate-x-5" : "translate-x-0")
            )}
          />
        </button>
      </div>
    );
  }
);

Switch.displayName = "Switch";
