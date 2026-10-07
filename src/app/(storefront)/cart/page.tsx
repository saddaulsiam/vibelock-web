import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shopping Cart",
  description: "View items in your VibeLock shopping cart.",
};

export default function CartPage() {
  return (
    <Container className="py-24 md:py-32 flex flex-col items-center justify-center text-center">
      <div className="max-w-md space-y-6">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Your Cart</h1>
        <p className="text-muted-foreground">
          Your shopping cart is currently empty. Explore our latest streetwear collections to find
          pieces crafted for you.
        </p>
        <div className="pt-4">
          <Link href="/">
            <Button size="lg">Explore VibeLock</Button>
          </Link>
        </div>
      </div>
    </Container>
  );
}
