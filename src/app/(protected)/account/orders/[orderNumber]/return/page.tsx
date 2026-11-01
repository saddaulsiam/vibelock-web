import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, ArrowLeft, PackageCheck } from "lucide-react";
import { getCustomerOrder } from "@/lib/orders/queries";
import { ReturnForm } from "@/components/storefront/returns/return-form";
import { ReturnService } from "@/lib/returns/service";

export async function generateMetadata(props: {
  params: Promise<{ orderNumber: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  return {
    title: `Return Items | Order #${params.orderNumber} | VibeLock`,
    description: "Request a return or exchange for your VibeLock order.",
    robots: { index: false, follow: false },
  };
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-BD", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function calculateDaysRemaining(deliveredAt: Date | string | null | undefined): number {
  if (!deliveredAt) return 3;
  const daysPassed = (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(1, Math.ceil(3 - daysPassed));
}

export default async function ReturnRequestPage(props: {
  params: Promise<{ orderNumber: string }>;
}) {
  const params = await props.params;
  const order = await getCustomerOrder(params.orderNumber);

  if (!order) {
    notFound();
  }

  // Calculate return window
  const deliveredHistory = order.history?.find((h) => h.status === "DELIVERED");
  const deliveredAt = order.shipment?.deliveredAt || deliveredHistory?.createdAt || order.createdAt;
  const daysRemaining = calculateDaysRemaining(deliveredAt);

  if (!order.isReturnable) {
    return (
      <div className="flex flex-col gap-6">
        {/* Top Header Card */}
        <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
          <div className="flex items-center justify-between">
            <Link
              href={`/account/orders/${order.orderNumber}`}
              className="group text-muted-foreground inline-flex items-center gap-1.5 text-xs font-semibold transition-colors hover:text-[#101114]"
            >
              <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Back to Order #{order.orderNumber}</span>
            </Link>
            <span className="text-muted-foreground text-[11px] font-bold tracking-widest uppercase">
              Return Policy
            </span>
          </div>
        </div>

        {/* Expired Message Card */}
        <div className="rounded-2xl border border-[#101114]/10 bg-white p-8 text-center shadow-xs sm:p-12">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 shadow-2xs mb-4">
            <Clock className="size-7" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-[#101114] uppercase sm:text-2xl">
            Return Window Expired
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto text-xs sm:text-sm leading-relaxed">
            Order #{order.orderNumber} was delivered more than 3 days ago. Under VibeLock policy, return requests must be initiated within 3 days (72 hours) of delivery.
          </p>
          <div className="mt-6">
            <Link
              href={`/account/orders/${order.orderNumber}`}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#101114] px-5 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition hover:bg-[#101114]/90"
            >
              Back to Order Details
            </Link>
          </div>
        </div>
      </div>
    );
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
      <div className="flex flex-col gap-6">
        {/* Top Header Card */}
        <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
          <div className="flex items-center justify-between">
            <Link
              href={`/account/orders/${order.orderNumber}`}
              className="group text-muted-foreground inline-flex items-center gap-1.5 text-xs font-semibold transition-colors hover:text-[#101114]"
            >
              <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Back to Order #{order.orderNumber}</span>
            </Link>
            <span className="text-muted-foreground text-[11px] font-bold tracking-widest uppercase">
              Return Status
            </span>
          </div>
        </div>

        {/* No Returnable Items Card */}
        <div className="rounded-2xl border border-[#101114]/10 bg-white p-8 text-center shadow-xs sm:p-12">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#101114]/5 text-[#101114] shadow-2xs mb-4">
            <PackageCheck className="size-7" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-[#101114] uppercase sm:text-2xl">
            No Returnable Items
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto text-xs sm:text-sm leading-relaxed">
            All items in order #{order.orderNumber} have already been returned or have an active return request under review.
          </p>
          <div className="mt-6">
            <Link
              href={`/account/orders/${order.orderNumber}`}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#101114] px-5 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition hover:bg-[#101114]/90"
            >
              Back to Order Details
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header Card (Matching Order Details header) */}
      <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
        <div className="mb-4 flex items-center justify-between border-b border-[#101114]/10 pb-4">
          <Link
            href={`/account/orders/${order.orderNumber}`}
            className="group text-muted-foreground inline-flex items-center gap-1.5 text-xs font-semibold transition-colors hover:text-[#101114]"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Order #{order.orderNumber}</span>
          </Link>
          <span className="text-muted-foreground text-[11px] font-bold tracking-widest uppercase">
            Return Request
          </span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black tracking-tight text-[#101114] uppercase sm:text-2xl">
                Return Items
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                <Clock className="size-3" />
                {daysRemaining} Day{daysRemaining === 1 ? "" : "s"} Left
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
              Order #{order.orderNumber} • Placed on {formatDate(order.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Return Form */}
      <ReturnForm
        orderNumber={order.orderNumber}
        items={returnableItems}
        daysRemaining={daysRemaining}
      />
    </div>
  );
}
