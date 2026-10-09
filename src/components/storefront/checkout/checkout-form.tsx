"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageOff, LoaderCircle, Tag } from "lucide-react";
import { toast } from "sonner";
import type { CartDTO, CartItemDTO } from "@/lib/cart/types";
import { createOrderAction, getShippingMethodsAction, validateCouponAction } from "@/lib/checkout/actions";
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
  if (error?.toLowerCase().includes("online payment is currently unavailable")) {
    return "Online payment is currently unavailable. Please choose cash on delivery.";
  }
  if (
    error?.toLowerCase().includes("shipping") ||
    error?.toLowerCase().includes("delivery") ||
    error?.toLowerCase().includes("coupon") ||
    error?.toLowerCase().includes("minimum order")
  ) {
    return error;
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
  const idempotencyKey = useRef(crypto.randomUUID());
  const [formData, setFormData] = useState<Partial<CheckoutFormValues>>({
    customerEmail: defaultEmail,
    customerName: defaultName,
    paymentMethod: "COD",
    shippingCountry: "Bangladesh",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFormValues, string>>>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: string;
    discountValue: number;
    discountAmount: number;
  } | null>(null);

  const [shippingMethods, setShippingMethods] = useState<
    Array<{ id: string; name: string; cost: number; zoneId: string; zoneName: string }>
  >([]);
  const [selectedShippingMethodId, setSelectedShippingMethodId] = useState<string | null>(null);
  const [isLoadingShipping, setIsLoadingShipping] = useState(false);
  const [shippingLookupError, setShippingLookupError] = useState<string | null>(null);

  useEffect(() => {
    const city = formData.shippingCity?.trim();
    const country = formData.shippingCountry?.trim();
    let cancelled = false;

    const timer = setTimeout(async () => {
      if (!city || !country) {
        if (!cancelled) {
          setShippingMethods([]);
          setSelectedShippingMethodId(null);
          setShippingLookupError(null);
        }
        return;
      }

      setIsLoadingShipping(true);
      setShippingLookupError(null);

      try {
        const res = await getShippingMethodsAction({
          country,
          city,
          state: formData.shippingState?.trim() || null,
        });

        if (cancelled) return;

        if (res.success && res.methods && res.methods.length > 0) {
          setShippingMethods(res.methods);
          setShippingLookupError(null);
          setSelectedShippingMethodId((prev) => {
            if (prev && res.methods.some((m) => m.id === prev)) {
              return prev;
            }
            return res.methods[0].id;
          });
        } else {
          setShippingMethods([]);
          setSelectedShippingMethodId(null);
          setShippingLookupError(res.error || "No shipping methods available for this address.");
        }
      } catch {
        if (!cancelled) {
          setShippingMethods([]);
          setSelectedShippingMethodId(null);
          setShippingLookupError("Failed to load shipping methods for this address.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingShipping(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [formData.shippingCity, formData.shippingCountry, formData.shippingState]);

  const handleInputChange = (field: keyof CheckoutFormValues, value: string | null) => {
    setFormData((current) => ({ ...current, [field]: value ?? "" }));
    setSubmissionError(null);
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponError(null);
    setIsApplyingCoupon(true);

    try {
      const result = await validateCouponAction(couponInput.trim());
      if (result.success && result.coupon) {
        setAppliedCoupon(result.coupon);
        handleInputChange("couponCode", result.coupon.code);
        setCouponError(null);
        toast.success(`Coupon "${result.coupon.code}" applied!`);
      } else {
        const msg = result.error || "Invalid coupon code.";
        setCouponError(msg);
        toast.error(msg);
      }
    } catch {
      setCouponError("Unable to apply coupon. Please try again.");
      toast.error("Unable to apply coupon. Please try again.");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
    handleInputChange("couponCode", null);
    toast.info("Coupon removed.");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting.current) return;
    setSubmissionError(null);

    if (!selectedShippingMethodId || shippingMethods.length === 0) {
      const msg =
        shippingLookupError || "Please select an eligible shipping method before placing your order.";
      setErrors((prev) => ({ ...prev, shippingMethodId: msg }));
      setSubmissionError(msg);
      toast.error(msg);
      return;
    }

    const submissionData = {
      ...formData,
      shippingMethodId: selectedShippingMethodId || undefined,
      couponCode: appliedCoupon?.code || (couponInput.trim() || undefined),
    };

    const parsed = checkoutSchema.safeParse(submissionData);
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
        const result = await createOrderAction(parsed.data, idempotencyKey.current);
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
        const displayMessage =
          result.correlationId &&
          safeMessage === "We could not place your order. Please review your details and try again."
            ? `${safeMessage} (Ref: ${result.correlationId})`
            : safeMessage;
        setSubmissionError(displayMessage);
        toast.error(displayMessage);
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
  const selectedMethod = shippingMethods.find((m) => m.id === selectedShippingMethodId);
  const shippingCost = selectedMethod ? selectedMethod.cost : 0;
  const itemsTotal = Math.max(0, cart.subtotal - (appliedCoupon?.discountAmount ?? 0));
  const grandTotal = selectedMethod ? itemsTotal + shippingCost : null;

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

            <div className="space-y-3 pt-2">
              <Label className="text-sm font-semibold">Shipping method</Label>
              {isLoadingShipping && (
                <div className="flex items-center gap-2 rounded-sm border border-border bg-[#F3F0E8]/40 p-3 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin text-[#101114]" />
                  <span>Calculating shipping options for your address...</span>
                </div>
              )}

              {!isLoadingShipping && shippingLookupError && (
                <div className="rounded-sm border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
                  {shippingLookupError}
                </div>
              )}

              {!isLoadingShipping && !shippingLookupError && shippingMethods.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Enter your delivery city and country to view available shipping options and rates.
                </p>
              )}

              {!isLoadingShipping && shippingMethods.length > 0 && (
                <div className="space-y-2">
                  {shippingMethods.map((method) => {
                    const isSelected = selectedShippingMethodId === method.id;
                    return (
                      <label
                        key={method.id}
                        className={`flex cursor-pointer items-center justify-between border p-3.5 transition-colors focus-within:ring-2 focus-within:ring-[#00D9FF] ${
                          isSelected
                            ? "border-[#101114] bg-[#F3F0E8]/60"
                            : "border-border bg-white hover:border-[#101114]/40"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shippingMethodSelection"
                            value={method.id}
                            checked={isSelected}
                            onChange={() => {
                              setSelectedShippingMethodId(method.id);
                              handleInputChange("shippingMethodId", method.id);
                            }}
                            className="size-4 accent-[#101114]"
                          />
                          <div>
                            <span className="block text-sm font-semibold text-[#101114]">
                              {method.name}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {method.zoneName}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-[#101114]">
                          {formatPrice(method.cost)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              {fieldError("shippingMethodId")}
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

          {/* Promo / Coupon Input */}
          <div className="border-t border-[#101114]/15 py-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Promo code
              </span>
              {appliedCoupon && (
                <span className="inline-flex items-center gap-1 rounded-sm border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  <Tag className="size-3" aria-hidden="true" />
                  Applied
                </span>
              )}
            </div>

            {appliedCoupon ? (
              <div className="flex items-center justify-between gap-2 rounded-sm border border-emerald-200 bg-white p-2.5">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#101114]">
                    {appliedCoupon.code}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {appliedCoupon.discountType === "PERCENTAGE"
                      ? `${appliedCoupon.discountValue}% off`
                      : `${formatPrice(appliedCoupon.discountValue)} off`}
                    {" · "}Saving {formatPrice(appliedCoupon.discountAmount)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  disabled={isPending || isApplyingCoupon}
                  className="px-2 py-1 text-xs font-medium text-destructive hover:underline disabled:opacity-50"
                  aria-label="Remove applied coupon"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="couponCode"
                    placeholder="ENTER CODE"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value.toUpperCase());
                      setCouponError(null);
                    }}
                    disabled={isPending || isApplyingCoupon}
                    aria-label="Coupon code"
                    className="h-9 rounded-sm border-[#101114]/20 bg-white font-mono text-xs uppercase tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={isPending || isApplyingCoupon || !couponInput.trim()}
                    className="inline-flex h-9 items-center justify-center bg-[#101114] px-3 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#101114]/85 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isApplyingCoupon ? (
                      <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      "Apply"
                    )}
                  </button>
                </div>
                {couponError && (
                  <p className="text-xs text-destructive" role="alert">
                    {couponError}
                  </p>
                )}
              </div>
            )}
          </div>

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
            {appliedCoupon && appliedCoupon.discountAmount > 0 && (
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <span>Coupon</span>
                  <span className="rounded bg-[#101114]/5 px-1 py-0.5 font-mono text-xs uppercase text-[#101114]">
                    {appliedCoupon.code}
                  </span>
                </dt>
                <dd className="font-medium text-emerald-600">
                  −{formatPrice(appliedCoupon.discountAmount)}
                </dd>
              </div>
            )}
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd className="max-w-44 text-right font-medium text-[#101114]">
                {isLoadingShipping ? (
                  <span className="text-muted-foreground">Calculating...</span>
                ) : selectedMethod ? (
                  <span>
                    {formatPrice(shippingCost)}
                    <span className="block text-xs font-normal text-muted-foreground">
                      {selectedMethod.name}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Select delivery address</span>
                )}
              </dd>
            </div>
          </dl>

          <div className="flex items-center justify-between gap-3 border-t border-[#101114]/15 pt-4">
            <span className="font-semibold">Items total</span>
            <span className="text-xl font-semibold tracking-tight">
              {formatPrice(itemsTotal)}
            </span>
          </div>
          <div className="mt-4 flex items-start justify-between gap-3 text-sm">
            <span className="font-semibold">Grand total</span>
            <span className="max-w-44 text-right text-lg font-bold text-[#101114]">
              {grandTotal !== null ? (
                formatPrice(grandTotal)
              ) : (
                <span className="text-sm font-medium text-muted-foreground">
                  Calculated after shipping selection
                </span>
              )}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {selectedMethod
              ? `Final order total includes ${formatPrice(shippingCost)} delivery fee.`
              : "Final order total includes the delivery charge calculated from your selected shipping method."}
          </p>

          <button
            type="submit"
            form="checkout-form"
            disabled={isPending || isLoadingShipping || !selectedShippingMethodId || shippingMethods.length === 0}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#101114] px-5 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#101114]/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
            {isPending
              ? "Placing order"
              : isLoadingShipping
                ? "Calculating shipping..."
                : !selectedShippingMethodId
                  ? "Select a shipping method"
                  : "Place order"}
          </button>
          {!selectedShippingMethodId && !isLoadingShipping && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Please enter your delivery city and select a shipping method above to place your order.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
