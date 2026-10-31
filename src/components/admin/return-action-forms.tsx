"use client";

import { useActionState } from "react";
import { Truck, ExternalLink, Printer, CheckCircle2, Loader2 } from "lucide-react";
import type { AdminReturnActionState } from "@/lib/admin/return-actions";
import type { ReturnReverseLogistics } from "@/lib/admin/return-queries";
import { OrderCopyButton } from "@/components/admin/order-copy-button";

const initialState: AdminReturnActionState = { error: null };

type Action = (
  state: AdminReturnActionState,
  formData: FormData
) => Promise<AdminReturnActionState>;

function ActionResult({ state }: { state: AdminReturnActionState }) {
  return state.error ? (
    <p role="alert" className="text-sm text-red-700">
      {state.error}
    </p>
  ) : state.message ? (
    <p role="status" className="text-sm text-emerald-700">
      {state.message}
    </p>
  ) : null;
}

export function ReturnStatusForm({
  id,
  statuses,
  action,
}: {
  id: string;
  statuses: string[];
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
      >
        {statuses.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <textarea
        name="notes"
        placeholder="Optional internal note"
        className="border-input flex min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-10 items-center justify-center border border-[#101114] bg-[#101114] px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Updating..." : "Update return"}
      </button>
      <ActionResult state={state} />
    </form>
  );
}

export function RefundForm({ returnId, action }: { returnId: string; action: Action }) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="returnId" value={returnId} />
      <input
        name="amount"
        type="number"
        min="0.01"
        step="0.01"
        required
        placeholder="Amount (৳)"
        className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
      />
      <input
        name="reason"
        maxLength={500}
        placeholder="Refund reason"
        className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-10 items-center justify-center border border-[#101114] bg-[#101114] px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Creating..." : "Create pending refund"}
      </button>
      <p className="text-muted-foreground text-xs">
        This creates a pending refund; it does not claim provider success.
      </p>
      <ActionResult state={state} />
    </form>
  );
}

export function ProcessRefundForm({
  returnId,
  refundId,
  action,
}: {
  returnId: string;
  refundId: string;
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="returnId" value={returnId} />
      <input type="hidden" name="refundId" value={refundId} />
      <button
        type="submit"
        disabled={pending}
        className="text-primary text-sm font-medium hover:underline disabled:opacity-60"
      >
        {pending ? "Processing..." : "Process with provider"}
      </button>
      <ActionResult state={state} />
    </form>
  );
}

export function ReturnSteadfastHeaderAction({
  reverseLogistics,
  status,
}: {
  reverseLogistics?: ReturnReverseLogistics | null;
  status: string;
}) {
  if (reverseLogistics?.trackingUrl) {
    return (
      <a
        href={reverseLogistics.trackingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-3 text-xs font-bold text-cyan-900 shadow-2xs hover:bg-cyan-100 transition"
        title="View live reverse tracking on Steadfast"
      >
        <Truck className="size-3.5 text-cyan-700" />
        <span>Steadfast: {reverseLogistics.trackingCode}</span>
        <ExternalLink className="size-3 text-cyan-600" />
      </a>
    );
  }

  if (status === "PENDING" || status === "APPROVED") {
    return (
      <a
        href="#steadfast-pickup"
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition"
        title="Scroll to Steadfast Return Pickup booking form"
      >
        <Truck className="size-3.5" />
        <span>Book Steadfast Pickup</span>
      </a>
    );
  }

  return null;
}

export function ReturnSteadfastPickupCard({
  returnId,
  orderNumber,
  customerName,
  customerPhone,
  shippingAddress,
  reverseLogistics,
  status,
  action,
}: {
  returnId: string;
  orderNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  shippingAddress?: string;
  reverseLogistics?: ReturnReverseLogistics | null;
  status: string;
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  const isBooked = Boolean(reverseLogistics?.trackingCode);
  const isEligible = status === "PENDING" || status === "APPROVED";

  return (
    <div
      id="steadfast-pickup"
      className={`rounded-xl border p-5 shadow-2xs transition-colors ${
        isBooked
          ? "border-cyan-300/80 bg-cyan-50/20"
          : "border-neutral-200/90 bg-white"
      }`}
    >
      <div className="mb-3.5 flex items-center justify-between border-b border-neutral-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`flex size-7 items-center justify-center rounded-lg ${
              isBooked
                ? "bg-cyan-100 text-cyan-800"
                : "bg-neutral-100 text-neutral-700"
            }`}
          >
            <Truck className="size-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-wider text-neutral-900 uppercase">
              Steadfast Reverse Logistics
            </h3>
            <p className="text-[10px] text-neutral-500">
              Doorstep return pickup consignment
            </p>
          </div>
        </div>

        {isBooked ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
            <CheckCircle2 className="size-2.5 text-emerald-600" />
            <span>Consignment Active</span>
          </span>
        ) : (
          <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-600 uppercase tracking-wider">
            Not Booked
          </span>
        )}
      </div>

      {isBooked && reverseLogistics ? (
        <div className="space-y-3.5 text-xs">
          <div className="rounded-lg border border-cyan-200/80 bg-white p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
                Consignment ID
              </span>
              <div className="flex items-center gap-1.5 font-mono font-black text-neutral-900 text-xs">
                <span>#{reverseLogistics.consignmentId}</span>
                <OrderCopyButton
                  text={reverseLogistics.consignmentId}
                  variant="icon"
                  successMessage="Consignment ID copied"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-neutral-100 pt-2">
              <span className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
                Steadfast Tracking
              </span>
              <div className="flex items-center gap-1.5 font-mono font-bold text-neutral-900 text-xs">
                <span>{reverseLogistics.trackingCode}</span>
                <OrderCopyButton
                  text={reverseLogistics.trackingCode}
                  variant="icon"
                  successMessage="Tracking code copied"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-neutral-100 pt-2 text-[11px] text-neutral-500">
              <span>Booked Date:</span>
              <span className="font-semibold text-neutral-700">
                {new Intl.DateTimeFormat("en-BD", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(reverseLogistics.bookedAt))}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={reverseLogistics.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8.5 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#101114] px-3 text-xs font-bold text-white shadow-2xs hover:bg-neutral-800 transition"
              title="Open Steadfast live tracking portal"
            >
              <Truck className="size-3.5" />
              <span>Track on Steadfast</span>
              <ExternalLink className="size-3" />
            </a>

            {reverseLogistics.labelUrl && (
              <a
                href={reverseLogistics.labelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-bold text-neutral-700 shadow-2xs hover:bg-neutral-50 transition"
                title="Print official Steadfast courier consignment label"
              >
                <Printer className="size-3.5 text-neutral-500" />
                <span>Print Label</span>
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3 text-xs">
          <div className="rounded-lg bg-neutral-50 p-3 space-y-1.5 text-neutral-600">
            <p className="font-semibold text-neutral-800">
              Pickup From:{" "}
              <span className="font-normal text-neutral-600">
                {customerName || "Customer"} &bull; {customerPhone || "No phone"}
              </span>
            </p>
            {shippingAddress && (
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                <strong>Address:</strong> {shippingAddress}
              </p>
            )}
            <div className="mt-1 flex items-center justify-between border-t border-neutral-200/60 pt-1.5 text-[11px]">
              <span className="text-neutral-500">Consignment Type:</span>
              <span className="font-semibold text-neutral-800">Reverse Pickup (COD: ৳0)</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-neutral-500">Invoice Reference:</span>
              <span className="font-mono font-bold text-neutral-800">RET-{orderNumber}</span>
            </div>
          </div>

          {isEligible ? (
            <form action={formAction} className="space-y-2.5">
              <input type="hidden" name="returnId" value={returnId} />
              <button
                type="submit"
                disabled={pending}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-60 transition"
              >
                {pending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Booking with Steadfast API...</span>
                  </>
                ) : (
                  <>
                    <Truck className="size-3.5" />
                    <span>Generate Steadfast Return Pickup</span>
                  </>
                )}
              </button>
              <ActionResult state={state} />
            </form>
          ) : (
            <p className="text-[11px] text-neutral-400 italic">
              Steadfast pickup is only available for active return requests (Pending or Approved).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
