import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCart } from "@/lib/cart/queries";
import { CheckoutForm } from "@/components/storefront/checkout/checkout-form";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";

export const metadata: Metadata = {
  title: "Checkout | VibeLock",
  description: "Secure checkout for VibeLock.",
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
    <Section className="py-8 bg-background min-h-screen">
      <Container>
        <div className="mb-8 border-b pb-4">
          <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
        </div>
        <CheckoutForm
          cart={cart}
          defaultEmail={session.user.email || ""}
          defaultName={session.user.name || ""}
        />
      </Container>
    </Section>
  );
}
