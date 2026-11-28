import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getCart } from "@/lib/cart/queries";
import { getStorefrontPaymentMethods } from "@/lib/settings/payment-settings";
import { getCheckoutSettings } from "@/lib/settings/checkout-settings";
import { getStorefrontLoyaltyInfo } from "@/lib/settings/loyalty-settings";
import { CheckoutForm } from "@/components/storefront/checkout/checkout-form";
import { MetaInitiateCheckout } from "@/components/storefront/analytics/meta-initiate-checkout";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your VibeLock order.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CheckoutPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?callbackUrl=/checkout");
  }

  const cart = await getCart();

  if (!cart || cart.items.length === 0) {
    redirect("/cart");
  }

  // Pre-validate that all items are actually available
  const hasUnavailableItems = cart.items.some(
    (item) => !item.variant.available || item.quantity > item.availableQuantity
  );

  if (hasUnavailableItems) {
    redirect("/cart?error=unavailable-items");
  }

  const [paymentMethods, { settings: checkoutPolicies }, loyaltyInfo] = await Promise.all([
    getStorefrontPaymentMethods(cart.subtotal),
    getCheckoutSettings(),
    getStorefrontLoyaltyInfo(user.id, user.phone),
  ]);

  const isBelowMinimum = cart.subtotal < checkoutPolicies.minOrderValue;

  return (
    <Section className="relative z-10 min-h-screen bg-white pt-[calc(5rem+var(--vl-announcement-h,0px))] pb-12 sm:pt-[calc(6rem+var(--vl-announcement-h,0px))] sm:pb-16 lg:pt-[calc(7rem+var(--vl-announcement-h,0px))] xl:pt-[calc(8rem+var(--vl-announcement-h,0px))]">
      <MetaInitiateCheckout
        cartId={cart.id}
        totalQuantity={cart.totalQuantity}
        subtotal={cart.subtotal}
        items={cart.items.map((item) => ({
          id: item.variant.id,
          quantity: item.quantity,
          price: item.variant.effectivePrice,
          name: item.productName,
        }))}
      />
      <Container className="max-w-6xl">
        {/* ── Minimum Order Value Policy Banner ── */}
        {isBelowMinimum && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200">
            <p className="text-sm font-semibold">Minimum Order Value Not Met</p>
            <p className="mt-1 text-xs">
              Store policy requires a minimum order subtotal of ৳
              {checkoutPolicies.minOrderValue.toLocaleString("en-BD")}. Your current cart subtotal is ৳
              {cart.subtotal.toLocaleString("en-BD")}. Please add more items to your cart before placing an order.
            </p>
          </div>
        )}

        {/* ── Clean & Minimal Top Bar (Matching Cart Page) ── */}
        <div className="border-border/50 mb-6 flex items-baseline justify-between border-b pb-4 sm:mb-8">
          <div className="flex items-baseline gap-2.5">
            <h1 className="font-heading text-vl-dark-900 text-xl font-bold tracking-tight uppercase sm:text-2xl">
              Checkout
            </h1>
            <span className="text-vl-dark-500 font-mono text-xs font-semibold">
              ({cart.totalQuantity})
            </span>
          </div>

          <Link
            href="/cart"
            className="text-vl-dark-600 hover:text-vl-dark-900 group inline-flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase transition-colors"
          >
            <ArrowLeft
              className="size-3.5 transition-transform group-hover:-translate-x-1"
              aria-hidden="true"
            />
            <span>Return to Cart</span>
          </Link>
        </div>
        <CheckoutForm
          cart={cart}
          defaultEmail={user.email || ""}
          defaultName={user.name || ""}
          defaultPhone={user.phone || ""}
          availablePaymentMethods={paymentMethods}
          checkoutPolicies={checkoutPolicies}
          loyaltyInfo={loyaltyInfo}
        />
      </Container>
    </Section>
  );
}
