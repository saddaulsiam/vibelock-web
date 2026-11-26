"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { InventoryReturnSettings } from "@/lib/settings/inventory-return-settings";
import {
  updateInventoryReturnSettingsAction,
  type InventoryReturnActionState,
} from "@/lib/admin/settings/inventory-return-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Mail,
  RotateCcw,
  Save,
  ShieldCheck,
  Warehouse,
} from "lucide-react";

const initialState: InventoryReturnActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      variant="primary"
      size="default"
      className="gap-2 px-6 shadow-sm"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          <span>Saving Policies...</span>
        </>
      ) : (
        <>
          <Save className="size-4" aria-hidden="true" />
          <span>Save Policy Configuration</span>
        </>
      )}
    </Button>
  );
}

export function InventoryReturnForm({ initialSettings }: { initialSettings: InventoryReturnSettings }) {
  const [state, formAction] = useActionState(updateInventoryReturnSettingsAction, initialState);

  return (
    <form action={formAction} className="space-y-8">
      {/* Status Messages */}
      {state.error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/90 p-4 text-red-900 shadow-sm dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          <AlertTriangle className="size-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
          <div className="text-sm font-medium">
            <p>{state.error}</p>
          </div>
        </div>
      )}

      {state.message && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-900 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          <div className="text-sm font-medium">
            <p>{state.message}</p>
          </div>
        </div>
      )}

      {/* Grid: 2 columns for policy management */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* CARD 1: INVENTORY INTELLIGENCE & ALERT THRESHOLDS */}
        <Card className="border-vl-dark-900/10 shadow-sm dark:border-vl-dark-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                <Boxes className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Inventory Thresholds & Alerts</CardTitle>
                <CardDescription className="text-xs">
                  Trigger automatic stock warning badges and email alerts for warehouse restockers.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="lowStockThreshold" className="text-xs font-semibold text-vl-dark-700 dark:text-vl-dark-300">
                  Low Stock Warning (Units)
                </label>
                <Input
                  id="lowStockThreshold"
                  name="lowStockThreshold"
                  type="number"
                  min={1}
                  max={500}
                  defaultValue={initialSettings.lowStockThreshold}
                  required
                />
                <p className="text-[11px] text-vl-dark-500">
                  Variants at or below this count show a yellow &ldquo;Low Stock&rdquo; badge.
                </p>
                {state.fieldErrors?.lowStockThreshold && (
                  <p className="text-xs text-red-500">{state.fieldErrors.lowStockThreshold[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="criticalStockThreshold" className="text-xs font-semibold text-vl-dark-700 dark:text-vl-dark-300">
                  Critical Outage Level (Units)
                </label>
                <Input
                  id="criticalStockThreshold"
                  name="criticalStockThreshold"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={initialSettings.criticalStockThreshold}
                  required
                />
                <p className="text-[11px] text-vl-dark-500">
                  Emergency threshold triggering high-priority restock attention.
                </p>
                {state.fieldErrors?.criticalStockThreshold && (
                  <p className="text-xs text-red-500">{state.fieldErrors.criticalStockThreshold[0]}</p>
                )}
              </div>
            </div>

            {/* Email notification toggle */}
            <div className="rounded-xl border border-vl-dark-900/10 bg-vl-dark-900/[0.02] p-4 dark:border-vl-dark-800 dark:bg-vl-dark-900/40 space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="notifyLowStockEmail"
                  value="true"
                  defaultChecked={initialSettings.notifyLowStockEmail}
                  className="mt-1 size-4 rounded border-vl-dark-900/20 text-vl-cyan-600 focus:ring-vl-cyan-500"
                />
                <div>
                  <span className="text-sm font-medium text-vl-dark-900 dark:text-vl-white">
                    Send Restock Email Alert
                  </span>
                  <p className="text-xs text-vl-dark-500 dark:text-vl-dark-400">
                    Dispatches an automated email digest whenever items breach low stock thresholds.
                  </p>
                </div>
              </label>

              <div className="space-y-2 pt-2 border-t border-vl-dark-900/10 dark:border-vl-dark-800">
                <label htmlFor="lowStockNotificationEmail" className="text-xs font-semibold text-vl-dark-700 dark:text-vl-dark-300 flex items-center gap-1.5">
                  <Mail className="size-3.5 text-vl-dark-400" />
                  Alert Recipient Email
                </label>
                <Input
                  id="lowStockNotificationEmail"
                  name="lowStockNotificationEmail"
                  type="email"
                  defaultValue={initialSettings.lowStockNotificationEmail}
                  placeholder="inventory@vibelock.com"
                />
              </div>
            </div>

            {/* Storefront visibility */}
            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="allowBackorders"
                  value="true"
                  defaultChecked={initialSettings.allowBackorders}
                  className="mt-1 size-4 rounded border-vl-dark-900/20 text-vl-cyan-600 focus:ring-vl-cyan-500"
                />
                <div>
                  <span className="text-sm font-medium text-vl-dark-900 dark:text-vl-white">
                    Allow Backorders / Overselling
                  </span>
                  <p className="text-xs text-vl-dark-500 dark:text-vl-dark-400">
                    Permits customers to complete checkout even when inventory level reaches zero.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="autoHideOutOfStock"
                  value="true"
                  defaultChecked={initialSettings.autoHideOutOfStock}
                  className="mt-1 size-4 rounded border-vl-dark-900/20 text-vl-cyan-600 focus:ring-vl-cyan-500"
                />
                <div>
                  <span className="text-sm font-medium text-vl-dark-900 dark:text-vl-white">
                    Auto-Hide Out-of-Stock Products
                  </span>
                  <p className="text-xs text-vl-dark-500 dark:text-vl-dark-400">
                    Removes sold-out items from catalog browsing and search grids automatically.
                  </p>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: CUSTOMER RETURN POLICY GOVERNANCE */}
        <Card className="border-vl-dark-900/10 shadow-sm dark:border-vl-dark-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                <RotateCcw className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Return Window & Eligibility</CardTitle>
                <CardDescription className="text-xs">
                  Define customer eligibility periods and restrictions for post-delivery return requests.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="returnWindowDays" className="text-xs font-semibold text-vl-dark-700 dark:text-vl-dark-300">
                  Return Window (Days After Delivery)
                </label>
                <Badge variant="outline" className="text-[10px] text-vl-dark-500">
                  Set to 0 to disable returns
                </Badge>
              </div>
              <Input
                id="returnWindowDays"
                name="returnWindowDays"
                type="number"
                min={0}
                max={90}
                defaultValue={initialSettings.returnWindowDays}
                required
              />
              <p className="text-[11px] text-vl-dark-500">
                Standard Bangladesh e-commerce window is 7 days. Customers cannot request returns after this window expires.
              </p>
              {state.fieldErrors?.returnWindowDays && (
                <p className="text-xs text-red-500">{state.fieldErrors.returnWindowDays[0]}</p>
              )}
            </div>

            <div className="space-y-3 pt-2 border-t border-vl-dark-900/10 dark:border-vl-dark-800">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="requirePhotoProofOnDefect"
                  value="true"
                  defaultChecked={initialSettings.requirePhotoProofOnDefect}
                  className="mt-1 size-4 rounded border-vl-dark-900/20 text-vl-cyan-600 focus:ring-vl-cyan-500"
                />
                <div>
                  <span className="text-sm font-medium text-vl-dark-900 dark:text-vl-white">
                    Require Photo Proof for Defective/Wrong Items
                  </span>
                  <p className="text-xs text-vl-dark-500 dark:text-vl-dark-400">
                    Enforces at least one uploaded photograph before the customer can submit the return form.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="allowPartialReturns"
                  value="true"
                  defaultChecked={initialSettings.allowPartialReturns}
                  className="mt-1 size-4 rounded border-vl-dark-900/20 text-vl-cyan-600 focus:ring-vl-cyan-500"
                />
                <div>
                  <span className="text-sm font-medium text-vl-dark-900 dark:text-vl-white">
                    Allow Partial Order Returns
                  </span>
                  <p className="text-xs text-vl-dark-500 dark:text-vl-dark-400">
                    Customers can select specific line items from a multi-item parcel rather than returning the entire order.
                  </p>
                </div>
              </label>
            </div>

            {/* Non-returnable categories */}
            <div className="space-y-2 pt-2 border-t border-vl-dark-900/10 dark:border-vl-dark-800">
              <label htmlFor="nonReturnableCategories" className="text-xs font-semibold text-vl-dark-700 dark:text-vl-dark-300">
                Non-Returnable Product Categories
              </label>
              <Input
                id="nonReturnableCategories"
                name="nonReturnableCategories"
                type="text"
                defaultValue={initialSettings.nonReturnableCategories.join(", ")}
                placeholder="Underwear, Swimwear, Clearance, Socks"
              />
              <p className="text-[11px] text-vl-dark-500">
                Comma-separated list of product categories that are strictly final-sale for hygiene or clearance reasons.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CARD 3: RETURN FEES & DEDUCTIONS */}
        <Card className="border-vl-dark-900/10 shadow-sm dark:border-vl-dark-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Refund Deductions & Logistics Charges</CardTitle>
                <CardDescription className="text-xs">
                  Configure merchant protection rules for shipping charge recovery on customer change-of-mind.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-xl border border-vl-dark-900/10 bg-vl-dark-900/[0.02] p-4 dark:border-vl-dark-800 dark:bg-vl-dark-900/40">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="deductShippingFeeFromRefund"
                  value="true"
                  defaultChecked={initialSettings.deductShippingFeeFromRefund}
                  className="mt-1 size-4 rounded border-vl-dark-900/20 text-vl-cyan-600 focus:ring-vl-cyan-500"
                />
                <div>
                  <span className="text-sm font-medium text-vl-dark-900 dark:text-vl-white">
                    Deduct Courier Delivery Fee From Refund
                  </span>
                  <p className="text-xs text-vl-dark-500 dark:text-vl-dark-400">
                    When approved, original delivery cost is subtracted from the refund amount to prevent merchant loss on return shipping.
                  </p>
                </div>
              </label>
            </div>

            <div className="space-y-2">
              <label htmlFor="returnProcessingFee" className="text-xs font-semibold text-vl-dark-700 dark:text-vl-dark-300">
                Flat Restocking / Return Fee (BDT)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-vl-dark-400">
                  ৳
                </span>
                <Input
                  id="returnProcessingFee"
                  name="returnProcessingFee"
                  type="number"
                  min={0}
                  max={5000}
                  defaultValue={initialSettings.returnProcessingFee}
                  className="pl-8"
                  required
                />
              </div>
              <p className="text-[11px] text-vl-dark-500">
                Additional administrative processing fee deducted from refund (set 0 for no fee).
              </p>
              {state.fieldErrors?.returnProcessingFee && (
                <p className="text-xs text-red-500">{state.fieldErrors.returnProcessingFee[0]}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* CARD 4: WAREHOUSE RESTOCKING GOVERNANCE */}
        <Card className="border-vl-dark-900/10 shadow-sm dark:border-vl-dark-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-vl-cyan-500/10 text-vl-cyan-600 dark:bg-vl-cyan-500/20 dark:text-vl-cyan-400">
                <Warehouse className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Restocking & Quality Grading</CardTitle>
                <CardDescription className="text-xs">
                  Manage inventory return destinations and quality check inspection enforcement.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="restockLocation" className="text-xs font-semibold text-vl-dark-700 dark:text-vl-dark-300">
                Restock Fulfillment Hub / Warehouse
              </label>
              <Input
                id="restockLocation"
                name="restockLocation"
                type="text"
                defaultValue={initialSettings.restockLocation}
                required
              />
              <p className="text-[11px] text-vl-dark-500">
                Physical warehouse facility where returned merchandise is inspected and restored into stock.
              </p>
            </div>

            <div className="rounded-xl border border-vl-dark-900/10 bg-vl-dark-900/[0.02] p-4 dark:border-vl-dark-800 dark:bg-vl-dark-900/40">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="autoRestockCompletedReturns"
                  value="true"
                  defaultChecked={initialSettings.autoRestockCompletedReturns}
                  className="mt-1 size-4 rounded border-vl-dark-900/20 text-vl-cyan-600 focus:ring-vl-cyan-500"
                />
                <div>
                  <span className="text-sm font-medium text-vl-dark-900 dark:text-vl-white">
                    Auto-Restock Returned Items (Bypass QC)
                  </span>
                  <p className="text-xs text-vl-dark-500 dark:text-vl-dark-400">
                    Immediately adds returned inventory back to sellable stock. When unchecked (recommended), items require staff Quality Grading (Grade A: Resellable vs Grade B: Damaged).
                  </p>
                </div>
              </label>
            </div>

            <div className="flex items-start gap-2.5 rounded-lg bg-vl-dark-900/[0.04] p-3 text-xs text-vl-dark-600 dark:bg-vl-dark-800/60 dark:text-vl-dark-300">
              <HelpCircle className="size-4 shrink-0 text-vl-cyan-600 mt-0.5" />
              <span>
                VibeLock inventory ledger prevents negative stock discrepancies and tracks return batch history with full transaction traceability.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Save Actions Bar */}
      <div className="flex items-center justify-between rounded-xl border border-vl-dark-900/10 bg-vl-dark-900/[0.02] p-4 dark:border-vl-dark-800 dark:bg-vl-dark-900/40">
        <p className="text-xs text-vl-dark-500 dark:text-vl-dark-400">
          Modifications take effect immediately across all storefront product cards, inventory badges, and return flows.
        </p>
        <SubmitButton />
      </div>
    </form>
  );
}
