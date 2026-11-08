"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CreditCard,
  ImageOff,
  LoaderCircle,
  MessageSquare,
  ShieldCheck,
  Tag,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { CartDTO, CartItemDTO } from "@/lib/cart/types";
import {
  createOrderAction,
  getShippingMethodsAction,
  validateCouponAction,
} from "@/lib/checkout/actions";
import { checkoutSchema } from "@/lib/checkout/validation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select-native";
import { SelectableCard } from "@/components/shared/selectable-card";

// ── 64 Districts of Bangladesh ───────────────────────────────────────────────
const BD_DISTRICTS = [
  "Dhaka", // Placed first as the highest volume market
  "Chattogram",
  "Gazipur",
  "Narayanganj",
  "Sylhet",
  "Rajshahi",
  "Khulna",
  "Barishal",
  "Rangpur",
  "Mymensingh",
  "Cumilla",
  "Cox's Bazar",
  "Bogura",
  "Bagerhat",
  "Bandarban",
  "Barguna",
  "Bhola",
  "Brahmanbaria",
  "Chandpur",
  "Chapai Nawabganj",
  "Chuadanga",
  "Dinajpur",
  "Faridpur",
  "Feni",
  "Gaibandha",
  "Gopalganj",
  "Habiganj",
  "Jamalpur",
  "Jashore",
  "Jhalokathi",
  "Jhenaidah",
  "Joypurhat",
  "Khagrachhari",
  "Kishoreganj",
  "Kurigram",
  "Kushtia",
  "Lakshmipur",
  "Lalmonirhat",
  "Madaripur",
  "Magura",
  "Manikganj",
  "Meherpur",
  "Moulvibazar",
  "Munshiganj",
  "Naogaon",
  "Narail",
  "Narsingdi",
  "Natore",
  "Netrokona",
  "Nilphamari",
  "Noakhali",
  "Pabna",
  "Panchagarh",
  "Patuakhali",
  "Pirojpur",
  "Rajbari",
  "Rangamati",
  "Satkhira",
  "Shariatpur",
  "Sherpur",
  "Sirajganj",
  "Sunamganj",
  "Tangail",
  "Thakurgaon",
] as const;

interface CheckoutFormProps {
  cart: CartDTO;
  defaultEmail: string;
  defaultName: string;
  defaultPhone?: string;
  availablePaymentMethods?: Array<{
    value: "COD" | "ONLINE" | "BKASH" | "NAGAD";
    title: string;
    detail: string;
  }>;
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
    return "Your order was created, but the online payment session could not be started. You can complete payment from your orders page.";
  }
  if (
    error?.toLowerCase().includes("online payment is currently unavailable") ||
    error?.toLowerCase().includes("sslcommerz payment is currently unavailable")
  ) {
    return "SSLCOMMERZ payment is currently unavailable. Please choose cash on delivery.";
  }
  if (error?.toLowerCase().includes("bkash payment is currently unavailable")) {
    return "bKash payment is currently unavailable. Please choose another payment method.";
  }
  if (error?.toLowerCase().includes("nagad payment is currently unavailable")) {
    return "Nagad payment is currently unavailable. Please choose another payment method.";
  }
  if (
    error?.toLowerCase().includes("shipping") ||
    error?.toLowerCase().includes("delivery") ||
    error?.toLowerCase().includes("coupon") ||
    error?.toLowerCase().includes("minimum order")
  ) {
    return error;
  }
  if (error?.toLowerCase().includes("timed out") || error?.toLowerCase().includes("timeout")) {
    return "Checkout timed out while securing items. Please try again.";
  }
  return "We could not place your order. Please review your details and try again.";
}

function CheckoutSummaryItem({ item }: { item: CartItemDTO }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <li className="border-vl-black/8 grid grid-cols-[3.75rem_minmax(0,1fr)_auto] items-center gap-3 border-b py-3.5 last:border-b-0">
      <div className="bg-vl-white relative aspect-3/4 overflow-hidden rounded-xs">
        {item.productImage && !imageFailed ? (
          <Image
            src={item.productImage}
            alt={item.productName}
            fill
            sizes="60px"
            className="object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="text-muted-foreground absolute inset-0 flex items-center justify-center">
            <ImageOff className="size-4" aria-hidden="true" />
            <span className="sr-only">Image unavailable</span>
          </span>
        )}
      </div>

      <div className="min-w-0">
        <h3 className="text-vl-black truncate text-xs font-bold">{item.productName}</h3>
        <p className="text-muted-foreground text-compact mt-0.5 leading-tight">
          {[item.variant.size, item.variant.color].filter(Boolean).join(" · ") || "Standard"}
          {" · "}Qty {item.quantity}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          {formatPrice(item.variant.effectivePrice)}
          {item.variant.discountPrice !== null && (
            <span className="text-compact ml-1.5 line-through">
              {formatPrice(item.variant.sellingPrice)}
            </span>
          )}
        </p>
      </div>

      <span className="text-vl-black text-right text-xs font-bold">
        {formatPrice(item.lineTotal)}
      </span>
    </li>
  );
}

export function CheckoutForm({
  cart,
  defaultEmail,
  defaultName,
  defaultPhone = "",
  availablePaymentMethods,
}: CheckoutFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isSubmitting = useRef(false);
  const idempotencyKey = useRef(crypto.randomUUID());

  const paymentOptions =
    availablePaymentMethods !== undefined
      ? availablePaymentMethods
      : ([
          {
            value: "COD",
            title: "Cash on delivery",
            detail: "Pay in cash when you receive your drop at your doorstep.",
          },
          {
            value: "ONLINE",
            title: "SSLCOMMERZ",
            detail: "Instant payment via bKash, Nagad, debit/credit cards.",
          },
        ] as const);

  // Default to COD (highest volume BD preference, zero friction)
  const initialPayment =
    paymentOptions.find((p) => p.value === "COD")?.value ?? paymentOptions[0]?.value ?? "COD";

  // ── Ultra-Fast Form State (Only 4 Essential Fields!) ──
  const [customerName, setCustomerName] = useState(defaultName);
  const [customerPhone, setCustomerPhone] = useState(defaultPhone);
  const [shippingStreet, setShippingStreet] = useState("");
  const [shippingCity, setShippingCity] = useState(""); // District
  const [paymentMethod, setPaymentMethod] = useState<string>(initialPayment);

  // Optional toggles (hidden by default to avoid clutter)
  const [showNote, setShowNote] = useState(false);
  const [orderNote, setOrderNote] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [customerEmail, setCustomerEmail] = useState(defaultEmail);

  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // ── Coupon State ──
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: string;
    discountValue: number;
    discountAmount: number;
  } | null>(null);

  // ── Zero-Click Shipping State ──
  const [shippingMethods, setShippingMethods] = useState<
    Array<{ id: string; name: string; cost: number; zoneId: string; zoneName: string }>
  >([]);
  const [selectedShippingMethodId, setSelectedShippingMethodId] = useState<string | null>(null);
  const [isLoadingShipping, setIsLoadingShipping] = useState(false);
  const [shippingLookupError, setShippingLookupError] = useState<string | null>(null);

  // ── Instant Zero-Click Shipping Auto-Resolve on District Selection ──
  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      const city = shippingCity.trim();
      if (!city) {
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
          country: "Bangladesh",
          city,
        });

        if (cancelled) return;

        if (res.success && res.methods && res.methods.length > 0) {
          setShippingMethods(res.methods);
          setShippingLookupError(null);
          // ZERO-CLICK AUTO-SELECT: Automatically lock in the shipping rate!
          setSelectedShippingMethodId((prev) => {
            if (prev && res.methods.some((m) => m.id === prev)) {
              return prev;
            }
            return res.methods[0].id;
          });
        } else {
          setShippingMethods([]);
          setSelectedShippingMethodId(null);
          setShippingLookupError(res.error || "No shipping methods available for this district.");
        }
      } catch {
        if (!cancelled) {
          setShippingMethods([]);
          setSelectedShippingMethodId(null);
          setShippingLookupError("Failed to calculate shipping for this district.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingShipping(false);
        }
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [shippingCity]);

  // ── Coupon Handlers ──
  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponError(null);
    setIsApplyingCoupon(true);

    try {
      const result = await validateCouponAction(couponInput.trim());
      if (result.success && result.coupon) {
        setAppliedCoupon(result.coupon);
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
    toast.info("Coupon removed.");
  };

  // ── Order Submission ──
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting.current) return;
    setSubmissionError(null);

    // Required fields client check
    const validationErrors: Partial<Record<string, string>> = {};
    if (!customerName.trim() || customerName.trim().length < 2) {
      validationErrors.customerName = "Full name is required (minimum 2 characters)";
    }
    const cleanPhone = customerPhone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 11) {
      validationErrors.customerPhone = "Valid 11-digit mobile number required (e.g. 017XXXXXXXX)";
    }
    if (!shippingStreet.trim() || shippingStreet.trim().length < 5) {
      validationErrors.shippingStreet = "Please provide your detailed delivery address";
    }
    if (!shippingCity.trim()) {
      validationErrors.shippingCity = "Please select your delivery district";
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Please complete the required details.");
      return;
    }

    if (!selectedShippingMethodId || shippingMethods.length === 0) {
      const msg =
        shippingLookupError || "Please select your district to calculate delivery charge.";
      setErrors((prev) => ({ ...prev, shippingCity: msg }));
      toast.error(msg);
      return;
    }

    // Fallback email if user didn't enter one
    const resolvedEmail = customerEmail.trim() || defaultEmail || `${cleanPhone}@vibelock.customer`;

    const submissionData = {
      customerName: customerName.trim(),
      customerEmail: resolvedEmail,
      customerPhone: customerPhone.trim(),
      shippingStreet: shippingStreet.trim(),
      shippingCity: shippingCity.trim(),
      shippingCountry: "Bangladesh",
      deliveryNote: orderNote.trim() || undefined,
      paymentMethod: paymentMethod as "COD" | "ONLINE" | "BKASH" | "NAGAD",
      shippingMethodId: selectedShippingMethodId,
      couponCode: appliedCoupon?.code || undefined,
    };

    const parsed = checkoutSchema.safeParse(submissionData);
    if (!parsed.success) {
      const nextErrors: Partial<Record<string, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string") {
          nextErrors[field] = issue.message;
        }
      }
      setErrors(nextErrors);
      toast.error("Please check the highlighted fields.");
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

  const fieldError = (field: string) =>
    errors[field] ? (
      <p id={`${field}-error`} className="text-destructive text-xs font-medium" role="alert">
        {errors[field]}
      </p>
    ) : null;

  // ── Pricing Calculations ──
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
      {/* ── LEFT: 1-Page Express Checkout Form (VibeLock Design) ── */}
      <form id="checkout-form" onSubmit={handleSubmit} noValidate className="min-w-0 space-y-7">
        {submissionError && (
          <div
            className="border-destructive bg-destructive/5 text-destructive rounded-xs border-l-2 px-4 py-3 text-sm font-medium"
            role="alert"
          >
            {submissionError}
          </div>
        )}

        <fieldset disabled={isPending} className="min-w-0 space-y-7 disabled:opacity-80">
          {/* ── 1. Contact & Delivery Card ── */}
          <section
            aria-labelledby="delivery-heading"
            className="border-border bg-background rounded-xs border p-5 sm:p-6"
          >
            <div className="border-border flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <span className="bg-vl-black text-compact flex size-6 items-center justify-center rounded-full font-black text-white">
                  1
                </span>
                <h2
                  id="delivery-heading"
                  className="font-heading text-vl-black text-lg font-black tracking-tight uppercase"
                >
                  Delivery Details
                </h2>
              </div>
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <ShieldCheck className="text-vl-cyan size-4" />
                Fast Doorstep Delivery
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {/* Row 1: Full Name & Mobile Number */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="customerName"
                    className="text-vl-black/80 text-xs font-bold tracking-wider uppercase"
                  >
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="customerName"
                    variant="brand"
                    size="lg"
                    autoComplete="name"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      if (errors.customerName)
                        setErrors((prev) => ({ ...prev, customerName: undefined }));
                    }}
                    placeholder="Enter your name"
                    aria-invalid={Boolean(errors.customerName)}
                  />
                  {fieldError("customerName")}
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="customerPhone"
                    className="text-vl-black/80 text-xs font-bold tracking-wider uppercase"
                  >
                    Mobile Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="customerPhone"
                    variant="brand"
                    size="lg"
                    type="tel"
                    autoComplete="tel"
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value);
                      if (errors.customerPhone)
                        setErrors((prev) => ({ ...prev, customerPhone: undefined }));
                    }}
                    placeholder="01XXXXXXXXX"
                    aria-invalid={Boolean(errors.customerPhone)}
                    className="font-medium tracking-wide"
                  />
                  {fieldError("customerPhone")}
                </div>
              </div>

              {/* Row 2: Delivery Address */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="shippingStreet"
                  className="text-vl-black/80 text-xs font-bold tracking-wider uppercase"
                >
                  Full Address <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="shippingStreet"
                  variant="brand"
                  rows={2}
                  autoComplete="street-address"
                  value={shippingStreet}
                  onChange={(e) => {
                    setShippingStreet(e.target.value);
                    if (errors.shippingStreet)
                      setErrors((prev) => ({ ...prev, shippingStreet: undefined }));
                  }}
                  placeholder="House no, road no, block, area, and nearest landmark"
                  aria-invalid={Boolean(errors.shippingStreet)}
                  className="resize-none leading-relaxed"
                />
                {fieldError("shippingStreet")}
              </div>

              {/* Row 3: Country & District */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="shippingCountry"
                    className="text-vl-black/80 text-xs font-bold tracking-wider uppercase"
                  >
                    Country
                  </Label>
                  <Input
                    id="shippingCountry"
                    variant="brand"
                    size="lg"
                    readOnly
                    value="Bangladesh"
                    tabIndex={-1}
                    aria-readonly="true"
                    className="text-vl-black/70 cursor-not-allowed bg-neutral-100/70 select-none focus-visible:ring-0"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="shippingCity"
                    className="text-vl-black/80 text-xs font-bold tracking-wider uppercase"
                  >
                    Delivery District <span className="text-red-500">*</span>
                  </Label>
                  <NativeSelect
                    id="shippingCity"
                    variant="brand"
                    size="lg"
                    value={shippingCity}
                    onChange={(e) => {
                      setShippingCity(e.target.value);
                      if (errors.shippingCity)
                        setErrors((prev) => ({ ...prev, shippingCity: undefined }));
                    }}
                    aria-invalid={Boolean(errors.shippingCity)}
                    className={!shippingCity ? "text-neutral-400" : ""}
                  >
                    <option value="" disabled>
                      Select your district
                    </option>
                    {BD_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </NativeSelect>
                  {fieldError("shippingCity")}
                </div>
              </div>

              {/* ── SHIPPING METHOD SELECTION (Auto-loads on district; selectable when multiple options exist!) ── */}
              {shippingCity && (
                <div className="mt-2 transition-all duration-200">
                  {isLoadingShipping ? (
                    <div className="border-border text-muted-foreground flex items-center gap-2.5 rounded-xs border bg-vl-white-300/50 p-3 text-xs font-medium">
                      <LoaderCircle className="text-vl-cyan size-4 animate-spin" />
                      <span>Calculating shipping to {shippingCity}...</span>
                    </div>
                  ) : shippingLookupError ? (
                    <div className="border-destructive/20 bg-destructive/5 text-destructive rounded-xs border p-3 text-xs">
                      {shippingLookupError}
                    </div>
                  ) : shippingMethods.length > 1 ? (
                    <div
                      className="space-y-2"
                      role="radiogroup"
                      aria-labelledby="delivery-speed-label"
                    >
                      <Label
                        id="delivery-speed-label"
                        className="text-vl-black/80 text-xs font-bold tracking-wider uppercase"
                      >
                        Select Delivery Speed <span className="text-red-500">*</span>
                      </Label>
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {shippingMethods.map((method) => {
                          const isSelected = selectedShippingMethodId === method.id;
                          return (
                            <SelectableCard
                              key={method.id}
                              name="shippingMethodSelection"
                              value={method.id}
                              checked={isSelected}
                              size="sm"
                              withRing={true}
                              onChange={() => {
                                setSelectedShippingMethodId(method.id);
                                if (errors.shippingCity) {
                                  setErrors((prev) => ({ ...prev, shippingCity: undefined }));
                                }
                              }}
                              title={
                                <span className="text-vl-black block text-xs font-bold uppercase">
                                  {method.name}
                                </span>
                              }
                              description={
                                <span className="text-muted-foreground text-compact block">
                                  {method.zoneName} · Doorstep
                                </span>
                              }
                              trailing={
                                <span className="text-vl-black shrink-0 text-xs font-black">
                                  {formatPrice(method.cost)}
                                </span>
                              }
                            />
                          );
                        })}
                      </div>
                    </div>
                  ) : shippingMethods.length === 1 && selectedMethod ? (
                    <div className="border-vl-black/15 flex items-center justify-between rounded-xs border bg-vl-white-300/70 px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-vl-black flex size-6 items-center justify-center rounded-full text-white">
                          <Check className="size-3.5 stroke-[2.5]" />
                        </div>
                        <div>
                          <p className="text-vl-black text-xs font-bold uppercase">
                            {selectedMethod.name}
                          </p>
                          <p className="text-muted-foreground text-compact">
                            {selectedMethod.zoneName} · Steadfast Courier
                          </p>
                        </div>
                      </div>
                      <span className="text-vl-black text-sm font-black">
                        {formatPrice(selectedMethod.cost)}
                      </span>
                    </div>
                  ) : null}
                </div>
              )}

              {/* ── Optional Extras (Delivery Note & Email Update) ── */}
              <div className="pt-1">
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  {!showNote && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => setShowNote(true)}
                      className="text-muted-foreground hover:text-vl-black h-auto p-0 text-xs font-medium hover:underline"
                    >
                      <MessageSquare className="size-3.5" />+ Add Delivery Instructions / Note
                    </Button>
                  )}
                  {!showEmail && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => setShowEmail(true)}
                      className="text-muted-foreground hover:text-vl-black h-auto p-0 text-xs font-medium hover:underline"
                    >
                      {defaultEmail ? "+ Update Email Address" : "+ Add Email for Order Updates"}
                    </Button>
                  )}
                </div>

                {showNote && (
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="orderNote"
                        className="text-compact text-vl-black/70 font-bold uppercase"
                      >
                        Delivery Instructions / Note (Optional)
                      </Label>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => {
                          setOrderNote("");
                          setShowNote(false);
                        }}
                        className="text-muted-foreground hover:text-vl-black text-compact h-auto p-0"
                      >
                        Cancel
                      </Button>
                    </div>
                    <Textarea
                      id="orderNote"
                      variant="brand"
                      size="sm"
                      rows={2}
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value.slice(0, 200))}
                      placeholder="e.g. Call before delivery, building name, landmark, gate code"
                      className="border-vl-black/20 rounded-xs bg-white text-xs leading-relaxed"
                    />
                    <div className="flex justify-end">
                      <span className="text-muted-foreground text-3xs">{orderNote.length}/200</span>
                    </div>
                  </div>
                )}

                {showEmail && (
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="customerEmail"
                        className="text-compact text-vl-black/70 font-bold uppercase"
                      >
                        Email Address (Optional)
                      </Label>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => setShowEmail(false)}
                        className="text-muted-foreground hover:text-vl-black text-compact h-auto p-0"
                      >
                        Cancel
                      </Button>
                    </div>
                    <Input
                      id="customerEmail"
                      variant="brand"
                      size="lg"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="your.email@example.com"
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── 2. Payment Method Card (COD Pre-selected by Default) ── */}
          <section
            aria-labelledby="payment-heading"
            className="border-border bg-background rounded-xs border p-5 sm:p-6"
          >
            <div className="border-border flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <span className="bg-vl-black text-compact flex size-6 items-center justify-center rounded-full font-black text-white">
                  2
                </span>
                <h2
                  id="payment-heading"
                  className="font-heading text-vl-black text-lg font-black tracking-tight uppercase"
                >
                  Payment Method
                </h2>
              </div>
              <span className="text-muted-foreground text-xs font-medium">
                100% Secure Checkout
              </span>
            </div>

            {paymentOptions.length === 0 ? (
              <div
                role="alert"
                className="mt-4 rounded-xs border border-amber-300 bg-amber-50 p-4 text-xs font-semibold text-amber-900"
              >
                Checkout is currently unavailable as no payment methods are active. Please contact
                support.
              </div>
            ) : (
              <fieldset className="mt-5 space-y-3">
                <legend className="sr-only">Choose a payment method</legend>
                {paymentOptions.map((method) => {
                  const isSelected = paymentMethod === method.value;
                  return (
                    <SelectableCard
                      key={method.value}
                      name="paymentMethod"
                      value={method.value}
                      checked={isSelected}
                      size="default"
                      onChange={() => setPaymentMethod(method.value)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-vl-black text-sm font-bold">{method.title}</span>
                          {method.value === "COD" && (
                            <Badge variant="outline" size="sm">
                              Popular in BD
                            </Badge>
                          )}
                          {method.value === "ONLINE" && (
                            <span className="text-compact flex items-center gap-1 font-semibold text-neutral-500">
                              <CreditCard className="size-3.5" />
                              Cards / Mobile Banking (SSLCOMMERZ)
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                          {method.detail}
                        </p>
                      </div>
                    </SelectableCard>
                  );
                })}
              </fieldset>
            )}
          </section>
        </fieldset>
      </form>

      {/* ── RIGHT: Order Summary Sidebar (VibeLock Design) ── */}
      <aside
        aria-labelledby="checkout-summary-heading"
        className="lg:sticky lg:top-24 lg:self-start"
      >
        <div className="border-border bg-background rounded-xs border p-5 shadow-xs sm:p-6">
          <div className="border-vl-black/12 border-b pb-4">
            <h2
              id="checkout-summary-heading"
              className="font-heading text-vl-black text-lg font-black tracking-tight uppercase"
            >
              Order Summary
            </h2>
            <p className="text-muted-foreground mt-1 text-xs">
              {cart.totalQuantity} {cart.totalQuantity === 1 ? "item" : "items"} in your drop
            </p>
          </div>

          {/* Items List */}
          <ul className="max-h-80 divide-y-0 overflow-y-auto pr-1" aria-label="Items in your order">
            {cart.items.map((item) => (
              <CheckoutSummaryItem key={item.id} item={item} />
            ))}
          </ul>

          {/* Promo Code Box */}
          <div className="border-vl-black/12 border-t py-3.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-muted-foreground text-compact font-bold tracking-[0.14em] uppercase">
                Promo Code
              </span>
              {appliedCoupon && (
                <span className="text-2xs inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 uppercase">
                  <Tag className="size-3" aria-hidden="true" />
                  Applied
                </span>
              )}
            </div>

            {appliedCoupon ? (
              <div className="flex items-center justify-between gap-2 rounded-xs border border-emerald-200 bg-emerald-50/50 p-2.5">
                <div className="min-w-0">
                  <p className="text-vl-black font-mono text-xs font-bold tracking-wider uppercase">
                    {appliedCoupon.code}
                  </p>
                  <p className="text-muted-foreground text-compact">
                    {appliedCoupon.discountType === "PERCENTAGE"
                      ? `${appliedCoupon.discountValue}% off`
                      : `${formatPrice(appliedCoupon.discountValue)} off`}
                    {" · "}Saved {formatPrice(appliedCoupon.discountAmount)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleRemoveCoupon}
                  disabled={isPending || isApplyingCoupon}
                  className="text-destructive hover:bg-destructive/10 size-6 rounded-full"
                  aria-label="Remove applied coupon"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <Input
                    id="couponCode"
                    variant="brand"
                    placeholder="ENTER CODE"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value.toUpperCase());
                      setCouponError(null);
                    }}
                    disabled={isPending || isApplyingCoupon}
                    aria-label="Coupon code"
                    className="font-mono tracking-wider uppercase"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleApplyCoupon}
                    disabled={isPending || isApplyingCoupon || !couponInput.trim()}
                    loading={isApplyingCoupon}
                    className="h-9 px-3.5"
                  >
                    Apply
                  </Button>
                </div>
                {couponError && (
                  <p className="text-destructive text-xs" role="alert">
                    {couponError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Pricing Breakdown */}
          <dl className="border-vl-black/12 space-y-2.5 border-t py-3.5 text-xs">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="text-vl-black font-semibold">{formatPrice(subtotalBeforeDiscount)}</dd>
            </div>
            {discountTotal > 0 && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Item Discount</dt>
                <dd className="text-vl-black font-semibold">−{formatPrice(discountTotal)}</dd>
              </div>
            )}
            {appliedCoupon && appliedCoupon.discountAmount > 0 && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground flex items-center gap-1.5">
                  <span>Coupon ({appliedCoupon.code})</span>
                </dt>
                <dd className="font-bold text-emerald-600">
                  −{formatPrice(appliedCoupon.discountAmount)}
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd className="text-vl-black text-right font-semibold">
                {isLoadingShipping ? (
                  <span className="text-muted-foreground text-compact">Calculating...</span>
                ) : selectedMethod ? (
                  <span>
                    {formatPrice(shippingCost)}
                    <span className="text-muted-foreground text-2xs ml-1 font-normal">
                      ({selectedMethod.name})
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground text-compact">Select district</span>
                )}
              </dd>
            </div>
          </dl>

          {/* Total */}
          <div className="border-vl-black/15 border-t pt-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-heading text-vl-black text-sm font-black uppercase">
                Total to Pay
              </span>
              <span className="text-vl-black text-xl font-black tracking-tight">
                {grandTotal !== null ? (
                  formatPrice(grandTotal)
                ) : (
                  <span>
                    {formatPrice(itemsTotal)}{" "}
                    <span className="text-muted-foreground text-xs font-normal">+ shipping</span>
                  </span>
                )}
              </span>
            </div>
            <p className="text-muted-foreground text-compact mt-1">
              {selectedMethod
                ? `Includes ${formatPrice(shippingCost)} delivery fee to ${shippingCity}.`
                : "Select district on the left to confirm total delivery charge."}
            </p>
          </div>

          {/* ── BIG PRIMARY ACTION BUTTON ── */}
          <Button
            type="submit"
            form="checkout-form"
            size="lg"
            fullWidth
            loading={isPending}
            disabled={isPending || paymentOptions.length === 0}
            className="mt-5"
          >
            {isPending
              ? "Confirming Order…"
              : paymentOptions.length === 0
                ? "Payment unavailable"
                : !shippingCity
                  ? "Select District to Order"
                  : paymentMethod === "COD"
                    ? "Place Order (Cash on Delivery)"
                    : "Pay via SSLCOMMERZ"}
          </Button>

          {paymentOptions.length === 0 ? (
            <p className="text-muted-foreground text-2xs mt-2.5 text-center tracking-wider text-amber-600 uppercase">
              Orders cannot be placed right now because no payment methods are currently active.
            </p>
          ) : (
            <p className="text-muted-foreground text-2xs mt-2.5 text-center tracking-wider uppercase">
              No advance payment needed for Cash on Delivery
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
