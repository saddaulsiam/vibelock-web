"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

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
