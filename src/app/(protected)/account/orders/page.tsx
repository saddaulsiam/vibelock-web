import { Metadata } from "next";
import Link from "next/link";
import { getCustomerOrders } from "@/lib/orders/queries";
import { Section } from "@/components/shared/section";
import { Container } from "@/components/shared/container";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/storefront/price";
import { PackageOpen, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "My Orders | VibeLock",
  description: "View your order history.",
  robots: { index: false, follow: false },
};

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

export default async function OrdersPage(props: { searchParams: Promise<{ page?: string }> }) {
  const searchParams = await props.searchParams;
  const page = parseInt(searchParams.page || "1", 10);
  const pageSize = 10;

  const { orders, total } = await getCustomerOrders(page, pageSize);
  const totalPages = Math.ceil(total / pageSize);

  return (
    <Section className="py-12 bg-zinc-50 min-h-screen">
      <Container className="max-w-4xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Order History</h1>
            <p className="text-zinc-500 mt-2">View and manage your recent orders.</p>
          </div>
          <Link href="/account">
            <Button variant="outline">Back to Account</Button>
          </Link>
        </div>

        {orders.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <PackageOpen className="h-12 w-12 text-zinc-300 mb-4" />
              <h3 className="text-lg font-medium text-zinc-900">No orders yet</h3>
              <p className="text-sm text-zinc-500 mt-1 mb-6">
                When you place orders, they will appear here.
              </p>
              <Link href="/products">
                <Button>Start Shopping</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="bg-zinc-50 border-b pb-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        Order {order.orderNumber}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Placed on {new Date(order.createdAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                      <Badge variant="outline" className="capitalize bg-zinc-100">
                        {order.paymentMethod === "COD" ? "Cash on Delivery" : "Online Payment"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {order.previewItems.map((item) => (
                      <div key={item.id} className="p-4 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="font-medium text-zinc-900 text-sm line-clamp-1">
                            {item.productName}
                          </span>
                          <span className="text-xs text-zinc-500 mt-0.5">
                            Qty: {item.quantity} • {item.sku}
                            {item.size && ` • Size: ${item.size}`}
                            {item.color && ` • Color: ${item.color}`}
                          </span>
                        </div>
                        <Price amount={item.lineTotal} className="text-sm font-medium" />
                      </div>
                    ))}
                    {order.itemCount > order.previewItems.length && (
                      <div className="p-4 text-sm text-zinc-500 text-center bg-zinc-50/50">
                        + {order.itemCount - order.previewItems.length} more item(s)
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="bg-zinc-50 border-t p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-zinc-500">Order Total</span>
                    <Price amount={order.total} className="text-lg font-bold text-zinc-900" />
                  </div>
                  <Link href={`/account/orders/${order.orderNumber}`} className="w-full sm:w-auto">
                    <Button variant="default" className="w-full sm:w-auto">
                      View Order Details
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {page > 1 && (
                  <Link href={`/account/orders?page=${page - 1}`}>
                    <Button variant="outline" size="sm">
                      Previous
                    </Button>
                  </Link>
                )}
                <span className="flex items-center px-4 text-sm text-zinc-500">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages && (
                  <Link href={`/account/orders?page=${page + 1}`}>
                    <Button variant="outline" size="sm">
                      Next
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </Container>
    </Section>
  );
}
