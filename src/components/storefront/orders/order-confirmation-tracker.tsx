import { Check, AlertCircle } from "lucide-react";
import { OrderStatus, PaymentStatus, PaymentMethod } from "@prisma/client";

interface OrderConfirmationTrackerProps {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
}

export function OrderConfirmationTracker({
  status,
  paymentStatus,
  paymentMethod,
}: OrderConfirmationTrackerProps) {
  const isCancelled =
    status === "CANCELLED" || paymentStatus === "CANCELLED" || paymentStatus === "FAILED";

  if (isCancelled) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 sm:p-5">
        <div className="flex items-center gap-3.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
            <AlertCircle className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-rose-900">Order Cancelled & Stock Released</h3>
            <p className="mt-0.5 text-xs text-rose-700">
              This order was cancelled and held inventory has been restored. No funds were debited.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isPaid = paymentStatus === "SUCCESS";
  const isCod = paymentMethod === "COD";

  const steps = [
    {
      id: "placed",
      title: "Order Placed",
      detail: "Confirmed in system",
      isComplete: true,
      isCurrent: false,
    },
    {
      id: "payment",
      title: isCod ? "Cash on Delivery" : "Payment Verified",
      detail: isCod ? "Pay when received" : isPaid ? "Payment successful" : "Pending confirmation",
      isComplete: isPaid || isCod,
      isCurrent: !isPaid && !isCod,
    },
    {
      id: "processing",
      title: "Preparing Order",
      detail: "Warehouse packing",
      isComplete: false,
      isCurrent: true,
    },
    {
      id: "delivery",
      title: "Out for Delivery",
      detail: "Inside Dhaka 2-3d, outside 3-5d",
      isComplete: false,
      isCurrent: false,
    },
  ];

  return (
    <div className="border-vl-dark-900/10 bg-vl-white-100 rounded-xl border p-4 sm:p-5">
      <div className="border-vl-dark-900/10 mb-4 flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <span className="flex size-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-vl-dark-900 text-xs font-bold tracking-wider uppercase">
            Live Order Status
          </span>
        </div>
        <span className="text-muted-foreground text-xs font-semibold">
          Estimated Delivery: 2–4 Business Days
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:gap-4">
        {steps.map((step, idx) => {
          return (
            <div
              key={step.id}
              className={`relative flex items-center gap-3 rounded-lg border p-3 transition-colors sm:flex-col sm:items-start sm:p-3.5 ${
                step.isComplete
                  ? "text-vl-dark-900 border-emerald-200 bg-emerald-50/50"
                  : step.isCurrent
                    ? "border-vl-dark-900 text-vl-dark-900 bg-white shadow-xs"
                    : "text-muted-foreground border-transparent bg-transparent"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    step.isComplete
                      ? "bg-emerald-600 text-white"
                      : step.isCurrent
                        ? "bg-vl-dark-900 text-white"
                        : "bg-vl-dark-900/10 text-muted-foreground"
                  }`}
                >
                  {step.isComplete ? (
                    <Check className="size-3.5 stroke-[3]" />
                  ) : step.isCurrent ? (
                    <span className="bg-vl-cyan size-2 animate-ping rounded-full" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <span className="text-vl-dark-900 text-xs font-bold tracking-tight">
                  {step.title}
                </span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-tight sm:mt-1">
                {step.detail}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
