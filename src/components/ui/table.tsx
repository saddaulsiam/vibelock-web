"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const tableVariants = cva("w-full border-collapse text-left", {
  variants: {
    variant: {
      /** default — Standard administrative data grid */
      default: "text-xs text-[#101114]",
      /** striped — Alternating rows for readable scanning of high-density lists */
      striped: "text-xs text-[#101114] [&_tbody_tr:nth-child(even)]:bg-neutral-50/50",
      /** plain — Unstyled / borderless table for receipts, modals, and embedded sub-tables */
      plain: "text-xs text-[#101114]",
      /** dark — POS dark-mode table */
      dark: "text-xs text-vl-white [&_tbody_tr:nth-child(even)]:bg-[#1d1e24]",
    },
    density: {
      /** compact — Dense POS order lists, receipt breakdown, quick modals */
      compact: "[&_th]:px-2.5 [&_th]:py-2 [&_td]:px-2.5 [&_td]:py-2 text-2xs",
      /** default — Standard 14px/12px admin tables */
      default: "[&_th]:px-4 [&_th]:py-3.5 [&_td]:px-4 [&_td]:py-3.5 text-xs",
      /** relaxed — Account history, invoice view, spacious tables */
      relaxed: "[&_th]:px-5 [&_th]:py-4 [&_td]:px-5 [&_td]:py-4 text-sm",
    },
  },
  defaultVariants: {
    variant: "default",
    density: "default",
  },
});

const tableContainerVariants = cva("relative w-full overflow-x-auto", {
  variants: {
    variant: {
      default: "rounded-xl border border-neutral-200/90 bg-white shadow-2xs",
      striped: "rounded-xl border border-neutral-200/90 bg-white shadow-2xs",
      plain: "rounded-none border-0 bg-transparent shadow-none",
      dark: "rounded-xl border border-border-dark bg-surface-dark shadow-2xs",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface TableProps
  extends React.ComponentProps<"table">, VariantProps<typeof tableVariants> {
  containerClassName?: string;
  hideContainer?: boolean;
}

function Table({
  className,
  containerClassName,
  variant = "default",
  density = "default",
  hideContainer = false,
  ...props
}: TableProps) {
  const tableEl = (
    <table
      data-slot="table"
      data-density={density}
      data-variant={variant}
      className={cn(tableVariants({ variant, density }), className)}
      {...props}
    />
  );

  if (hideContainer) {
    return tableEl;
  }

  return (
    <div
      data-slot="table-container"
      className={cn(tableContainerVariants({ variant }), containerClassName)}
    >
      {tableEl}
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "text-compact border-b border-neutral-200 bg-[#FBF9F5] font-semibold tracking-wider text-neutral-600 uppercase select-none",
        className
      )}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("divide-y divide-neutral-100", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("border-t bg-neutral-50 font-medium [&>tr]:last:border-b-0", className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "transition-colors hover:bg-neutral-50/70 data-[state=selected]:bg-neutral-100",
        className
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "px-4 py-3.5 text-left align-middle font-semibold whitespace-nowrap has-[[role=checkbox]]:pr-0",
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-4 py-3.5 align-middle whitespace-nowrap has-[[role=checkbox]]:pr-0",
        className
      )}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-xs text-neutral-500", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  tableVariants,
  tableContainerVariants,
};
