"use client";

import * as React from "react";
import { Sparkles, Award, ArrowUpRight, ArrowDownRight, PlusCircle, MinusCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { adjustCustomerLoyaltyPointsAction } from "@/lib/admin/customers/customer-actions";
import type { AdminCustomerLoyaltyInfo } from "@/lib/admin/customers/customer-query-types";

interface CustomerLoyaltyCardProps {
  customerId: string;
  customerName: string | null;
  loyalty: AdminCustomerLoyaltyInfo | null;
}

function getTierBadgeClass(tier: string) {
  switch (tier) {
    case "PLATINUM":
      return "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300";
    case "GOLD":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "SILVER":
      return "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300";
    default:
      return "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300";
  }
}

export function CustomerLoyaltyCard({
  customerId,
  customerName,
  loyalty,
}: CustomerLoyaltyCardProps) {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [adjustType, setAdjustType] = React.useState<"ADD" | "DEDUCT">("ADD");
  const [pointsInput, setPointsInput] = React.useState("");
  const [reasonInput, setReasonInput] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const currentPoints = loyalty?.points ?? 0;
  const lifetimePoints = loyalty?.lifetimePoints ?? 0;
  const lifetimeSpend = loyalty?.lifetimeSpend ?? 0;
  const tier = loyalty?.tier ?? "BRONZE";

  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    const pts = parseInt(pointsInput, 10);
    if (isNaN(pts) || pts <= 0) {
      setError("Please enter a valid positive number of points.");
      return;
    }

    if (!reasonInput.trim() || reasonInput.trim().length < 3) {
      setError("Please enter a reason with at least 3 characters for audit compliance.");
      return;
    }

    const delta = adjustType === "ADD" ? pts : -pts;
    if (adjustType === "DEDUCT" && pts > currentPoints) {
      setError(`Cannot deduct ${pts} points: customer only has ${currentPoints} points.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await adjustCustomerLoyaltyPointsAction({
        customerId,
        pointsDelta: delta,
        reason: reasonInput.trim(),
      });

      if (!res.success) {
        setError(res.error || "Failed to adjust points.");
      } else {
        toast.success(`Successfully adjusted points! New balance: ${res.newBalance} pts`);
        setIsModalOpen(false);
        setPointsInput("");
        setReasonInput("");
      }
    } catch {
      setError("An unexpected error occurred while adjusting points.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card text-card-foreground rounded-lg border p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2.5">
          <div className="rounded-md bg-vl-cyan-500/10 p-2 text-vl-cyan-600">
            <Award className="size-5" />
          </div>
          <div>
            <h3 className="font-heading text-base font-semibold leading-none">
              Loyalty & Rewards Program
            </h3>
            <p className="text-muted-foreground mt-1 text-xs">
              Points ledger, VIP qualification, and customer balance management
            </p>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setError(null);
            setIsModalOpen(true);
          }}
          className="gap-1.5 text-xs font-medium"
        >
          <Sparkles className="size-3.5 text-vl-cyan-600" />
          Adjust Points
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-md border p-3">
          <span className="text-muted-foreground text-xs font-medium">VIP Tier</span>
          <div className="mt-1 flex items-center gap-1.5">
            <Badge variant="outline" className={`font-mono text-xs font-bold uppercase ${getTierBadgeClass(tier)}`}>
              {tier}
            </Badge>
          </div>
        </div>

        <div className="rounded-md border p-3">
          <span className="text-muted-foreground text-xs font-medium">Active Points</span>
          <p className="font-mono text-xl font-bold tracking-tight text-vl-cyan-600">
            {currentPoints.toLocaleString("en-BD")}
          </p>
        </div>

        <div className="rounded-md border p-3">
          <span className="text-muted-foreground text-xs font-medium">Lifetime Points</span>
          <p className="font-mono text-xl font-bold tracking-tight">
            {lifetimePoints.toLocaleString("en-BD")}
          </p>
        </div>

        <div className="rounded-md border p-3">
          <span className="text-muted-foreground text-xs font-medium">Lifetime Spend</span>
          <p className="font-mono text-xl font-bold tracking-tight">
            ৳{lifetimeSpend.toLocaleString("en-BD")}
          </p>
        </div>
      </div>

      {/* Transaction Ledger */}
      <div className="space-y-3">
        <h4 className="text-muted-foreground font-mono text-xs font-bold tracking-wider uppercase">
          Recent Loyalty Transactions
        </h4>

        {loyalty?.recentTransactions && loyalty.recentTransactions.length > 0 ? (
          <div className="rounded-md border overflow-hidden">
            <div className="divide-y text-xs">
              {loyalty.recentTransactions.map((tx) => {
                const isPositive = tx.points > 0;
                return (
                  <div key={tx.id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`rounded-full p-1 ${
                          isPositive
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="size-3.5" />
                        ) : (
                          <ArrowDownRight className="size-3.5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{tx.type}</span>
                          {tx.orderNumber && (
                            <span className="font-mono text-2xs text-muted-foreground">
                              #{tx.orderNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground text-compact mt-0.5">
                          {tx.reason || "Program activity"} ·{" "}
                          {new Date(tx.createdAt).toLocaleDateString("en-BD", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`font-mono text-xs font-bold ${
                          isPositive ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        {isPositive ? `+${tx.points}` : `${tx.points}`} pts
                      </span>
                      <p className="text-muted-foreground text-2xs font-mono">
                        Bal: {tx.balanceAfter} pts
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
            No loyalty transactions recorded yet for this customer.
          </div>
        )}
      </div>

      {/* Adjust Points Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-card text-card-foreground w-full max-w-md rounded-lg border p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-heading text-base font-semibold">
                Adjust Points {customerName ? `· ${customerName}` : ""}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustPoints} className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={adjustType === "ADD" ? "brand" : "outline"}
                  onClick={() => setAdjustType("ADD")}
                  className="flex-1 gap-1 text-xs"
                >
                  <PlusCircle className="size-3.5" />
                  Add Points
                </Button>
                <Button
                  type="button"
                  variant={adjustType === "DEDUCT" ? "brand" : "outline"}
                  onClick={() => setAdjustType("DEDUCT")}
                  className="flex-1 gap-1 text-xs"
                >
                  <MinusCircle className="size-3.5" />
                  Deduct Points
                </Button>
              </div>

              <div>
                <Label htmlFor="adjust-points" className="text-xs">
                  Number of Points
                </Label>
                <Input
                  id="adjust-points"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 50"
                  value={pointsInput}
                  onChange={(e) => setPointsInput(e.target.value)}
                  className="mt-1 font-mono text-sm"
                  required
                />
                <p className="text-muted-foreground mt-1 text-2xs">
                  Current customer balance: {currentPoints} points
                </p>
              </div>

              <div>
                <Label htmlFor="adjust-reason" className="text-xs">
                  Reason for Adjustment (Audit Log Mandatory)
                </Label>
                <Input
                  id="adjust-reason"
                  type="text"
                  placeholder="e.g. Customer compensation for delivery delay"
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  className="mt-1 text-xs"
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  loading={isSubmitting}
                  className="gap-1.5"
                >
                  <Sparkles className="size-3.5" />
                  Confirm Adjustment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
