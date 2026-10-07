import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import prisma from "@/lib/prisma/client";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Order Success | VibeLock",
  robots: {
    index: false,
    follow: false,
  },
};

interface OrderSuccessPageProps {
  params: Promise<{
    orderNumber: string;
  }>;
}

export default async function OrderSuccessPage({ params }: OrderSuccessPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { orderNumber } = await params;

  const order = await prisma.order.findUnique({
    where: {
      orderNumber,
      userId: session.user.id, // Strict ownership enforcement
    },
    include: {
      items: true,
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <Section className="py-12 bg-background min-h-screen">
      <Container className="max-w-3xl">
        <div className="bg-white border rounded-2xl p-8 md:p-12 text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle2 className="h-20 w-20 text-green-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Order Confirmed!</h1>
            <p className="text-muted-foreground text-lg">
              Thank you for shopping with VibeLock. Your order{" "}
              <span className="font-semibold text-foreground">#{order.orderNumber}</span> has been
              received.
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-6 text-left space-y-6 mt-8">
            <div>
              <h2 className="text-lg font-bold border-b pb-2 mb-4">Order Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-1">Customer</span>
                  <p className="font-medium">{order.customerName}</p>
                  <p>{order.customerEmail}</p>
                  <p>{order.customerPhone}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Shipping Address</span>
                  <p className="font-medium">{order.shippingStreet}</p>
                  <p>
                    {order.shippingCity}, {order.shippingZip}
                  </p>
                  <p>{order.shippingCountry}</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold border-b pb-2 mb-4">Items Summary</h2>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <div className="font-medium">৳{Number(item.lineTotal).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4 flex justify-between items-center">
              <span className="font-bold">Total Amount</span>
              <span className="text-xl font-bold">৳{Number(order.total).toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center text-sm pt-2">
              <span className="text-muted-foreground">Payment Method</span>
              <span className="font-medium uppercase">{order.paymentMethod}</span>
            </div>

            <div className="flex justify-between items-center text-sm pt-2">
              <span className="text-muted-foreground">Payment Status</span>
              <span
                className={`font-bold uppercase ${
                  order.paymentStatus === "SUCCESS"
                    ? "text-green-600"
                    : order.paymentStatus === "FAILED"
                      ? "text-red-600"
                      : "text-yellow-600"
                }`}
              >
                {order.paymentStatus}
              </span>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={`/account/orders/${order.orderNumber}`}>
              <Button
                size="lg"
                variant="outline"
                className="font-semibold uppercase tracking-wider w-full sm:w-auto"
              >
                View Order
              </Button>
            </Link>
            <Link href="/products">
              <Button
                size="lg"
                className="font-semibold uppercase tracking-wider bg-brand-charcoal text-white hover:bg-black w-full sm:w-auto"
              >
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  );
}
