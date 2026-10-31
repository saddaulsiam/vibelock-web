"use client";

import * as React from "react";
import {
  FileText,
  Send,
  Clock,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Loader2,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { addOrderNoteAction } from "@/lib/admin/orders/order-actions";

interface OrderHistoryEntry {
  id: string;
  orderId: string;
  status: string;
  notes?: string | null;
  createdAt: Date | string;
}

interface OrderStaffNotesProps {
  orderId: string;
  history: OrderHistoryEntry[];
}

const QUICK_TEMPLATES = [
  { label: "📞 Called & Confirmed", text: "Customer contacted via phone and confirmed order & address details." },
  { label: "🚚 Deliver After 6 PM", text: "Customer requested delivery in the evening after 6:00 PM." },
  { label: "⚠️ Call Before Delivery", text: "Rider must call recipient before arriving at the address." },
  { label: "🎁 Gift Packaging", text: "Special gift wrap & ribbon requested. Do not include price tag invoice inside bag." },
  { label: "🔄 Size Exchange Discussed", text: "Customer discussed size fitting. Confirmed correct size before dispatch." },
];

function formatDate(dateInput: Date | string): string {
  const d = new Date(dateInput);
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function OrderStaffNotes({ orderId, history }: OrderStaffNotesProps) {
  const [noteText, setNoteText] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"ALL" | "NOTES_ONLY">("ALL");
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const staffNotesCount = history.filter((h) => h.notes?.includes("[STAFF NOTE")).length;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = noteText.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await addOrderNoteAction({ orderId, note: trimmed });
      if (res.success) {
        setNoteText("");
        setFeedback({ type: "success", text: "Staff note posted to order history." });
        setTimeout(() => setFeedback(null), 3000);
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to post note." });
      }
    } catch {
      setFeedback({ type: "error", text: "An error occurred while saving the note." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyTemplate = (templateText: string) => {
    setNoteText((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} &middot; ${templateText}` : templateText;
    });
  };

  const displayedEntries =
    activeTab === "NOTES_ONLY"
      ? history.filter((h) => h.notes?.includes("[STAFF NOTE"))
      : history;

  return (
    <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs print:hidden">
      {/* ── Card Header & Tab Filter ── */}
      <div className="flex flex-col gap-3 border-b border-neutral-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            <FileText className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900">
              Staff Internal Notes &amp; Activity
            </h3>
            <p className="text-xs text-neutral-500">
              Team communication, customer preferences, and audit trail
            </p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center rounded-lg bg-neutral-100 p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`rounded-md px-2.5 py-1 transition ${
              activeTab === "ALL"
                ? "bg-white text-neutral-900 shadow-2xs font-bold"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            All Activity ({history.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("NOTES_ONLY")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition ${
              activeTab === "NOTES_ONLY"
                ? "bg-white text-neutral-900 shadow-2xs font-bold"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <span>Staff Notes</span>
            {staffNotesCount > 0 ? (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800">
                {staffNotesCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {/* ── Add Note Composer Box ── */}
      <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50/60 p-3.5">
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={2}
            placeholder="Write an internal note for the team (e.g., customer called, size change, evening delivery requested)..."
            className="w-full resize-y rounded-lg border border-neutral-200 bg-white p-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            disabled={isSubmitting}
          />

          {/* Quick Template Chips */}
          <div>
            <span className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
              Quick Tags:
            </span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {QUICK_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => applyTemplate(tpl.text)}
                  className="rounded-md border border-neutral-200 bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-50"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback & Submit Button */}
          <div className="flex items-center justify-between pt-1">
            {feedback ? (
              <div
                className={`flex items-center gap-1.5 text-xs font-semibold ${
                  feedback.type === "success" ? "text-emerald-700" : "text-red-700"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="size-3.5" />
                ) : (
                  <AlertCircle className="size-3.5" />
                )}
                <span>{feedback.text}</span>
              </div>
            ) : (
              <span className="text-[11px] text-neutral-400">
                Visible only to team members
              </span>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !noteText.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-neutral-800 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  <span>Posting...</span>
                </>
              ) : (
                <>
                  <Send className="size-3" />
                  <span>Post Note</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Timeline Activity Stream ── */}
      <div className="mt-5 space-y-3">
        {displayedEntries.length === 0 ? (
          <div className="rounded-lg bg-neutral-50 p-4 text-center text-xs text-neutral-400">
            {activeTab === "NOTES_ONLY"
              ? "No staff notes added for this order yet."
              : "No activity recorded yet."}
          </div>
        ) : (
          <div className="relative space-y-3 before:absolute before:top-2 before:bottom-2 before:left-3.5 before:w-0.5 before:bg-neutral-200">
            {displayedEntries.map((entry) => {
              const isStaffNote = entry.notes?.includes("[STAFF NOTE");
              const isPayment = entry.notes?.startsWith("[PAYMENT UPDATE]");

              if (isStaffNote) {
                // Parse staff author and text if available
                let author = "Team Staff";
                let text = entry.notes || "";
                const match = entry.notes?.match(/^\[STAFF NOTE(?: by (.+?))?\]\s*(.*)$/);
                if (match) {
                  author = match[1] || "Team Staff";
                  text = match[2] || "";
                }

                return (
                  <div key={entry.id} className="relative flex items-start gap-3.5 pl-1 text-xs">
                    <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border border-amber-300 bg-amber-50 shadow-2xs">
                      <FileText className="size-3 text-amber-700" />
                    </div>

                    <div className="min-w-0 flex-1 rounded-xl border border-amber-200/90 bg-amber-50/50 p-3 shadow-2xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-amber-950">{author}</span>
                          <span className="rounded bg-amber-200/70 px-1.5 py-0.2 text-[10px] font-bold text-amber-900">
                            Staff Note
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-amber-800/80">
                          {formatDate(entry.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-neutral-800 leading-relaxed font-medium whitespace-pre-wrap">
                        {text}
                      </p>
                    </div>
                  </div>
                );
              }

              if (entry.status === "CANCELLED") {
                let reason = "";
                let detail = entry.notes || "";
                const cancelMatch = entry.notes?.match(/^\[CANCELLATION:\s*([^\]]+)\]\s*(.*)$/);
                if (cancelMatch) {
                  reason = cancelMatch[1].trim();
                  detail = cancelMatch[2].trim();
                }

                return (
                  <div key={entry.id} className="relative flex items-start gap-3.5 pl-1 text-xs">
                    <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border border-rose-300 bg-rose-50 shadow-2xs">
                      <XCircle className="size-3 text-rose-600" />
                    </div>

                    <div className="min-w-0 flex-1 rounded-xl border border-rose-200/90 bg-rose-50/50 p-3 shadow-2xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-200/60 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-rose-950">Order Cancelled</span>
                          <span className="inline-flex items-center gap-1 rounded bg-rose-200/70 px-1.5 py-0.2 text-[10px] font-bold text-rose-900">
                            <RotateCcw className="size-2.5" />
                            <span>Auto-Restocked</span>
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-rose-800/80">
                          {formatDate(entry.createdAt)}
                        </span>
                      </div>
                      {reason ? (
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-rose-900">Cancellation Reason:</span>
                          <span className="rounded-md bg-white px-2 py-0.5 text-xs font-bold text-neutral-900 ring-1 ring-rose-200">
                            {reason}
                          </span>
                        </div>
                      ) : null}
                      {detail ? (
                        <p className="mt-1.5 text-neutral-700 leading-relaxed font-medium whitespace-pre-wrap">
                          {detail}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              }

              // Standard Audit & Fulfillment Transitions
              return (
                <div key={entry.id} className="relative flex items-start gap-3.5 pl-1 text-xs">
                  <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white shadow-2xs">
                    {isPayment ? (
                      <CreditCard className="size-3 text-blue-600" />
                    ) : (
                      <Clock className="size-3 text-neutral-600" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 rounded-lg border border-neutral-100 bg-neutral-50/70 p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold text-neutral-900">
                        {isPayment ? "Payment Status Updated" : `Fulfillment: ${entry.status}`}
                      </p>
                      <span className="text-[11px] font-medium text-neutral-500">
                        {formatDate(entry.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-neutral-600 leading-relaxed">
                      {entry.notes || "No details provided."}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
