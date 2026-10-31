"use client";

import type { OrderStatus } from "@prisma/client";
import { Check, CheckCircle2, Clock, Package, RotateCcw, Truck, XCircle } from "lucide-react";

interface OrderHistoryEntry {
  status: string;
  createdAt: Date | string;
  notes?: string | null;
}

interface OrderLifecycleStepperProps {
  currentStatus: OrderStatus | string;
  createdAt: Date | string;
  orderHistory?: OrderHistoryEntry[];
  shipmentDate?: Date | string | null;
}

const STEPS = [
  {
    key: "PLACED",
    label: "Order Placed",
    sublabel: "Checkout completed",
    icon: Clock,
  },
  {
    key: "CONFIRMED",
    label: "Confirmed",
    sublabel: "Merchant accepted",
    icon: CheckCircle2,
  },
  {
    key: "PROCESSING",
    label: "Packaging",
    sublabel: "Pick & pack in warehouse",
    icon: Package,
  },
  {
    key: "SHIPPED",
    label: "Dispatched",
    sublabel: "Handed to courier",
    icon: Truck,
  },
  {
    key: "DELIVERED",
    label: "Delivered",
    sublabel: "Received by customer",
    icon: Check,
  },
];

function formatStepDate(date: Date | string | undefined | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-BD", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function OrderLifecycleStepper({
  currentStatus,
  createdAt,
  orderHistory = [],
  shipmentDate,
}: OrderLifecycleStepperProps) {
  // If order is Cancelled or Returned, show special alert lifecycle
  const isCancelled = currentStatus === "CANCELLED";
  const isReturn = currentStatus.startsWith("RETURN");

  // Determine current active step index (0 to 4)
  const getActiveStepIndex = () => {
    switch (currentStatus) {
      case "PENDING":
        return 0;
      case "CONFIRMED":
        return 1;
      case "PROCESSING":
        return 2;
      case "SHIPPED":
        return 3;
      case "DELIVERED":
        return 4;
      default:
        return 0;
    }
  };

  const activeIndex = getActiveStepIndex();

  // Find timestamps for each step from history
  const getStepTimestamp = (stepKey: string) => {
    if (stepKey === "PLACED") return formatStepDate(createdAt);
    if (stepKey === "SHIPPED" && shipmentDate) return formatStepDate(shipmentDate);

    const match = orderHistory.find((h) => h.status === stepKey);
    return match ? formatStepDate(match.createdAt) : null;
  };

  if (isCancelled) {
    const cancelledEntry = orderHistory.find((h) => h.status === "CANCELLED");
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-5 shadow-2xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-2xs">
              <XCircle className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-rose-950">Order Lifecycle: Cancelled</h3>
                <span className="rounded-full bg-rose-200/80 px-2 py-0.5 text-[10px] font-bold text-rose-800 uppercase">
                  Closed
                </span>
              </div>
              <p className="mt-0.5 text-xs text-rose-700">
                {cancelledEntry?.notes ||
                  "Order was cancelled and inventory reservations were safely released."}
              </p>
            </div>
          </div>
          {cancelledEntry?.createdAt ? (
            <span className="text-xs font-semibold text-rose-800">
              Cancelled on {formatStepDate(cancelledEntry.createdAt)}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  if (isReturn) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-5 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-2xs">
            <RotateCcw className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-amber-950">
                Order Lifecycle: Return Process Active
              </h3>
              <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-900 uppercase">
                {currentStatus.replace("RETURN_", "")}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-amber-800">
              Customer has requested a return. Inspect goods upon return arrival before issuing
              refund.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
      <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
            Fulfillment Lifecycle Pipeline
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-neutral-500">Current Stage:</span>
          <span className="font-bold text-neutral-900">{STEPS[activeIndex]?.label}</span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
            Step {activeIndex + 1} of 5
          </span>
        </div>
      </div>

      {/* ── Stepper Nodes ── */}
      <div className="relative">
        <div className="grid grid-cols-5 gap-2">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < activeIndex;
            const isCurrent = idx === activeIndex;
            const timestamp = getStepTimestamp(step.key);
            const Icon = step.icon;

            return (
              <div key={step.key} className="relative flex flex-col items-center text-center">
                {/* Connecting Line (drawn to the next step) */}
                {idx < STEPS.length - 1 ? (
                  <div
                    className={`absolute top-4 left-1/2 h-0.5 w-full -translate-y-1/2 transition-colors duration-300 ${
                      idx < activeIndex ? "bg-emerald-500" : "bg-neutral-200"
                    }`}
                  />
                ) : null}

                {/* Step Circle Icon */}
                <div
                  className={`relative z-0 flex size-8 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    isCompleted
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-2xs"
                      : isCurrent
                        ? "border-neutral-900 bg-neutral-900 text-white shadow-sm ring-4 ring-neutral-900/10"
                        : "border-neutral-300 bg-white text-neutral-400"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="size-4 stroke-[3]" />
                  ) : (
                    <Icon className="size-3.5" />
                  )}
                </div>

                {/* Step Label & Date */}
                <div className="mt-2.5 max-w-[120px]">
                  <p
                    className={`text-xs leading-tight font-bold ${
                      isCurrent
                        ? "text-neutral-900"
                        : isCompleted
                          ? "text-emerald-800"
                          : "text-neutral-400"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="mt-0.5 hidden text-[10px] text-neutral-500 md:block">
                    {timestamp ? (
                      <span className="font-semibold text-neutral-700">{timestamp}</span>
                    ) : isCompleted ? (
                      "Completed"
                    ) : isCurrent ? (
                      <span className="font-semibold text-neutral-900">In Progress</span>
                    ) : (
                      "Upcoming"
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
