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
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
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
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href={`/account/orders/${order.orderNumber}`}
            className="group inline-flex min-h-[38px] items-center gap-1.5 text-xs font-semibold tracking-wider text-neutral-500 uppercase transition-colors hover:text-[#101114]"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
            <span className="sm:hidden">Back to Order</span>
            <span className="hidden sm:inline">Back to Order #{order.orderNumber}</span>
          </Link>
          <span className="text-[11px] font-bold tracking-[0.2em] text-neutral-400 uppercase">
            Return Policy
          </span>
        </div>

        {/* Expired Message Card */}
        <div className="overflow-hidden rounded-2xl border border-[#101114]/8 bg-white p-8 text-center shadow-2xs sm:p-12">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
            <Clock className="size-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#101114] uppercase sm:text-2xl">
            Return Window Expired
          </h1>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-neutral-500 sm:text-sm">
            Order #{order.orderNumber} was delivered more than 3 days ago. Under VibeLock policy,
            return requests must be initiated within 3 days (72 hours) of delivery.
          </p>
          <div className="mt-6">
            <Link
              href={`/account/orders/${order.orderNumber}`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#101114] px-6 text-xs font-bold tracking-wider text-white uppercase transition-colors hover:bg-neutral-800"
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
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href={`/account/orders/${order.orderNumber}`}
            className="group inline-flex min-h-[38px] items-center gap-1.5 text-xs font-semibold tracking-wider text-neutral-500 uppercase transition-colors hover:text-[#101114]"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
            <span className="sm:hidden">Back to Order</span>
            <span className="hidden sm:inline">Back to Order #{order.orderNumber}</span>
          </Link>
          <span className="text-[11px] font-bold tracking-[0.2em] text-neutral-400 uppercase">
            Return Status
          </span>
        </div>

        {/* No Returnable Items Card */}
        <div className="overflow-hidden rounded-2xl border border-[#101114]/8 bg-white p-8 text-center shadow-2xs sm:p-12">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-neutral-100 text-[#101114]">
            <PackageCheck className="size-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#101114] uppercase sm:text-2xl">
            No Returnable Items
          </h1>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-neutral-500 sm:text-sm">
            All items in order #{order.orderNumber} have already been returned or have an active
            return request under review.
          </p>
          <div className="mt-6">
            <Link
              href={`/account/orders/${order.orderNumber}`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#101114] px-6 text-xs font-bold tracking-wider text-white uppercase transition-colors hover:bg-neutral-800"
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
      {/* ── Top Navigation & Meta ── */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/account/orders/${order.orderNumber}`}
          className="group inline-flex min-h-[38px] items-center gap-1.5 text-xs font-semibold tracking-wider text-neutral-500 uppercase transition-colors hover:text-[#101114]"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
          <span className="sm:hidden">Back to Order</span>
          <span className="hidden sm:inline">Back to Order #{order.orderNumber}</span>
        </Link>
        <span className="text-[10px] font-bold tracking-[0.15em] text-[#00D9FF] uppercase sm:text-[11px] sm:tracking-[0.2em]">
          72-Hour Return Window
        </span>
      </div>

      {/* ── Main Return Form ── */}
      <ReturnForm
        orderNumber={order.orderNumber}
        orderPlacedDate={formatDate(order.createdAt)}
        items={returnableItems}
        daysRemaining={daysRemaining}
      />
    </div>
  );
}
