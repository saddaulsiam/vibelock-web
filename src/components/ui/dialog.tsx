"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 isolate z-50 bg-black/60 backdrop-blur-xs duration-150",
        className
      )}
      {...props}
    />
  );
}

const dialogContentVariants = cva(
  "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 fixed top-1/2 left-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 gap-4 p-5 sm:p-6 text-sm duration-150 outline-none",
  {
    variants: {
      variant: {
        /** default — standard admin and storefront modal, governed by master card radius */
        default:
          "bg-popover text-popover-foreground border border-border shadow-2xl rounded-card ring-1 ring-foreground/10",
        /** brand — clean streetwear brand modal */
        brand: "bg-white text-vl-black border border-vl-black/10 shadow-2xl rounded-card",
        /** dark — POS & dark-themed modal */
        dark: "bg-surface-dark text-vl-white border border-border-dark shadow-2xl rounded-card",
      },
      size: {
        sm: "max-w-[calc(100%-2rem)] sm:max-w-sm",
        default: "max-w-[calc(100%-2rem)] sm:max-w-md",
        lg: "max-w-[calc(100%-2rem)] sm:max-w-lg",
        xl: "max-w-[calc(100%-2rem)] sm:max-w-xl",
        "2xl": "max-w-[calc(100%-2rem)] sm:max-w-2xl",
        full: "max-w-[calc(100%-2rem)] sm:max-w-4xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface DialogContentProps
  extends DialogPrimitive.Popup.Props, VariantProps<typeof dialogContentVariants> {
  showCloseButton?: boolean;
}

function DialogContent({
  className,
  children,
  variant,
  size,
  showCloseButton = true,
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(dialogContentVariants({ variant, size }), className)}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="text-muted-foreground hover:text-foreground absolute top-3 right-3"
                size="icon-sm"
              />
            }
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="dialog-header" className={cn("flex flex-col gap-1.5", className)} {...props} />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean;
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end sm:gap-2.5",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" size="sm" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-foreground text-base leading-tight font-semibold sm:text-lg",
        className
      )}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-muted-foreground *:[a]:hover:text-foreground text-xs sm:text-sm *:[a]:underline *:[a]:underline-offset-3",
        className
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  dialogContentVariants,
};
