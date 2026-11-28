"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function OrderPrintButton() {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => window.print()}
      className="gap-2 print:hidden"
    >
      <Printer className="size-4" />
      Print Invoice / Packing Slip
    </Button>
  );
}
