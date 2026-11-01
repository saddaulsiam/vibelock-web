"use client";

import { addCustomerStaffNoteAction } from "@/lib/admin/customers/customer-actions";
import type { AdminCustomerStaffNote } from "@/lib/admin/customers/customer-queries";
import { AlertCircle, CheckCircle2, Clock, FileText, Loader2, Send, User } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

interface CustomerStaffNotesProps {
  customerId: string;
  notes: AdminCustomerStaffNote[];
}

function timeAgo(date: Date | string): string {
  const d = new Date(date);
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-BD", { month: "short", day: "numeric" });
}

export function CustomerStaffNotes({ customerId, notes }: CustomerStaffNotesProps) {
  const router = useRouter();
  const [noteText, setNoteText] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await addCustomerStaffNoteAction(customerId, noteText.trim());
      if (!res.success) {
        setError(res.error || "Failed to save note.");
        setIsSubmitting(false);
        return;
      }

      setNoteText("");
      setSuccess(true);
      setIsSubmitting(false);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
            <FileText className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Internal Staff Notes</h3>
            <p className="text-xs text-neutral-500">
              Private notes visible only to store staff &amp; admins
            </p>
          </div>
        </div>
        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600">
          {notes.length} {notes.length === 1 ? "Note" : "Notes"}
        </span>
      </div>

      {/* Note Form */}
      <form onSubmit={handleSubmit} className="mt-4 space-y-2.5">
        <div className="relative">
          <textarea
            rows={2}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add internal note (e.g. 'Customer prefers loose L fit, always calls before 5 PM')..."
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 p-3 text-xs leading-relaxed text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white focus:ring-1 focus:ring-neutral-900 focus:outline-none"
          />
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-rose-600">
            <AlertCircle className="size-3.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600">
            <CheckCircle2 className="size-3.5" />
            <span>Note posted successfully.</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !noteText.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-neutral-800 disabled:opacity-40"
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

      {/* Notes Feed */}
      <div className="mt-4 border-t border-neutral-100 pt-3">
        {notes.length === 0 ? (
          <p className="py-4 text-center text-xs text-neutral-400">
            No internal staff notes yet. Leave a note above to keep the team informed.
          </p>
        ) : (
          <div className="space-y-2.5">
            {notes.map((n) => (
              <div
                key={n.id}
                className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-3 text-xs"
              >
                <div className="flex items-center justify-between text-neutral-500">
                  <div className="flex items-center gap-1.5 font-semibold text-neutral-800">
                    <User className="size-3 text-neutral-400" />
                    <span>{n.authorName}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                    <Clock className="size-3" />
                    <span>{timeAgo(n.createdAt)}</span>
                  </div>
                </div>
                <p className="mt-1.5 leading-relaxed whitespace-pre-wrap text-neutral-700">
                  {n.note}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
