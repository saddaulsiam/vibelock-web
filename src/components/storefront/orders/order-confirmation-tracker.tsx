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
  const isCancelled = status === "CANCELLED" || paymentStatus === "CANCELLED" || paymentStatus === "FAILED";

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
    <div className="rounded-xl border border-vl-dark-900/10 bg-vl-white-100 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between border-b border-vl-dark-900/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-vl-dark-900">
            Live Order Status
          </span>
        </div>
        <span className="text-xs font-semibold text-muted-foreground">
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
                  ? "border-emerald-200 bg-emerald-50/50 text-vl-dark-900"
                  : step.isCurrent
                    ? "border-vl-dark-900 bg-white text-vl-dark-900 shadow-xs"
                    : "border-transparent bg-transparent text-muted-foreground"
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
                    <span className="size-2 rounded-full bg-vl-cyan animate-ping" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <span className="text-xs font-bold tracking-tight text-vl-dark-900">
                  {step.title}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight sm:mt-1">
                {step.detail}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
