"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createOrderAction } from "@/lib/checkout/actions";
import { CheckoutFormValues, checkoutSchema } from "@/lib/checkout/validation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { CartDTO } from "@/lib/cart/types";
import Image from "next/image";

interface CheckoutFormProps {
  cart: CartDTO;
  defaultEmail: string;
  defaultName: string;
}

export function CheckoutForm({ cart, defaultEmail, defaultName }: CheckoutFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState<Partial<CheckoutFormValues>>({
    customerEmail: defaultEmail,
    customerName: defaultName,
    paymentMethod: "COD",
    shippingCountry: "Bangladesh",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFormValues, string>>>({});

  const handleInputChange = (field: keyof CheckoutFormValues, value: string | null) => {
    setFormData((prev) => ({ ...prev, [field]: value || "" }));
    // Clear error for field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    const parsed = checkoutSchema.safeParse(formData);
    if (!parsed.success) {
      const newErrors: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        if (err.path[0]) newErrors[err.path[0].toString()] = err.message;
      });
      setErrors(newErrors);
      toast.error("Please fix the validation errors in the form.");
      return;
    }

    startTransition(async () => {
      const idempotencyKey = crypto.randomUUID();
      const res = await createOrderAction(parsed.data, idempotencyKey);

      if (res.success && res.orderNumber) {
        if (res.redirectUrl) {
          window.location.href = res.redirectUrl;
        } else {
          router.push(`/order-success/${res.orderNumber}`);
        }
      } else {
        toast.error(res.error || "An unexpected error occurred. Please try again.");
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
      <div className="lg:col-span-7 space-y-8">
        <form id="checkout-form" onSubmit={handleSubmit} className="space-y-8">
          {/* Customer Information */}
          <section>
            <h2 className="text-xl font-bold mb-4 border-b pb-2">Customer Information</h2>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email Address</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail || ""}
                  onChange={(e) => handleInputChange("customerEmail", e.target.value)}
                />
                {errors.customerEmail && (
                  <p className="text-sm text-destructive">{errors.customerEmail}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Full Name</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName || ""}
                    onChange={(e) => handleInputChange("customerName", e.target.value)}
                  />
                  {errors.customerName && (
                    <p className="text-sm text-destructive">{errors.customerName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone Number</Label>
                  <Input
                    id="customerPhone"
                    value={formData.customerPhone || ""}
                    onChange={(e) => handleInputChange("customerPhone", e.target.value)}
                  />
                  {errors.customerPhone && (
                    <p className="text-sm text-destructive">{errors.customerPhone}</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Shipping Information */}
          <section>
            <h2 className="text-xl font-bold mb-4 border-b pb-2">Shipping Information</h2>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shippingStreet">Street Address</Label>
                <Input
                  id="shippingStreet"
                  value={formData.shippingStreet || ""}
                  onChange={(e) => handleInputChange("shippingStreet", e.target.value)}
                />
                {errors.shippingStreet && (
                  <p className="text-sm text-destructive">{errors.shippingStreet}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shippingCity">City</Label>
                  <Input
                    id="shippingCity"
                    value={formData.shippingCity || ""}
                    onChange={(e) => handleInputChange("shippingCity", e.target.value)}
                  />
                  {errors.shippingCity && (
                    <p className="text-sm text-destructive">{errors.shippingCity}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shippingZip">Postal Code</Label>
                  <Input
                    id="shippingZip"
                    value={formData.shippingZip || ""}
                    onChange={(e) => handleInputChange("shippingZip", e.target.value)}
                  />
                  {errors.shippingZip && (
                    <p className="text-sm text-destructive">{errors.shippingZip}</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Payment Method */}
          <section>
            <h2 className="text-xl font-bold mb-4 border-b pb-2">Payment Method</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Payment Option</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(v) => handleInputChange("paymentMethod", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COD">Cash on Delivery</SelectItem>
                    <SelectItem value="ONLINE">Online Payment</SelectItem>
                  </SelectContent>
                </Select>
                {errors.paymentMethod && (
                  <p className="text-sm text-destructive">{errors.paymentMethod}</p>
                )}
              </div>
            </div>
          </section>
        </form>
      </div>

      <div className="lg:col-span-5">
        <div className="bg-gray-50 rounded-xl p-6 sticky top-24">
          <h2 className="text-lg font-bold mb-4 border-b pb-4">Order Summary</h2>

          <div className="flex flex-col gap-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
            {cart.items.map((item) => (
              <div key={item.id} className="flex gap-4 items-center">
                <div className="w-16 h-16 bg-white rounded-md flex-shrink-0 relative overflow-hidden border">
                  {item.productImage && (
                    <Image
                      src={item.productImage}
                      alt={item.productName || ""}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium truncate">{item.productName}</h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.variant.size && `${item.variant.size}`}
                    {item.variant.color && ` • ${item.variant.color}`}
                  </p>
                  <p className="text-xs font-medium">Qty: {item.quantity}</p>
                </div>
                <div className="text-sm font-medium whitespace-nowrap">
                  ৳{(item.variant.effectivePrice * item.quantity).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 mb-6 border-t pt-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">৳{cart.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span className="font-medium">Free</span>
            </div>
          </div>

          <div className="flex justify-between items-center border-t pt-4 mb-6">
            <span className="font-bold text-lg">Total</span>
            <span className="text-2xl font-bold">৳{cart.subtotal.toLocaleString()}</span>
          </div>

          <Button
            type="submit"
            form="checkout-form"
            disabled={isPending}
            className="w-full py-6 font-bold uppercase tracking-wider bg-brand-charcoal text-white hover:bg-black"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              "Place Order"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
