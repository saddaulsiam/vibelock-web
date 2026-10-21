"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createReturnRequestAction } from "@/lib/returns/actions";
import { OrderItemSummary } from "@/lib/orders/types";
import { Loader2 } from "lucide-react";
import { Price } from "@/components/storefront/price";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReturnItem extends OrderItemSummary {
  returnableQuantity: number;
}

interface ReturnFormProps {
  orderNumber: string;
  items: ReturnItem[];
}

export function ReturnForm({ orderNumber, items }: ReturnFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState("");

  // Track selected quantity for each item ID
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});

  const handleQuantityChange = (itemId: string, qty: number) => {
    setSelectedQuantities((prev) => ({
      ...prev,
      [itemId]: qty,
    }));
  };

  const calculateTotalRefundEst = () => {
    let total = 0;
    for (const item of items) {
      const qty = selectedQuantities[item.id] || 0;
      total += qty * item.unitPrice;
    }
    return total;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedItems = Object.entries(selectedQuantities)
      .filter(([id, qty]) => id && qty > 0)
      .map(([orderItemId, quantity]) => ({ orderItemId, quantity }));

    if (selectedItems.length === 0) {
      toast.error("Please select at least one item to return.");
      return;
    }

    if (!reason) {
      toast.error("Please provide a reason for the return.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createReturnRequestAction({
        orderNumber,
        reason,
        items: selectedItems,
      });

      if (res.success) {
        toast.success("message" in res ? (res.message as string) : "Success");
        router.push(`/account/orders/${orderNumber}`);
      } else {
        toast.error("error" in res ? (res.error as string) : "An error occurred");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalEst = calculateTotalRefundEst();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Items to Return</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="divide-y rounded-md border">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col items-center justify-between gap-4 p-4 sm:flex-row"
              >
                <div>
                  <p className="font-semibold">{item.productName}</p>
                  <p className="text-sm text-zinc-500">
                    {item.sku} {item.size ? ` • Size: ${item.size}` : ""}{" "}
                    {item.color ? ` • Color: ${item.color}` : ""}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    <Price amount={item.unitPrice} />
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor={`qty-${item.id}`} className="text-sm text-zinc-500">
                    Qty to Return
                  </Label>
                  <Input
                    id={`qty-${item.id}`}
                    type="number"
                    min="0"
                    max={item.returnableQuantity}
                    value={selectedQuantities[item.id] || 0}
                    onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                    className="w-20"
                  />
                  <span className="text-xs text-zinc-400">/ {item.returnableQuantity}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Return Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Return</Label>
            <Select onValueChange={(val) => setReason(val || "")} value={reason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WRONG_SIZE">Wrong Size</SelectItem>
                <SelectItem value="DEFECTIVE">Defective or Damaged</SelectItem>
                <SelectItem value="WRONG_ITEM">Wrong Item Received</SelectItem>
                <SelectItem value="NOT_AS_EXPECTED">Not as Expected</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-between gap-4 border-t bg-zinc-50 p-6 sm:flex-row">
          <div>
            <p className="text-sm text-zinc-500">Estimated Refund</p>
            <Price amount={totalEst} className="text-xl font-bold" />
            <p className="mt-1 text-xs text-zinc-400">Shipping charges are non-refundable.</p>
          </div>
          <Button type="submit" size="lg" disabled={isSubmitting || totalEst === 0}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Return Request
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
