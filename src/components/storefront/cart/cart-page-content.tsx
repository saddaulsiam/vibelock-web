"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { CartDTO } from "@/lib/cart/types";
import { CartItemCard } from "./cart-item-card";
import { Button } from "@/components/ui/button";

interface CartPageContentProps {
  cart: CartDTO | null;
}

export function CartPageContent({ cart }: CartPageContentProps) {
  if (!cart || cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="h-10 w-10 text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-muted-foreground mb-8">
          Looks like you haven&apos;t added anything yet.
        </p>
        <Link href="/products">
          <Button size="lg" className="font-semibold uppercase tracking-wider bg-brand-charcoal text-white hover:bg-black">
            Continue Shopping
          </Button>
        </Link>
      </div>
    );
  }

  // Calculate items with stale inventory requiring user action
  const requiresAdjustment = cart.items.some(item => item.quantity > item.availableQuantity || !item.variant.available);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
      {/* Cart Items */}
      <div className="lg:col-span-8">
        <div className="flex justify-between items-end border-b pb-4 mb-4">
          <h1 className="text-2xl font-bold tracking-tight">Shopping Cart</h1>
          <span className="text-muted-foreground">{cart.totalQuantity} items</span>
        </div>
        
        <div className="flex flex-col">
          {cart.items.map((item) => (
            <CartItemCard key={item.id} item={item} />
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="lg:col-span-4">
        <div className="bg-gray-50 rounded-xl p-6 sticky top-24">
          <h2 className="text-lg font-bold mb-4 border-b pb-4">Order Summary</h2>
          
          <div className="space-y-3 mb-6">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">৳{cart.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping & Taxes</span>
              <span className="text-sm text-muted-foreground">Calculated at checkout</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center border-t pt-4 mb-6">
            <span className="font-bold">Total (Estimated)</span>
            <span className="text-xl font-bold">৳{cart.subtotal.toLocaleString()}</span>
          </div>

          <Button 
            className="w-full py-6 font-bold uppercase tracking-wider bg-brand-charcoal text-white hover:bg-black disabled:opacity-50"
            disabled={true}
          >
            Proceed to Checkout (Phase 3F)
          </Button>
          
          {requiresAdjustment && (
            <p className="text-sm text-destructive text-center mt-4">
              Please adjust quantities to continue.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
