"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
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
    <li className="grid grid-cols-[3.75rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-vl-black/8 py-3.5 last:border-b-0">
      <div className="relative aspect-3/4 overflow-hidden rounded-xs bg-vl-white">
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
        <h3 className="truncate text-xs font-bold text-vl-black">{item.productName}</h3>
        <p className="text-muted-foreground mt-0.5 text-compact leading-tight">
          {[item.variant.size, item.variant.color].filter(Boolean).join(" · ") || "Standard"}
          {" · "}Qty {item.quantity}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          {formatPrice(item.variant.effectivePrice)}
          {item.variant.discountPrice !== null && (
            <span className="ml-1.5 text-compact line-through">
              {formatPrice(item.variant.sellingPrice)}
            </span>
          )}
        </p>
      </div>

      <span className="text-right text-xs font-bold text-vl-black">
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
                <span className="bg-vl-black flex size-6 items-center justify-center rounded-full text-compact font-black text-white">
                  1
                </span>
                <h2
                  id="delivery-heading"
                  className="font-heading text-lg font-black tracking-tight text-vl-black uppercase"
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
                    className="text-xs font-bold tracking-wider text-vl-black/80 uppercase"
                  >
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="customerName"
                    autoComplete="name"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      if (errors.customerName)
                        setErrors((prev) => ({ ...prev, customerName: undefined }));
                    }}
                    placeholder="Enter your name"
                    aria-invalid={Boolean(errors.customerName)}
                    className="h-11 rounded-xs border-vl-black/20 bg-white px-3.5 text-sm"
                  />
                  {fieldError("customerName")}
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="customerPhone"
                    className="text-xs font-bold tracking-wider text-vl-black/80 uppercase"
                  >
                    Mobile Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="customerPhone"
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
                    className="h-11 rounded-xs border-vl-black/20 bg-white px-3.5 text-sm font-medium tracking-wide"
                  />
                  {fieldError("customerPhone")}
                </div>
              </div>

              {/* Row 2: Delivery Address */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="shippingStreet"
                  className="text-xs font-bold tracking-wider text-vl-black/80 uppercase"
                >
                  Full Address <span className="text-red-500">*</span>
                </Label>
                <textarea
                  id="shippingStreet"
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
                  className="w-full resize-none rounded-xs border border-vl-black/20 bg-white px-3.5 py-2.5 text-sm leading-relaxed transition-colors placeholder:text-neutral-400 hover:border-vl-black/40 focus:ring-2 focus:ring-vl-cyan focus:outline-none"
                />
                {fieldError("shippingStreet")}
              </div>

              {/* Row 3: Country & District */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="shippingCountry"
                    className="text-xs font-bold tracking-wider text-vl-black/80 uppercase"
                  >
                    Country
                  </Label>
                  <Input
                    id="shippingCountry"
                    readOnly
                    value="Bangladesh"
                    tabIndex={-1}
                    aria-readonly="true"
                    className="h-11 rounded-xs border-vl-black/20 bg-neutral-100/70 px-3.5 text-sm font-medium text-vl-black/70 cursor-not-allowed select-none focus-visible:ring-0 focus-visible:border-vl-black/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="shippingCity"
                    className="text-xs font-bold tracking-wider text-vl-black/80 uppercase"
                  >
                    Delivery District <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <select
                      id="shippingCity"
                      value={shippingCity}
                      onChange={(e) => {
                        setShippingCity(e.target.value);
                        if (errors.shippingCity)
                          setErrors((prev) => ({ ...prev, shippingCity: undefined }));
                      }}
                      aria-invalid={Boolean(errors.shippingCity)}
                      className={`h-11 w-full cursor-pointer appearance-none rounded-xs border bg-white px-3.5 pr-10 text-sm font-medium transition-colors focus:ring-2 focus:ring-vl-cyan focus:outline-none ${
                        errors.shippingCity
                          ? "border-destructive text-vl-black"
                          : "border-vl-black/20 text-vl-black hover:border-vl-black/40"
                      } ${!shippingCity ? "text-neutral-400" : ""}`}
                    >
                      <option value="" disabled>
                        Select your district
                      </option>
                      {BD_DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-neutral-400">
                      <ChevronDown className="size-4" />
                    </div>
                  </div>
                  {fieldError("shippingCity")}
                </div>
              </div>

              {/* ── SHIPPING METHOD SELECTION (Auto-loads on district; selectable when multiple options exist!) ── */}
              {shippingCity && (
                <div className="mt-2 transition-all duration-200">
                  {isLoadingShipping ? (
                    <div className="border-border text-muted-foreground flex items-center gap-2.5 rounded-xs border bg-[#F3F0E8]/50 p-3 text-xs font-medium">
                      <LoaderCircle className="text-vl-cyan size-4 animate-spin" />
                      <span>Calculating shipping to {shippingCity}...</span>
                    </div>
                  ) : shippingLookupError ? (
                    <div className="border-destructive/20 bg-destructive/5 text-destructive rounded-xs border p-3 text-xs">
                      {shippingLookupError}
                    </div>
                  ) : shippingMethods.length > 1 ? (
                    <div className="space-y-2" role="radiogroup" aria-labelledby="delivery-speed-label">
                      <Label id="delivery-speed-label" className="text-xs font-bold tracking-wider text-vl-black/80 uppercase">
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
                                <span className="block text-xs font-bold text-vl-black uppercase">
                                  {method.name}
                                </span>
                              }
                              description={
                                <span className="text-muted-foreground block text-compact">
                                  {method.zoneName} · Doorstep
                                </span>
                              }
                              trailing={
                                <span className="shrink-0 text-xs font-black text-vl-black">
                                  {formatPrice(method.cost)}
                                </span>
                              }
                            />
                          );
                        })}
                      </div>
                    </div>
                  ) : shippingMethods.length === 1 && selectedMethod ? (
                    <div className="border-vl-black/15 flex items-center justify-between rounded-xs border bg-[#F3F0E8]/70 px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-vl-black flex size-6 items-center justify-center rounded-full text-white">
                          <Check className="size-3.5 stroke-[2.5]" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-vl-black uppercase">
                            {selectedMethod.name}
                          </p>
                          <p className="text-muted-foreground text-compact">
                            {selectedMethod.zoneName} · Steadfast Courier
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-black text-vl-black">
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
                    <button
                      type="button"
                      onClick={() => setShowNote(true)}
                      className="text-muted-foreground hover:text-vl-black inline-flex items-center gap-1.5 font-medium transition-colors hover:underline"
                    >
                      <MessageSquare className="size-3.5" />+ Add Delivery Instructions / Note
                    </button>
                  )}
                  {!showEmail && (
                    <button
                      type="button"
                      onClick={() => setShowEmail(true)}
                      className="text-muted-foreground hover:text-vl-black inline-flex items-center gap-1.5 font-medium transition-colors hover:underline"
                    >
                      {defaultEmail ? "+ Update Email Address" : "+ Add Email for Order Updates"}
                    </button>
                  )}
                </div>

                {showNote && (
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="orderNote"
                        className="text-compact font-bold text-vl-black/70 uppercase"
                      >
                        Delivery Instructions / Note (Optional)
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          setOrderNote("");
                          setShowNote(false);
                        }}
                        className="text-muted-foreground hover:text-vl-black text-compact"
                      >
                        Cancel
                      </button>
                    </div>
                    <Textarea
                      id="orderNote"
                      variant="brand"
                      size="sm"
                      rows={2}
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value.slice(0, 200))}
                      placeholder="e.g. Call before delivery, building name, landmark, gate code"
                      className="rounded-xs border-vl-black/20 bg-white text-xs leading-relaxed"
                    />
                    <div className="flex justify-end">
                      <span className="text-muted-foreground text-3xs">
                        {orderNote.length}/200
                      </span>
                    </div>
                  </div>
                )}

                {showEmail && (
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="customerEmail"
                        className="text-compact font-bold text-vl-black/70 uppercase"
                      >
                        Email Address (Optional)
                      </Label>
                      <button
                        type="button"
                        onClick={() => setShowEmail(false)}
                        className="text-muted-foreground hover:text-vl-black text-compact"
                      >
                        Cancel
                      </button>
                    </div>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="h-10 rounded-xs border-vl-black/20 bg-white text-xs"
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
                <span className="bg-vl-black flex size-6 items-center justify-center rounded-full text-compact font-black text-white">
                  2
                </span>
                <h2
                  id="payment-heading"
                  className="font-heading text-lg font-black tracking-tight text-vl-black uppercase"
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
                Checkout is currently unavailable as no payment methods are active. Please contact support.
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
                          <span className="text-sm font-bold text-vl-black">{method.title}</span>
                          {method.value === "COD" && (
                            <span className="bg-vl-black/5 rounded-full px-2 py-0.5 text-2xs font-bold tracking-wider text-vl-black uppercase">
                              Popular in BD
                            </span>
                          )}
                          {method.value === "ONLINE" && (
                            <span className="flex items-center gap-1 text-compact font-semibold text-neutral-500">
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
          <div className="border-b border-vl-black/12 pb-4">
            <h2
              id="checkout-summary-heading"
              className="font-heading text-lg font-black tracking-tight text-vl-black uppercase"
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
          <div className="border-t border-vl-black/12 py-3.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-muted-foreground text-compact font-bold tracking-[0.14em] uppercase">
                Promo Code
              </span>
              {appliedCoupon && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-2xs font-bold text-emerald-700 uppercase">
                  <Tag className="size-3" aria-hidden="true" />
                  Applied
                </span>
              )}
            </div>

            {appliedCoupon ? (
              <div className="flex items-center justify-between gap-2 rounded-xs border border-emerald-200 bg-emerald-50/50 p-2.5">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-bold tracking-wider text-vl-black uppercase">
                    {appliedCoupon.code}
                  </p>
                  <p className="text-muted-foreground text-compact">
                    {appliedCoupon.discountType === "PERCENTAGE"
                      ? `${appliedCoupon.discountValue}% off`
                      : `${formatPrice(appliedCoupon.discountValue)} off`}
                    {" · "}Saved {formatPrice(appliedCoupon.discountAmount)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  disabled={isPending || isApplyingCoupon}
                  className="text-destructive hover:bg-destructive/10 rounded-full p-1 transition-colors"
                  aria-label="Remove applied coupon"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
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
                    className="h-9 rounded-xs border-vl-black/20 bg-white font-mono text-xs tracking-wider uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={isPending || isApplyingCoupon || !couponInput.trim()}
                    className="inline-flex h-9 items-center justify-center rounded-xs bg-vl-black px-3.5 text-xs font-bold tracking-wider text-white uppercase transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isApplyingCoupon ? (
                      <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      "Apply"
                    )}
                  </button>
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
          <dl className="space-y-2.5 border-t border-vl-black/12 py-3.5 text-xs">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-semibold text-vl-black">
                {formatPrice(subtotalBeforeDiscount)}
              </dd>
            </div>
            {discountTotal > 0 && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Item Discount</dt>
                <dd className="font-semibold text-vl-black">−{formatPrice(discountTotal)}</dd>
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
              <dd className="text-right font-semibold text-vl-black">
                {isLoadingShipping ? (
                  <span className="text-muted-foreground text-compact">Calculating...</span>
                ) : selectedMethod ? (
                  <span>
                    {formatPrice(shippingCost)}
                    <span className="text-muted-foreground ml-1 text-2xs font-normal">
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
          <div className="border-t border-vl-black/15 pt-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-heading text-sm font-black text-vl-black uppercase">
                Total to Pay
              </span>
              <span className="text-xl font-black tracking-tight text-vl-black">
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
            <p className="text-muted-foreground mt-1 text-compact">
              {selectedMethod
                ? `Includes ${formatPrice(shippingCost)} delivery fee to ${shippingCity}.`
                : "Select district on the left to confirm total delivery charge."}
            </p>
          </div>

          {/* ── BIG PRIMARY ACTION BUTTON ── */}
          <button
            type="submit"
            form="checkout-form"
            disabled={isPending || paymentOptions.length === 0}
            className="font-heading bg-vl-black text-vl-white focus-visible:ring-vl-cyan mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xs px-5 text-xs font-black tracking-widest uppercase transition-all duration-200 hover:bg-black hover:shadow-[0_0_24px_rgba(0,217,255,0.25)] focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
            {isPending
              ? "Confirming Order…"
              : paymentOptions.length === 0
                ? "Payment unavailable"
                : !shippingCity
                  ? "Select District to Order"
                  : paymentMethod === "COD"
                    ? "Place Order (Cash on Delivery)"
                    : "Pay via SSLCOMMERZ"}
          </button>

          {paymentOptions.length === 0 ? (
            <p className="text-muted-foreground mt-2.5 text-center text-2xs tracking-wider text-amber-600 uppercase">
              Orders cannot be placed right now because no payment methods are currently active.
            </p>
          ) : (
            <p className="text-muted-foreground mt-2.5 text-center text-2xs tracking-wider uppercase">
              No advance payment needed for Cash on Delivery
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
