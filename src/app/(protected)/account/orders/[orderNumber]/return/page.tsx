import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCustomerOrder } from "@/lib/orders/queries";
import { Section } from "@/components/shared/section";
import { Container } from "@/components/shared/container";
import { ReturnForm } from "@/components/storefront/returns/return-form";
import { ReturnService } from "@/lib/returns/service";

export async function generateMetadata(props: {
  params: Promise<{ orderNumber: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  return {
    title: `Return Items | Order ${params.orderNumber}`,
    description: "Request a return",
    robots: { index: false, follow: false },
  };
}

export default async function ReturnRequestPage(props: {
  params: Promise<{ orderNumber: string }>;
}) {
  const params = await props.params;
  const order = await getCustomerOrder(params.orderNumber);

  if (!order) {
    notFound();
  }

  if (!order.isReturnable) {
    redirect(`/account/orders/${order.orderNumber}`);
  }

  // Calculate returnable quantities
  const returnService = new ReturnService();
  const returnableMap = await returnService.getReturnableQuantities(order.id);

  const returnableItems = order.items
    .map((item) => ({
      ...item,
      returnableQuantity: returnableMap[item.id] || 0,
    }))
    .filter((item) => item.returnableQuantity > 0);

  if (returnableItems.length === 0) {
    return (
      <Section className="py-12 bg-zinc-50 min-h-screen">
        <Container className="max-w-3xl text-center py-20">
          <h1 className="text-2xl font-bold mb-4">No Returnable Items</h1>
          <p className="text-zinc-500 mb-8">
            All items in this order have already been returned or requested for return.
          </p>
        </Container>
      </Section>
    );
  }

  return (
    <Section className="py-12 bg-zinc-50 min-h-screen">
      <Container className="max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Request a Return</h1>
          <p className="text-zinc-500 mt-1">Order {order.orderNumber}</p>
        </div>

        <ReturnForm orderNumber={order.orderNumber} items={returnableItems} />
      </Container>
    </Section>
  );
}
