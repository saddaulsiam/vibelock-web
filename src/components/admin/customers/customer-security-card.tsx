"use client";

import {
  adminGenerateCustomerPasswordResetLinkAction,
  adminSendCustomerPasswordResetEmailAction,
  deleteAdminCustomerAction,
  toggleCustomerAccountSuspensionAction,
} from "@/lib/admin/customers/customer-actions";
import {
  AlertTriangle,
  Check,
  Copy,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

interface CustomerSecurityCardProps {
  customerId: string;
  customerName?: string | null;
  customerEmail: string;
  orderCount: number;
  isAccountSuspended: boolean;
  suspensionReason?: string | null;
}

export function CustomerSecurityCard({
  customerId,
  customerName,
  customerEmail,
  orderCount,
  isAccountSuspended,
  suspensionReason,
}: CustomerSecurityCardProps) {
  const router = useRouter();

  // Password Reset state
  const [isSendingEmail, setIsSendingEmail] = React.useState(false);
  const [emailStatus, setEmailStatus] = React.useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);

  // Suspension state
  const [isSuspended, setIsSuspended] = React.useState(isAccountSuspended);
  const [prevSuspendedProp, setPrevSuspendedProp] = React.useState(isAccountSuspended);
  const [isTogglingSuspension, setIsTogglingSuspension] = React.useState(false);

  if (isAccountSuspended !== prevSuspendedProp) {
    setPrevSuspendedProp(isAccountSuspended);
    setIsSuspended(isAccountSuspended);
  }

  // Deletion modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  // Send Password Reset Email
  const handleSendResetEmail = async () => {
    setIsSendingEmail(true);
    setEmailStatus(null);
    try {
      const res = await adminSendCustomerPasswordResetEmailAction(customerId);
      if (res.success) {
        setEmailStatus("Reset email sent successfully!");
        setTimeout(() => setEmailStatus(null), 4000);
      } else {
        alert(res.error || "Failed to send reset email.");
      }
    } catch {
      alert("Something went wrong sending reset email.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Generate & Copy Direct Reset Link (for WhatsApp/Phone assistance)
  const handleCopyDirectLink = async () => {
    setIsGeneratingLink(true);
    try {
      const res = await adminGenerateCustomerPasswordResetLinkAction(customerId);
      if (res.success && res.resetLink) {
        await navigator.clipboard.writeText(res.resetLink);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
      } else {
        alert(res.error || "Failed to generate password reset link.");
      }
    } catch {
      alert("Something went wrong generating reset link.");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Toggle Account Suspension
  const handleToggleSuspension = async () => {
    const nextState = !isSuspended;
    const confirmPrompt = nextState
      ? `Are you sure you want to SUSPEND the account of "${customerName || customerEmail}"? They will be immediately logged out and blocked from logging in.`
      : `Reactivate login privileges for "${customerName || customerEmail}"?`;

    if (!window.confirm(confirmPrompt)) return;

    setIsTogglingSuspension(true);
    try {
      const res = await toggleCustomerAccountSuspensionAction(customerId, nextState);
      if (res.success) {
        setIsSuspended(nextState);
        router.refresh();
      } else {
        alert(res.error || "Failed to update suspension status.");
      }
    } catch {
      alert("Something went wrong updating account status.");
    } finally {
      setIsTogglingSuspension(false);
    }
  };

  // Permanently Delete Customer (Only allowed if orderCount === 0)
  const handleDeleteCustomer = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await deleteAdminCustomerAction(customerId);
      if (res.success) {
        router.push("/admin/customers");
      } else {
        setDeleteError(res.error || "Failed to delete customer.");
        setIsDeleting(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setDeleteError(msg);
      setIsDeleting(false);
    }
  };

  const hasOrders = orderCount > 0;

  return (
    <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800">
            <ShieldAlert className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900">
              Account Security &amp; Administrative Controls
            </h3>
            <p className="text-xs text-neutral-500">
              Manage password assistance, storefront login access, and account deletion
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 1. Password Reset & WhatsApp Link */}
        <div className="rounded-xl border border-neutral-100 bg-neutral-50/60 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-800">
            <KeyRound className="size-3.5 text-neutral-500" />
            <span>Password Assistance</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
            Assist customers who forgot their password via email or direct WhatsApp link.
          </p>

          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSendResetEmail}
              disabled={isSendingEmail}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-2xs transition hover:bg-neutral-50 disabled:opacity-50"
            >
              {isSendingEmail ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Mail className="size-3.5 text-neutral-500" />
              )}
              <span>Send Reset Email</span>
            </button>

            <button
              type="button"
              onClick={handleCopyDirectLink}
              disabled={isGeneratingLink}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-2xs transition hover:bg-neutral-50 disabled:opacity-50"
            >
              {isGeneratingLink ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : copiedLink ? (
                <Check className="size-3.5 text-emerald-600" />
              ) : (
                <Copy className="size-3.5 text-blue-600" />
              )}
              <span>{copiedLink ? "Link Copied!" : "Copy WhatsApp Reset Link"}</span>
            </button>
          </div>

          {emailStatus && (
            <p className="mt-2 text-[11px] font-semibold text-emerald-600">{emailStatus}</p>
          )}
        </div>

        {/* 2. Account Suspension & Login Block */}
        <div className="rounded-xl border border-neutral-100 bg-neutral-50/60 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-800">
              <Lock className="size-3.5 text-neutral-500" />
              <span>Login Access Status</span>
            </div>
            {isSuspended ? (
              <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                SUSPENDED
              </span>
            ) : (
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                ACTIVE
              </span>
            )}
          </div>

          <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
            {isSuspended
              ? `Login is blocked. All active sessions terminated. (${suspensionReason || "Suspended by admin"})`
              : "Customer can currently sign in to VibeLock storefront and place orders."}
          </p>

          <div className="mt-3">
            <button
              type="button"
              onClick={handleToggleSuspension}
              disabled={isTogglingSuspension}
              className={`flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-2xs transition disabled:opacity-50 ${
                isSuspended
                  ? "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                  : "border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
              }`}
            >
              {isTogglingSuspension ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : isSuspended ? (
                <UserCheck className="size-3.5 text-emerald-600" />
              ) : (
                <UserX className="size-3.5 text-amber-700" />
              )}
              <span>{isSuspended ? "Reactivate Account" : "Suspend / Block Login"}</span>
            </button>
          </div>
        </div>

        {/* 3. Safe Customer Deletion Policy */}
        <div className="rounded-xl border border-neutral-100 bg-neutral-50/60 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-800">
              <Trash2 className="size-3.5 text-neutral-500" />
              <span>Permanent Deletion</span>
            </div>
            {hasOrders ? (
              <span className="rounded bg-neutral-200 px-2 py-0.5 text-[10px] font-bold text-neutral-700">
                PROTECTED ({orderCount})
              </span>
            ) : (
              <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                0 ORDERS (SAFE)
              </span>
            )}
          </div>

          <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
            {hasOrders
              ? "Cannot delete customers with past orders. Invoices, accounting, and courier fraud history must remain protected."
              : "This lead has 0 orders. Safe to permanently delete from database."}
          </p>

          <div className="mt-3">
            {hasOrders ? (
              <button
                type="button"
                disabled
                className="flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-400 opacity-75"
                title="Protected: Customer has order history"
              >
                <Trash2 className="size-3.5 text-neutral-400" />
                <span>Delete Blocked (Has Orders)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 shadow-2xs transition hover:bg-rose-100"
              >
                <Trash2 className="size-3.5 text-rose-600" />
                <span>Delete Customer Profile</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal for 0-order customers */}
      {isDeleteModalOpen && (
        <div
          className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Permanently Delete Customer?</h3>
                <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                  Are you sure you want to permanently delete{" "}
                  <strong>{customerName || customerEmail}</strong>? This customer has 0 orders and
                  will be completely removed from the database. This action cannot be undone.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
                {deleteError}
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-neutral-100 pt-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="rounded-lg border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCustomer}
                disabled={isDeleting}
                className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="size-3 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="size-3" />
                    <span>Yes, Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
