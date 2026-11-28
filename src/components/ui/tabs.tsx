"use client";

import { cn } from "@/lib/utils";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

// Context for cascading variant & size from TabsRoot or TabsList to TabsTrigger
interface TabsContextValue {
  variant?: "default" | "brand" | "line" | "pills";
  size?: "sm" | "default" | "lg";
}

const TabsContext = React.createContext<TabsContextValue>({
  variant: "default",
  size: "default",
});

/* ── 1. TABS ROOT ── */
const tabsVariants = cva("group/tabs flex gap-2 data-horizontal:flex-col", {
  variants: {
    variant: {
      default: "",
      brand: "",
      line: "",
      pills: "",
    },
    size: {
      sm: "",
      default: "",
      lg: "",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export interface TabsProps extends TabsPrimitive.Root.Props, VariantProps<typeof tabsVariants> {}

function Tabs({
  className,
  orientation = "horizontal",
  variant = "default",
  size = "default",
  ...props
}: TabsProps) {
  const contextValue = React.useMemo(
    () => ({ variant: variant ?? "default", size: size ?? "default" }),
    [variant, size]
  );

  return (
    <TabsContext.Provider value={contextValue}>
      <TabsPrimitive.Root
        data-slot="tabs"
        data-orientation={orientation}
        className={cn(tabsVariants({ variant, size }), className)}
        {...props}
      />
    </TabsContext.Provider>
  );
}

/* ── 2. TABS LIST ── */
const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center transition-colors group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col select-none",
  {
    variants: {
      variant: {
        /**
         * default — VibeLock Segmented Pill Container.
         * Clean neutral backdrop with subtle border and crisp active tab lift.
         */
        default:
          "rounded-ui border border-neutral-200/90 bg-neutral-100/80 text-vl-dark-400 shadow-2xs backdrop-blur-xs dark:border-vl-dark-700 dark:bg-vl-dark-800/80 dark:text-neutral-400",
        /**
         * brand — VibeLock Obsidian Streetwear Container.
         * Deep dark surface with high-contrast cyber glow accents.
         */
        brand:
          "rounded-ui border border-vl-dark-800 bg-vl-dark-900 text-neutral-400 shadow-xs dark:border-vl-dark-700",
        /**
         * line — VibeLock Underline Minimalist Tabs.
         * Borderless transparent container with bottom rail for workspace headers.
         */
        line: "w-full justify-start gap-3 rounded-none border-b border-neutral-200 bg-transparent p-0 dark:border-vl-dark-700",
        /**
         * pills — Free-floating pills without outer bordered container.
         */
        pills: "gap-1.5 rounded-none bg-transparent p-0",
      },
      size: {
        sm: "h-7 p-0.5 gap-0.5 text-xs group-data-horizontal/tabs:h-7",
        default: "h-9 p-1 gap-1 text-xs group-data-horizontal/tabs:h-9",
        lg: "h-11 p-1.5 gap-1.5 text-sm group-data-horizontal/tabs:h-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface TabsListProps
  extends TabsPrimitive.List.Props, VariantProps<typeof tabsListVariants> {}

function TabsList({ className, variant, size, ...props }: TabsListProps) {
  const parentContext = React.useContext(TabsContext);
  const resolvedVariant = variant ?? parentContext.variant ?? "default";
  const resolvedSize = size ?? parentContext.size ?? "default";

  const contextValue = React.useMemo(
    () => ({ variant: resolvedVariant, size: resolvedSize }),
    [resolvedVariant, resolvedSize]
  );

  return (
    <TabsContext.Provider value={contextValue}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant={resolvedVariant}
        data-size={resolvedSize}
        className={cn(
          tabsListVariants({ variant: resolvedVariant, size: resolvedSize }),
          className
        )}
        {...props}
      />
    </TabsContext.Provider>
  );
}

/* ── 3. TABS TRIGGER ── */
const tabsTriggerVariants = cva(
  "group/tabs-trigger relative inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-150 outline-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vl-cyan active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        /**
         * default — Segmented pill with clean white elevation and crisp obsidian text.
         */
        default: [
          "rounded-[calc(var(--radius-ui)-2px)] text-vl-dark-400 hover:text-vl-dark-900",
          "data-active:bg-white data-active:text-vl-dark-900 data-active:font-bold data-active:shadow-xs",
          "dark:text-neutral-400 dark:hover:text-white dark:data-active:bg-vl-dark-700 dark:data-active:text-white dark:data-active:shadow-none",
        ],
        /**
         * brand — Streetwear Obsidian & Cyber Cyan active state.
         */
        brand: [
          "rounded-[calc(var(--radius-ui)-2px)] text-neutral-400 hover:text-white",
          "data-active:bg-vl-cyan data-active:text-vl-dark-900 data-active:font-bold data-active:shadow-sm",
          "data-active:hover:bg-vl-cyan-400",
        ],
        /**
         * line — Technical bottom line indicator.
         */
        line: [
          "rounded-none border-b-2 border-transparent bg-transparent pb-2 text-vl-dark-400 hover:text-vl-dark-900",
          "data-active:border-vl-dark-900 data-active:text-vl-dark-900 data-active:font-bold data-active:bg-transparent shadow-none",
          "dark:hover:text-white dark:data-active:border-vl-cyan dark:data-active:text-vl-cyan",
        ],
        /**
         * pills — Elevated rounded pill buttons.
         */
        pills: [
          "rounded-pill border border-neutral-200/80 bg-white text-vl-dark-400 hover:bg-neutral-50 hover:text-vl-dark-900",
          "data-active:border-vl-dark-900 data-active:bg-vl-dark-900 data-active:text-white data-active:font-bold data-active:shadow-xs",
          "dark:border-vl-dark-700 dark:bg-vl-dark-800 dark:text-neutral-400 dark:data-active:bg-vl-cyan dark:data-active:text-vl-dark-900",
        ],
      },
      size: {
        sm: "h-6 px-2 py-0.5 text-[11px] gap-1",
        default: "h-7 px-3 py-1 text-xs gap-1.5",
        lg: "h-8 px-4 py-1.5 text-sm gap-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface TabsTriggerProps
  extends TabsPrimitive.Tab.Props, VariantProps<typeof tabsTriggerVariants> {}

function TabsTrigger({
  className,
  variant,
  size,
  nativeButton,
  render,
  ...props
}: TabsTriggerProps) {
  const context = React.useContext(TabsContext);
  const resolvedVariant = variant ?? context.variant ?? "default";
  const resolvedSize = size ?? context.size ?? "default";

  // Automatically determine if the rendered element is a native button or a custom element (e.g. Next.js <Link>)
  const resolvedNativeButton =
    nativeButton !== undefined
      ? nativeButton
      : render && React.isValidElement(render)
        ? render.type === "button"
        : undefined;

  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      data-variant={resolvedVariant}
      data-size={resolvedSize}
      render={render}
      nativeButton={resolvedNativeButton}
      className={cn(
        tabsTriggerVariants({ variant: resolvedVariant, size: resolvedSize }),
        className
      )}
      {...props}
    />
  );
}

/* ── 4. TABS CONTENT ── */
function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn(
        "focus-visible:ring-vl-cyan flex-1 text-sm outline-none focus-visible:ring-2 focus-visible:outline-none",
        className
      )}
      {...props}
    />
  );
}

export {
  Tabs,
  TabsContent,
  TabsList,
  tabsListVariants,
  TabsTrigger,
  tabsTriggerVariants,
  tabsVariants,
};
