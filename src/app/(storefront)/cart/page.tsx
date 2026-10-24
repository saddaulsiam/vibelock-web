import { Metadata } from "next";
import { getCart } from "@/lib/cart/queries";
import { CartPageContent } from "@/components/storefront/cart/cart-page-content";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";

export const metadata: Metadata = {
  title: "Shopping Cart | VibeLock",
  description: "View and manage items in your VibeLock shopping cart.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CartPage() {
  const cart = await getCart();

  return (
    <Section className="bg-background min-h-screen pt-20 pb-12 sm:pt-24 sm:pb-16">
      <Container className="max-w-6xl">
        <CartPageContent cart={cart} />
      </Container>
    </Section>
  );
}
