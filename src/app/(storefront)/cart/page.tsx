import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { CartPageContent } from "@/components/storefront/cart/cart-page-content";
import { getCart } from "@/lib/cart/queries";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shopping Cart",
  description: "View and manage items in your VibeLock shopping cart.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CartPage() {
  const cart = await getCart();

  return (
    <Section className="relative z-10 min-h-screen bg-white pt-[calc(5rem+var(--vl-announcement-h,0px))] pb-12 sm:pt-[calc(6rem+var(--vl-announcement-h,0px))] sm:pb-16 lg:pt-[calc(7rem+var(--vl-announcement-h,0px))] xl:pt-[calc(8rem+var(--vl-announcement-h,0px))]">
      <Container className="max-w-6xl">
        <CartPageContent cart={cart} />
      </Container>
    </Section>
  );
}
