"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageOff, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import type { CartDTO, CartItemDTO } from "@/lib/cart/types";
import { createOrderAction } from "@/lib/checkout/actions";
import { checkoutSchema, type CheckoutFormValues } from "@/lib/checkout/validation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CheckoutFormProps {
  cart: CartDTO;
  defaultEmail: string;
  defaultName: string;
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getSafeCheckoutError(error: string | undefined) {
  if (error === "Your cart is empty" || error === "Your cart is empty.") {
    return "Your cart is empty. Return to your cart and try again.";
  }
  if (error?.toLowerCase().includes("stock")) {
    return "Some items no longer have enough stock. Return to your cart to review them.";
  }
  if (error?.toLowerCase().includes("unavailable")) {
    return "One or more items are no longer available. Return to your cart to review them.";
  }
  if (error === "Unauthorized" || error === "Unauthorized.") {
    return "Your session needs to be refreshed. Please sign in and try again.";
  }
  if (error?.toLowerCase().includes("payment initiation failed")) {
    return "Your order was created, but online payment could not be started. You can retry from your orders page.";
  }
  return "We could not place your order. Please review your details and try again.";
}

function CheckoutSummaryItem({ item }: { item: CartItemDTO }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <li className="grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-[#101114]/10 py-4 last:border-b-0">
      <div className="relative aspect-square overflow-hidden bg-white">
        {item.productImage && !imageFailed ? (
          <Image
            src={item.productImage}
            alt={item.productName}
            fill
            sizes="64px"
            className="object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <ImageOff className="size-4" aria-hidden="true" />
            <span className="sr-only">Image unavailable</span>
          </span>
        )}
      </div>

      <div className="min-w-0">
        <h3 className="break-words text-sm font-semibold leading-5 text-[#101114]">{item.productName}</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {[item.variant.size, item.variant.color].filter(Boolean).join(" · ") || "Standard option"}
          {" · "}Qty {item.quantity}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatPrice(item.variant.effectivePrice)} each
          {item.variant.discountPrice !== null && (
            <span className="ml-2 line-through">{formatPrice(item.variant.sellingPrice)}</span>
          )}
        </p>
      </div>

      <span className="text-right text-sm font-semibold text-[#101114]">{formatPrice(item.lineTotal)}</span>
    </li>
  );
}

export function CheckoutForm({ cart, defaultEmail, defaultName }: CheckoutFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isSubmitting = useRef(false);
  const [formData, setFormData] = useState<Partial<CheckoutFormValues>>({
    customerEmail: defaultEmail,
    customerName: defaultName,
    paymentMethod: "COD",
    shippingCountry: "Bangladesh",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFormValues, string>>>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const handleInputChange = (field: keyof CheckoutFormValues, value: string | null) => {
    setFormData((current) => ({ ...current, [field]: value ?? "" }));
    setSubmissionError(null);
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting.current) return;
    setSubmissionError(null);

    const parsed = checkoutSchema.safeParse(formData);
    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof CheckoutFormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !nextErrors[field as keyof CheckoutFormValues]) {
          nextErrors[field as keyof CheckoutFormValues] = issue.message;
        }
      }
      setErrors(nextErrors);
      toast.error("Please review the highlighted checkout fields.");
      return;
    }

    setErrors({});
    isSubmitting.current = true;
    startTransition(async () => {
      try {
        const result = await createOrderAction(parsed.data, crypto.randomUUID());
        if (result.success && result.orderNumber) {
          if (result.error) toast.error(getSafeCheckoutError(result.error));
          if (result.redirectUrl) {
            window.location.assign(result.redirectUrl);
          } else {
            router.push(`/order-success/${result.orderNumber}`);
          }
          return;
        }

        const safeMessage = getSafeCheckoutError(result.error);
        setSubmissionError(safeMessage);
        toast.error(safeMessage);
        isSubmitting.current = false;
      } catch {
        const safeMessage = getSafeCheckoutError(undefined);
        setSubmissionError(safeMessage);
        toast.error(safeMessage);
        isSubmitting.current = false;
      }
    });
  };

  const fieldError = (field: keyof CheckoutFormValues) =>
    errors[field] ? (
      <p id={`${field}-error`} className="text-sm text-destructive" role="alert">
        {errors[field]}
      </p>
    ) : null;

  const discountTotal = cart.items.reduce((total, item) => {
    if (item.variant.discountPrice === null) return total;
    return total + (item.variant.sellingPrice - item.variant.effectivePrice) * item.quantity;
  }, 0);
  const subtotalBeforeDiscount = cart.subtotal + discountTotal;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-12">
      <form id="checkout-form" onSubmit={handleSubmit} noValidate className="min-w-0 space-y-8">
        {submissionError && (
          <div className="border-l-2 border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
            {submissionError}
          </div>
        )}

        <fieldset disabled={isPending} className="min-w-0 space-y-8 disabled:opacity-80">
          <section aria-labelledby="customer-information-heading" className="space-y-5">
            <div className="border-b border-border pb-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">01 / Contact</p>
              <h2 id="customer-information-heading" className="text-xl font-semibold tracking-tight">Customer information</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="customerName">Full name</Label>
                <Input
                  id="customerName"
                  autoComplete="name"
                  value={formData.customerName ?? ""}
                  onChange={(event) => handleInputChange("customerName", event.target.value)}
                  aria-invalid={Boolean(errors.customerName)}
                  aria-describedby={errors.customerName ? "customerName-error" : undefined}
                  className="h-11 rounded-sm border-[#101114]/20 bg-white"
                />
                {fieldError("customerName")}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email address</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  autoComplete="email"
                  value={formData.customerEmail ?? ""}
                  onChange={(event) => handleInputChange("customerEmail", event.target.value)}
                  aria-invalid={Boolean(errors.customerEmail)}
                  aria-describedby={errors.customerEmail ? "customerEmail-error" : undefined}
                  className="h-11 rounded-sm border-[#101114]/20 bg-white"
                />
                {fieldError("customerEmail")}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone number</Label>
                <Input
                  id="customerPhone"
                  type="tel"
                  autoComplete="tel"
                  value={formData.customerPhone ?? ""}
                  onChange={(event) => handleInputChange("customerPhone", event.target.value)}
                  aria-invalid={Boolean(errors.customerPhone)}
                  aria-describedby={errors.customerPhone ? "customerPhone-error" : undefined}
                  className="h-11 rounded-sm border-[#101114]/20 bg-white"
                />
                {fieldError("customerPhone")}
              </div>
            </div>
          </section>

          <section aria-labelledby="shipping-information-heading" className="space-y-5">
            <div className="border-b border-border pb-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">02 / Delivery</p>
              <h2 id="shipping-information-heading" className="text-xl font-semibold tracking-tight">Shipping address</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="shippingStreet">Street address</Label>
                <Input
                  id="shippingStreet"
                  autoComplete="street-address"
                  value={formData.shippingStreet ?? ""}
                  onChange={(event) => handleInputChange("shippingStreet", event.target.value)}
                  aria-invalid={Boolean(errors.shippingStreet)}
                  aria-describedby={errors.shippingStreet ? "shippingStreet-error" : undefined}
                  className="h-11 rounded-sm border-[#101114]/20 bg-white"
                />
                {fieldError("shippingStreet")}
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippingCity">City</Label>
                <Input
                  id="shippingCity"
                  autoComplete="address-level2"
                  value={formData.shippingCity ?? ""}
                  onChange={(event) => handleInputChange("shippingCity", event.target.value)}
                  aria-invalid={Boolean(errors.shippingCity)}
                  aria-describedby={errors.shippingCity ? "shippingCity-error" : undefined}
                  className="h-11 rounded-sm border-[#101114]/20 bg-white"
                />
                {fieldError("shippingCity")}
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippingState">State / area <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Input
                  id="shippingState"
                  autoComplete="address-level1"
                  value={formData.shippingState ?? ""}
                  onChange={(event) => handleInputChange("shippingState", event.target.value)}
                  aria-invalid={Boolean(errors.shippingState)}
                  aria-describedby={errors.shippingState ? "shippingState-error" : undefined}
                  className="h-11 rounded-sm border-[#101114]/20 bg-white"
                />
                {fieldError("shippingState")}
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippingZip">Postal / ZIP code <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Input
                  id="shippingZip"
                  autoComplete="postal-code"
                  value={formData.shippingZip ?? ""}
                  onChange={(event) => handleInputChange("shippingZip", event.target.value)}
                  aria-invalid={Boolean(errors.shippingZip)}
                  aria-describedby={errors.shippingZip ? "shippingZip-error" : undefined}
                  className="h-11 rounded-sm border-[#101114]/20 bg-white"
                />
                {fieldError("shippingZip")}
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippingCountry">Country</Label>
                <Input
                  id="shippingCountry"
                  autoComplete="country-name"
                  value={formData.shippingCountry ?? ""}
                  onChange={(event) => handleInputChange("shippingCountry", event.target.value)}
                  aria-invalid={Boolean(errors.shippingCountry)}
                  aria-describedby={errors.shippingCountry ? "shippingCountry-error" : undefined}
                  className="h-11 rounded-sm border-[#101114]/20 bg-white"
                />
                {fieldError("shippingCountry")}
              </div>
            </div>
          </section>

          <section aria-labelledby="payment-method-heading" className="space-y-5">
            <div className="border-b border-border pb-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">03 / Payment</p>
              <h2 id="payment-method-heading" className="text-xl font-semibold tracking-tight">Payment method</h2>
            </div>

            <fieldset className="space-y-3">
              <legend className="sr-only">Choose a payment method</legend>
              {([
                { value: "COD", title: "Cash on delivery", detail: "Pay when your order arrives." },
                { value: "ONLINE", title: "Online payment", detail: "Continue to the existing online payment flow." },
              ] as const).map((method) => {
                const selected = formData.paymentMethod === method.value;
                return (
                  <label
                    key={method.value}
                    className={`flex min-h-[4.5rem] cursor-pointer items-start gap-3 border p-4 transition-colors focus-within:ring-2 focus-within:ring-[#00D9FF] ${
                      selected ? "border-[#101114] bg-[#F3F0E8]/60" : "border-border bg-white hover:border-[#101114]/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.value}
                      checked={selected}
                      onChange={(event) => handleInputChange("paymentMethod", event.target.value)}
                      className="mt-1 size-4 accent-[#101114]"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[#101114]">{method.title}</span>
                      <span className="mt-1 block text-sm leading-5 text-muted-foreground">{method.detail}</span>
                    </span>
                  </label>
                );
              })}
              {fieldError("paymentMethod")}
            </fieldset>
          </section>
        </fieldset>
      </form>

      <aside aria-labelledby="checkout-summary-heading" className="lg:sticky lg:top-24 lg:self-start">
        <div className="border border-border bg-[#F3F0E8]/55 p-5 sm:p-6">
          <div className="border-b border-[#101114]/15 pb-4">
            <h2 id="checkout-summary-heading" className="text-lg font-semibold tracking-tight">Order summary</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {cart.totalQuantity} {cart.totalQuantity === 1 ? "item" : "items"}
            </p>
          </div>

          <ul className="max-h-[22rem] divide-y-0 overflow-y-auto pr-1" aria-label="Items in your order">
            {cart.items.map((item) => <CheckoutSummaryItem key={item.id} item={item} />)}
          </ul>

          <dl className="space-y-3 border-t border-[#101114]/15 py-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-medium text-[#101114]">{formatPrice(subtotalBeforeDiscount)}</dd>
            </div>
            {discountTotal > 0 && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Discount</dt>
                <dd className="font-medium text-[#101114]">−{formatPrice(discountTotal)}</dd>
              </div>
            )}
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd className="max-w-36 text-right text-muted-foreground">Calculated from delivery city</dd>
            </div>
          </dl>

          <div className="flex items-center justify-between gap-3 border-t border-[#101114]/15 pt-4">
            <span className="font-semibold">Items total</span>
            <span className="text-xl font-semibold tracking-tight">{formatPrice(cart.subtotal)}</span>
          </div>
          <div className="mt-4 flex items-start justify-between gap-3 text-sm">
            <span className="font-semibold">Grand total</span>
            <span className="max-w-36 text-right font-medium text-muted-foreground">Calculated after delivery city</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Final order total includes the delivery charge calculated from your city and is confirmed after you place the order.
          </p>

          <button
            type="submit"
            form="checkout-form"
            disabled={isPending}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#101114] px-5 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#101114]/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
            {isPending ? "Placing order" : "Place order"}
          </button>
        </div>
      </aside>
    </div>
  );
}
