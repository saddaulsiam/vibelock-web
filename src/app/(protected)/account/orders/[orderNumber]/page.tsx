import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomerOrder } from "@/lib/orders/queries";
import { Section } from "@/components/shared/section";
import { Container } from "@/components/shared/container";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/storefront/price";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CreditCard, MapPin, Package, User } from "lucide-react";
import { CancelOrderButton } from "@/components/storefront/orders/cancel-order-button";

export async function generateMetadata(props: {
  params: Promise<{ orderNumber: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  return {
    title: `Order ${params.orderNumber} | VibeLock`,
    description: "Order details",
    robots: { index: false, follow: false },
  };
}

function getStatusColor(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "CONFIRMED":
    case "PROCESSING":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "SHIPPED":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "DELIVERED":
      return "bg-green-100 text-green-800 border-green-200";
    case "CANCELLED":
    case "RETURNED":
    case "REFUNDED":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export default async function OrderDetailPage(props: { params: Promise<{ orderNumber: string }> }) {
  const params = await props.params;
  const order = await getCustomerOrder(params.orderNumber);

  if (!order) {
    notFound();
  }

  const canCancel =
    order.status === "PENDING" &&
    (order.paymentStatus === "PENDING" || order.paymentStatus === "INITIATED") &&
    order.paymentMethod === "ONLINE";

  return (
    <Section className="py-12 bg-zinc-50 min-h-screen">
      <Container className="max-w-5xl">
        <div className="mb-8">
          <Link
            href="/account/orders"
            className="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                Order {order.orderNumber}
              </h1>
              <p className="text-zinc-500 mt-1">
                Placed on {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={getStatusColor(order.status)}>
                {order.status}
              </Badge>
              {canCancel && <CancelOrderButton orderNumber={order.orderNumber} />}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content (Items) */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-zinc-500" />
                  Order Items
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y border-t border-b">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-6 flex flex-col sm:flex-row gap-4 justify-between"
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-900">{item.productName}</span>
                        <div className="text-sm text-zinc-500 mt-1 space-y-0.5">
                          <p>SKU: {item.sku}</p>
                          {item.size && <p>Size: {item.size}</p>}
                          {item.color && <p>Color: {item.color}</p>}
                          <p className="font-medium text-zinc-700 mt-2">
                            <Price amount={item.unitPrice} /> × {item.quantity}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:items-end justify-start">
                        <Price amount={item.lineTotal} className="font-bold text-zinc-900" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="bg-zinc-50 flex flex-col gap-3 p-6 rounded-b-lg">
                <div className="flex justify-between w-full text-sm text-zinc-500">
                  <span>Subtotal</span>
                  <Price amount={order.subtotal} />
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between w-full text-sm text-zinc-500">
                    <span>Discount</span>
                    <Price amount={-order.discount} className="text-red-600" />
                  </div>
                )}
                <div className="flex justify-between w-full text-sm text-zinc-500">
                  <span>Shipping ({order.shippingMethodName})</span>
                  <Price amount={order.shippingCost} />
                </div>
                {order.taxAmount > 0 && (
                  <div className="flex justify-between w-full text-sm text-zinc-500">
                    <span>Tax</span>
                    <Price amount={order.taxAmount} />
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between w-full text-lg font-bold text-zinc-900">
                  <span>Total</span>
                  <Price amount={order.total} />
                </div>
              </CardFooter>
            </Card>
          </div>

          {/* Sidebar (Payment & Shipping) */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-zinc-500" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-zinc-500 mb-1">Method</p>
                  <p className="font-medium capitalize">
                    {order.paymentMethod === "COD" ? "Cash on Delivery" : "Online Payment"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500 mb-1">Payment Status</p>
                  <Badge variant="outline" className={getStatusColor(order.paymentStatus)}>
                    {order.paymentStatus}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-zinc-500" />
                  Customer Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="text-zinc-500 mb-1">Contact</p>
                  <p className="font-medium">{order.customerName || "N/A"}</p>
                  <p>{order.customerEmail}</p>
                  {order.customerPhone && <p>{order.customerPhone}</p>}
                </div>
                <Separator />
                <div>
                  <p className="flex items-center gap-2 text-zinc-500 mb-2">
                    <MapPin className="w-4 h-4" />
                    Delivery Address
                  </p>
                  <address className="not-italic leading-relaxed text-zinc-700">
                    {order.shippingStreet}
                    <br />
                    {order.shippingCity}
                    {order.shippingState ? `, ${order.shippingState}` : ""}
                    <br />
                    {order.shippingZip && (
                      <>
                        {order.shippingZip}
                        <br />
                      </>
                    )}
                    {order.shippingCountry}
                  </address>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </Section>
  );
}
