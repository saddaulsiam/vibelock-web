"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";

export function OrderBackButton() {
  const router = useRouter();

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/admin/orders");
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={handleBack}
      className="gap-1.5 font-semibold text-neutral-500 hover:text-neutral-900"
      title="Return to orders list (preserves active filters)"
    >
      <ArrowLeft className="size-3.5" />
      <span>Back to Orders</span>
    </Button>
  );
}
