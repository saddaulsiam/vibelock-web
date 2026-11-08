"use client";

import { Check, Copy } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface OrderCopyButtonProps {
  text: string;
  label?: string;
  successMessage?: string;
  title?: string;
  className?: string;
  variant?: "icon" | "button" | "pill";
}

export function OrderCopyButton({
  text,
  label,
  successMessage,
  title = "Copy to clipboard",
  className = "",
  variant = "icon",
}: OrderCopyButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!text) return;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopied(true);
      if (successMessage) {
        toast.success(successMessage);
      }
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard.");
    }
  };

  if (variant === "button") {
    return (
      <Button
        type="button"
        variant="outline"
        size="xs"
        onClick={handleCopy}
        className={`gap-1.5 active:scale-95 ${className}`}
        title={title}
      >
        {copied ? (
          <>
            <Check className="size-3.5 stroke-[2.5] text-emerald-600" />
            <span className="font-bold text-emerald-700">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="size-3.5 text-neutral-500" />
            <span>{label || "Copy"}</span>
          </>
        )}
      </Button>
    );
  }

  if (variant === "pill") {
    return (
      <Button
        type="button"
        variant="secondary"
        size="xs"
        onClick={handleCopy}
        className={`h-5 gap-1 rounded-md px-2 text-[10px] font-bold active:scale-95 ${className}`}
        title={title}
      >
        {copied ? (
          <>
            <Check className="size-2.5 stroke-[2.5] text-emerald-600" />
            <span className="text-emerald-700">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="size-2.5 text-neutral-400" />
            <span>{label || "Copy"}</span>
          </>
        )}
      </Button>
    );
  }

  // Default: icon button with subtle feedback
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      className={`size-6 text-neutral-400 hover:text-neutral-900 active:scale-90 ${
        copied ? "text-emerald-600 hover:text-emerald-700" : ""
      } ${className}`}
      title={copied ? "Copied!" : title}
    >
      {copied ? (
        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
          <Check className="size-3 stroke-[3]" />
          <span>Copied!</span>
        </span>
      ) : (
        <Copy className="size-3.5" />
      )}
    </Button>
  );
}
