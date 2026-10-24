import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCart } from "@/lib/cart/queries";
import { getStorefrontPaymentMethods } from "@/lib/settings/payment-settings";
import { CheckoutForm } from "@/components/storefront/checkout/checkout-form";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";

export const metadata: Metadata = {
  title: "Checkout | VibeLock",
  description: "Complete your VibeLock order.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CheckoutPage() {
  const session = await auth();

  if (!session?.user) {
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

  return (
    <Section className="bg-background min-h-screen pt-20 pb-12 sm:pt-24 sm:pb-16">
      <Container className="max-w-6xl">
        <div className="border-border mb-7 border-b pb-5 sm:mb-9 sm:pb-6">
          <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.2em] uppercase">
            VibeLock / Checkout
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#101114] sm:text-4xl">
            Checkout
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
            Add your contact and delivery details, then choose how you would like to pay.
          </p>
        </div>
        <CheckoutForm
          cart={cart}
          defaultEmail={session.user.email || ""}
          defaultName={session.user.name || ""}
          availablePaymentMethods={await getStorefrontPaymentMethods()}
        />
      </Container>
    </Section>
  );
}
