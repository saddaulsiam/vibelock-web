"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { InventoryReturnSettings } from "@/lib/settings/inventory-return-settings";
import {
  updateInventoryReturnSettingsAction,
  type InventoryReturnActionState,
} from "@/lib/admin/settings/inventory-return-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Loader2,
  Mail,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const initialState: InventoryReturnActionState = { error: null };

function SectionSubmitButton({ label = "Save Changes" }: { label?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      variant="primary"
      size="sm"
      className="gap-2 px-4 shadow-2xs font-semibold"
    >
      {pending ? (
        <>
          <Loader2 className="size-3.5 animate-spin text-white" aria-hidden="true" />
          <span>Saving...</span>
        </>
      ) : (
        <>
          <Save className="size-3.5" aria-hidden="true" />
          <span>{label}</span>
        </>
      )}
    </Button>
  );
}

function SectionAlert({ error, message }: { error?: string | null; message?: string | null }) {
  if (error) {
    return (
      <div className="mx-5 mt-3 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-900 shadow-2xs">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-600" />
        <span className="font-medium">{error}</span>
      </div>
    );
  }
  if (message) {
    return (
      <div className="mx-5 mt-3 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/90 p-3 text-xs text-emerald-900 shadow-2xs">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
        <span className="font-medium">{message}</span>
      </div>
    );
  }
  return null;
}

export function InventoryReturnForm({
  initialSettings,
}: {
  initialSettings: InventoryReturnSettings;
}) {
  const [inventoryRulesState, inventoryRulesAction] = useActionState(
    updateInventoryReturnSettingsAction,
    initialState
  );
  const [returnRulesState, returnRulesAction] = useActionState(
    updateInventoryReturnSettingsAction,
    initialState
  );
  const [processingRulesState, processingRulesAction] = useActionState(
    updateInventoryReturnSettingsAction,
    initialState
  );

  // Local switch states
  const [notifyLowStock, setNotifyLowStock] = useState(initialSettings.notifyLowStockEmail);
  const [backorders, setBackorders] = useState(initialSettings.allowBackorders);
  const [autoHide, setAutoHide] = useState(initialSettings.autoHideOutOfStock);
  const [requirePhoto, setRequirePhoto] = useState(initialSettings.requirePhotoProofOnDefect);
  const [partialReturns, setPartialReturns] = useState(initialSettings.allowPartialReturns);
  const [deductShipping, setDeductShipping] = useState(initialSettings.deductShippingFeeFromRefund);
  const [autoRestock, setAutoRestock] = useState(initialSettings.autoRestockCompletedReturns);

  return (
    <div className="space-y-4">
      {/* ── SECTION 1: INVENTORY INTELLIGENCE & ALERT THRESHOLDS ── */}
      <form action={inventoryRulesAction}>
        <Card className="overflow-hidden rounded-xl border-neutral-200/80 bg-white shadow-2xs">
          <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
                <Boxes className="size-4 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-neutral-900">
                  Inventory Thresholds & Restock Alerts
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500">
                  Stock warning levels and automatic restock email notifications
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <SectionAlert error={inventoryRulesState.error} message={inventoryRulesState.message} />

          <CardContent className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label
                  htmlFor="lowStockThreshold"
                  className="text-xs font-semibold tracking-wide text-neutral-700 uppercase"
                >
                  Low Stock Warning (Units) <span className="text-rose-500">*</span>
                </label>
                <Input
                  id="lowStockThreshold"
                  name="lowStockThreshold"
                  type="number"
                  min={1}
                  max={500}
                  defaultValue={initialSettings.lowStockThreshold}
                  className="bg-white font-mono"
                  required
                />
                {inventoryRulesState.fieldErrors?.lowStockThreshold && (
                  <p className="text-[11px] font-semibold text-rose-600">
                    {inventoryRulesState.fieldErrors.lowStockThreshold[0]}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="criticalStockThreshold"
                  className="text-xs font-semibold tracking-wide text-neutral-700 uppercase"
                >
                  Critical Outage Level (Units) <span className="text-rose-500">*</span>
                </label>
                <Input
                  id="criticalStockThreshold"
                  name="criticalStockThreshold"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={initialSettings.criticalStockThreshold}
                  className="bg-white font-mono"
                  required
                />
                {inventoryRulesState.fieldErrors?.criticalStockThreshold && (
                  <p className="text-[11px] font-semibold text-rose-600">
                    {inventoryRulesState.fieldErrors.criticalStockThreshold[0]}
                  </p>
                )}
              </div>
            </div>

            {/* Email Alert Settings */}
            <div className="space-y-3 rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold tracking-wide text-neutral-900 uppercase">
                    Automated Restock Email Alert
                  </span>
                  <p className="mt-0.5 text-[11px] text-neutral-500">
                    Dispatches an email alert whenever variant inventory breaches threshold
                  </p>
                </div>
                <div className="flex items-center">
                  <input
                    type="hidden"
                    name="notifyLowStockEmail"
                    value={notifyLowStock ? "true" : "false"}
                  />
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifyLowStock}
                    onClick={() => setNotifyLowStock(!notifyLowStock)}
                    className={cn(
                      "focus-visible:ring-vl-cyan-500 relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2",
                      notifyLowStock ? "bg-amber-600" : "bg-neutral-300"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                        notifyLowStock ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>

              {notifyLowStock && (
                <div className="animate-in fade-in space-y-1 border-t border-neutral-200/60 pt-2.5">
                  <label
                    htmlFor="lowStockNotificationEmail"
                    className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700"
                  >
                    <Mail className="size-3.5 text-neutral-400" />
                    Alert Recipient Email
                  </label>
                  <Input
                    id="lowStockNotificationEmail"
                    name="lowStockNotificationEmail"
                    type="email"
                    defaultValue={initialSettings.lowStockNotificationEmail}
                    placeholder="inventory@domain.com"
                    className="bg-white font-mono"
                  />
                </div>
              )}
            </div>

            {/* Storefront visibility */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3">
                <div>
                  <span className="text-xs font-semibold text-neutral-900">Allow Backorders</span>
                  <p className="text-[11px] text-neutral-500">
                    Allow purchases even when inventory reaches zero
                  </p>
                </div>
                <div className="flex items-center">
                  <input type="hidden" name="allowBackorders" value={backorders ? "true" : "false"} />
                  <button
                    type="button"
                    role="switch"
                    aria-checked={backorders}
                    onClick={() => setBackorders(!backorders)}
                    className={cn(
                      "focus-visible:ring-vl-cyan-500 relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2",
                      backorders ? "bg-vl-cyan-600" : "bg-neutral-300"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                        backorders ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3">
                <div>
                  <span className="text-xs font-semibold text-neutral-900">
                    Auto-Hide Sold-Out Items
                  </span>
                  <p className="text-[11px] text-neutral-500">
                    Hide out-of-stock products from catalog browsing
                  </p>
                </div>
                <div className="flex items-center">
                  <input
                    type="hidden"
                    name="autoHideOutOfStock"
                    value={autoHide ? "true" : "false"}
                  />
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoHide}
                    onClick={() => setAutoHide(!autoHide)}
                    className={cn(
                      "focus-visible:ring-vl-cyan-500 relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2",
                      autoHide ? "bg-vl-cyan-600" : "bg-neutral-300"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                        autoHide ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-neutral-100 bg-neutral-50/50 px-5 py-3">
            <p className="text-xs text-neutral-500">
              Low stock triggers, email alerts, backorder policy, and product auto-hiding.
            </p>
            <SectionSubmitButton label="Save Inventory Rules" />
          </CardFooter>
        </Card>
      </form>

      {/* ── SECTION 2: CUSTOMER RETURN POLICIES ── */}
      <form action={returnRulesAction}>
        <Card className="overflow-hidden rounded-xl border-neutral-200/80 bg-white shadow-2xs">
          <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
                <RotateCcw className="size-4 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-neutral-900">
                  Customer Return Window & Conditions
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500">
                  Return window duration, photo verification, and non-returnable categories
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <SectionAlert error={returnRulesState.error} message={returnRulesState.message} />

          <CardContent className="space-y-4 p-5">
            <div className="space-y-1">
              <label
                htmlFor="returnWindowDays"
                className="text-xs font-semibold tracking-wide text-neutral-700 uppercase"
              >
                Return Window (Days After Delivery) <span className="text-rose-500">*</span>
              </label>
              <Input
                id="returnWindowDays"
                name="returnWindowDays"
                type="number"
                min={0}
                max={90}
                defaultValue={initialSettings.returnWindowDays}
                placeholder="0 to disable returns"
                className="bg-white font-mono"
                required
              />
              {returnRulesState.fieldErrors?.returnWindowDays && (
                <p className="text-[11px] font-semibold text-rose-600">
                  {returnRulesState.fieldErrors.returnWindowDays[0]}
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3">
                <div>
                  <span className="text-xs font-semibold text-neutral-900">Require Photo Proof</span>
                  <p className="text-[11px] text-neutral-500">
                    Require customer photo upload for return requests
                  </p>
                </div>
                <div className="flex items-center">
                  <input
                    type="hidden"
                    name="requirePhotoProofOnDefect"
                    value={requirePhoto ? "true" : "false"}
                  />
                  <button
                    type="button"
                    role="switch"
                    aria-checked={requirePhoto}
                    onClick={() => setRequirePhoto(!requirePhoto)}
                    className={cn(
                      "focus-visible:ring-vl-cyan-500 relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2",
                      requirePhoto ? "bg-purple-600" : "bg-neutral-300"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                        requirePhoto ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3">
                <div>
                  <span className="text-xs font-semibold text-neutral-900">
                    Allow Partial Order Returns
                  </span>
                  <p className="text-[11px] text-neutral-500">
                    Allow returning single items from multi-item orders
                  </p>
                </div>
                <div className="flex items-center">
                  <input
                    type="hidden"
                    name="allowPartialReturns"
                    value={partialReturns ? "true" : "false"}
                  />
                  <button
                    type="button"
                    role="switch"
                    aria-checked={partialReturns}
                    onClick={() => setPartialReturns(!partialReturns)}
                    className={cn(
                      "focus-visible:ring-vl-cyan-500 relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2",
                      partialReturns ? "bg-purple-600" : "bg-neutral-300"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                        partialReturns ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Non-returnable categories */}
            <div className="space-y-1">
              <label
                htmlFor="nonReturnableCategories"
                className="text-xs font-semibold tracking-wide text-neutral-700 uppercase"
              >
                Non-Returnable Categories (Comma-separated)
              </label>
              <Input
                id="nonReturnableCategories"
                name="nonReturnableCategories"
                type="text"
                defaultValue={initialSettings.nonReturnableCategories.join(", ")}
                placeholder="Underwear, Swimwear, Socks"
                className="bg-white"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-neutral-100 bg-neutral-50/50 px-5 py-3">
            <p className="text-xs text-neutral-500">
              Return window eligibility, photo proof verification, and restricted categories.
            </p>
            <SectionSubmitButton label="Save Return Rules" />
          </CardFooter>
        </Card>
      </form>

      {/* ── SECTION 3: RETURN FEES & DEDUCTIONS ── */}
      <form action={processingRulesAction}>
        <Card className="overflow-hidden rounded-xl border-neutral-200/80 bg-white shadow-2xs">
          <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
                <ShieldCheck className="size-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-neutral-900">
                  Refund Deductions & Processing
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500">
                  Delivery fee recovery and restocking fees on customer returns
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <SectionAlert error={processingRulesState.error} message={processingRulesState.message} />

          <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
            {/* Deduct shipping */}
            <div className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3 sm:col-span-2">
              <div>
                <span className="text-xs font-semibold text-neutral-900">
                  Deduct Courier Delivery Fee From Refund
                </span>
                <p className="text-[11px] text-neutral-500">
                  Subtract outbound courier shipping charge from final customer refund
                </p>
              </div>
              <div className="flex items-center">
                <input
                  type="hidden"
                  name="deductShippingFeeFromRefund"
                  value={deductShipping ? "true" : "false"}
                />
                <button
                  type="button"
                  role="switch"
                  aria-checked={deductShipping}
                  onClick={() => setDeductShipping(!deductShipping)}
                  className={cn(
                    "focus-visible:ring-vl-cyan-500 relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2",
                    deductShipping ? "bg-emerald-600" : "bg-neutral-300"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                      deductShipping ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="returnProcessingFee"
                className="text-xs font-semibold tracking-wide text-neutral-700 uppercase"
              >
                Flat Restocking Fee (BDT ৳)
              </label>
              <Input
                id="returnProcessingFee"
                name="returnProcessingFee"
                type="number"
                min={0}
                max={5000}
                defaultValue={initialSettings.returnProcessingFee}
                placeholder="0 (no fee)"
                className="bg-white font-mono"
                required
              />
              {processingRulesState.fieldErrors?.returnProcessingFee && (
                <p className="text-[11px] font-semibold text-rose-600">
                  {processingRulesState.fieldErrors.returnProcessingFee[0]}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label
                htmlFor="restockLocation"
                className="text-xs font-semibold tracking-wide text-neutral-700 uppercase"
              >
                Restock Fulfillment Hub / Warehouse
              </label>
              <Input
                id="restockLocation"
                name="restockLocation"
                type="text"
                defaultValue={initialSettings.restockLocation}
                placeholder="Main Warehouse"
                className="bg-white"
                required
              />
            </div>

            {/* Auto restock */}
            <div className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3 sm:col-span-2">
              <div>
                <span className="text-xs font-semibold text-neutral-900">
                  Auto-Restock Returned Items
                </span>
                <p className="text-[11px] text-neutral-500">
                  Automatically restore returned items into active inventory without manual QC
                </p>
              </div>
              <div className="flex items-center">
                <input
                  type="hidden"
                  name="autoRestockCompletedReturns"
                  value={autoRestock ? "true" : "false"}
                />
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoRestock}
                  onClick={() => setAutoRestock(!autoRestock)}
                  className={cn(
                    "focus-visible:ring-vl-cyan-500 relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2",
                    autoRestock ? "bg-emerald-600" : "bg-neutral-300"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                      autoRestock ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-neutral-100 bg-neutral-50/50 px-5 py-3">
            <p className="text-xs text-neutral-500">
              Restocking fees, courier fee deductions, and warehouse return routing.
            </p>
            <SectionSubmitButton label="Save Processing Rules" />
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
