"use client";

import { useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, Loader2 } from "lucide-react";
import { CartItemDTO } from "@/lib/cart/types";
import { updateCartItemAction, removeCartItemAction } from "@/lib/cart/actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface CartItemCardProps {
  item: CartItemDTO;
}

export function CartItemCard({ item }: CartItemCardProps) {
  const [isPending, startTransition] = useTransition();

  const handleUpdateQuantity = (newQuantity: number) => {
    if (newQuantity < 1) return;
    
    startTransition(async () => {
      const res = await updateCartItemAction(item.id, newQuantity);
      if (!res.success) {
        toast.error(res.error);
      }
    });
  };

  const handleRemove = () => {
    startTransition(async () => {
      const res = await removeCartItemAction(item.id);
      if (!res.success) {
        toast.error(res.error);
      } else {
        toast.success("Item has been removed from your cart.");
      }
    });
  };

  const isInsufficient = item.quantity > item.availableQuantity;

  return (
    <div className="flex gap-4 py-6 border-b">
      {/* Image */}
      <div className="relative w-24 h-32 md:w-32 md:h-40 shrink-0 bg-gray-100 rounded-lg overflow-hidden">
        {item.productImage ? (
          <Image
            src={item.productImage}
            alt={item.productName}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 96px, 128px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-between">
        <div className="flex justify-between items-start">
          <div>
            <Link href={`/products/${item.productSlug}`} className="font-semibold text-brand-charcoal hover:underline">
              {item.productName}
            </Link>
            <div className="text-sm text-muted-foreground mt-1 space-x-2">
              {item.variant.size && <span>Size: {item.variant.size}</span>}
              {item.variant.color && <span>Color: {item.variant.color}</span>}
            </div>
            
            {/* Stale inventory feedback */}
            {isInsufficient && (
              <p className="text-sm font-medium text-destructive mt-2">
                Only {item.availableQuantity} available in stock. Please adjust quantity.
              </p>
            )}
            {!item.variant.available && !isInsufficient && (
              <p className="text-sm font-medium text-destructive mt-2">
                This item is out of stock.
              </p>
            )}
          </div>
          <div className="text-right">
            <span className="font-bold">৳{item.lineTotal.toLocaleString()}</span>
            <div className="text-sm text-muted-foreground">
              ৳{item.variant.effectivePrice.toLocaleString()} each
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-end mt-4">
          <div className="flex items-center border rounded-md h-9">
            <button
              onClick={() => handleUpdateQuantity(item.quantity - 1)}
              disabled={item.quantity <= 1 || isPending}
              className="px-3 h-full hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center justify-center"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-10 text-center text-sm font-medium">
              {isPending ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : item.quantity}
            </span>
            <button
              onClick={() => handleUpdateQuantity(item.quantity + 1)}
              disabled={isPending || item.quantity >= 10 || item.quantity >= item.availableQuantity}
              className="px-3 h-full hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center justify-center"
              aria-label="Increase quantity"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={isPending}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}
