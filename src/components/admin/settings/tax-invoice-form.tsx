"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { TaxInvoiceSettings } from "@/lib/settings/tax-invoice-settings";
import {
  updateTaxInvoiceSettingsAction,
  type TaxInvoiceActionState,
} from "@/lib/admin/settings/tax-invoice-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Loader2,
  Percent,
  Receipt,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

const initialState: TaxInvoiceActionState = { error: null };

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
          <Loader2 className="size-4 animate-spin text-white" aria-hidden="true" />
          <span>Saving Tax Settings...</span>
        </>
      ) : (
        <>
          <Save className="size-4" aria-hidden="true" />
          <span>Save Tax & Invoice Configuration</span>
        </>
      )}
    </Button>
  );
}

export function TaxInvoiceForm({ initialSettings }: { initialSettings: TaxInvoiceSettings }) {
  const [state, formAction] = useActionState(updateTaxInvoiceSettingsAction, initialState);

  const [enableTax, setEnableTax] = useState(initialSettings.enableTax);
  const [applyShippingTax, setApplyShippingTax] = useState(initialSettings.applyTaxToShipping);
  const [mushak63, setMushak63] = useState(initialSettings.enableMushak63Format);
  const [digitalSeal, setDigitalSeal] = useState(initialSettings.showDigitalSeal);

  return (
    <form action={formAction} className="space-y-4">
      {/* ── ALERTS (ERROR & SUCCESS) ── */}
      {state.error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-900 shadow-2xs">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-600" />
          <div>
            <h4 className="font-bold">Failed to update tax settings</h4>
            <p className="mt-0.5 text-xs text-rose-700">{state.error}</p>
          </div>
        </div>
      )}

      {state.message && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm text-emerald-900 shadow-2xs">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div>
            <h4 className="font-bold">Tax & invoice configuration updated</h4>
            <p className="mt-0.5 text-xs text-emerald-700">{state.message}</p>
          </div>
        </div>
      )}

      {/* ── SECTION 1: VAT & TAX CALCULATION RULES ── */}
      <Card className="overflow-hidden rounded-xl border-neutral-200/80 bg-white shadow-2xs">
        <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-5 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
                <Percent className="size-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-neutral-900">
                  VAT & Tax Calculation Rules
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500">
                  Value Added Tax rates and price calculation modes
                </CardDescription>
              </div>
            </div>

            {/* Modern Switch */}
            <div className="flex items-center">
              <input type="hidden" name="enableTax" value={enableTax ? "true" : "false"} />
              <button
                type="button"
                role="switch"
                aria-checked={enableTax}
                onClick={() => setEnableTax(!enableTax)}
                className={cn(
                  "focus-visible:ring-vl-cyan-500 relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2",
                  enableTax ? "bg-emerald-600" : "bg-neutral-300"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                    enableTax ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          {/* Rate Percent */}
          <div className="space-y-1">
            <label
              htmlFor="vatRatePercent"
              className="text-xs font-semibold tracking-wide text-neutral-700 uppercase"
            >
              Standard VAT Rate (%) <span className="text-rose-500">*</span>
            </label>
            <Input
              id="vatRatePercent"
              name="vatRatePercent"
              type="number"
              step="0.1"
              min={0}
              max={30}
              defaultValue={initialSettings.vatRatePercent}
              disabled={!enableTax}
              placeholder="5 or 7.5"
              className="bg-white font-mono"
              required
            />
            {state.fieldErrors?.vatRatePercent && (
              <p className="text-[11px] font-semibold text-rose-600">
                {state.fieldErrors.vatRatePercent[0]}
              </p>
            )}
          </div>

          {/* Pricing Tax Mode */}
          <div className="space-y-1">
            <label
              htmlFor="taxCalculationMode"
              className="text-xs font-semibold tracking-wide text-neutral-700 uppercase"
            >
              Pricing Tax Mode
            </label>
            <select
              id="taxCalculationMode"
              name="taxCalculationMode"
              defaultValue={initialSettings.taxCalculationMode}
              disabled={!enableTax}
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-900 shadow-2xs focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none"
            >
              <option value="INCLUSIVE">INCLUSIVE (Product prices already include VAT)</option>
              <option value="EXCLUSIVE">EXCLUSIVE (VAT added on top at checkout)</option>
            </select>
          </div>

          {/* Apply Tax to Shipping */}
          <div className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3 sm:col-span-2">
            <div>
              <span className="text-xs font-semibold text-neutral-900">
                Apply VAT to Courier Delivery Charges
              </span>
              <p className="text-[11px] text-neutral-500">
                Calculate VAT on shipping fees in addition to product subtotal
              </p>
            </div>
            <div className="flex items-center">
              <input
                type="hidden"
                name="applyTaxToShipping"
                value={applyShippingTax ? "true" : "false"}
              />
              <button
                type="button"
                role="switch"
                disabled={!enableTax}
                aria-checked={applyShippingTax}
                onClick={() => setApplyShippingTax(!applyShippingTax)}
                className={cn(
                  "focus-visible:ring-vl-cyan-500 relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2",
                  applyShippingTax ? "bg-emerald-600" : "bg-neutral-300",
                  !enableTax && "cursor-not-allowed opacity-50"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                    applyShippingTax ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 2: NBR REGISTRATION & TAX IDENTITY ── */}
      <Card className="overflow-hidden rounded-xl border-neutral-200/80 bg-white shadow-2xs">
        <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
              <Building2 className="text-vl-cyan-600 size-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-neutral-900">
                NBR Registration & Tax Identity
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Business Identification Number (BIN) and registered tax circle
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <label
              htmlFor="registeredBusinessName"
              className="text-xs font-semibold tracking-wide text-neutral-700 uppercase"
            >
              Registered Legal Business Name <span className="text-rose-500">*</span>
            </label>
            <Input
              id="registeredBusinessName"
              name="registeredBusinessName"
              type="text"
              defaultValue={initialSettings.registeredBusinessName}
              placeholder="Registered legal company name"
              className="bg-white"
              required
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="binNumber"
              className="text-xs font-semibold tracking-wide text-neutral-700 uppercase"
            >
              NBR BIN (Business Identification No.)
            </label>
            <Input
              id="binNumber"
              name="binNumber"
              type="text"
              defaultValue={initialSettings.binNumber}
              placeholder="13-digit BIN"
              className="bg-white font-mono"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="taxCircle"
              className="text-xs font-semibold tracking-wide text-neutral-700 uppercase"
            >
              Tax Circle
            </label>
            <Input
              id="taxCircle"
              name="taxCircle"
              type="text"
              defaultValue={initialSettings.taxCircle}
              placeholder="Tax Circle name"
              className="bg-white"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="taxZone"
              className="text-xs font-semibold tracking-wide text-neutral-700 uppercase"
            >
              Taxes Zone / Commissionerate
            </label>
            <Input
              id="taxZone"
              name="taxZone"
              type="text"
              defaultValue={initialSettings.taxZone}
              placeholder="Taxes Zone / Commissionerate"
              className="bg-white"
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label
              htmlFor="registeredOfficeAddress"
              className="text-xs font-semibold tracking-wide text-neutral-700 uppercase"
            >
              Registered Legal Business Address <span className="text-rose-500">*</span>
            </label>
            <Input
              id="registeredOfficeAddress"
              name="registeredOfficeAddress"
              type="text"
              defaultValue={initialSettings.registeredOfficeAddress}
              placeholder="Registered business address"
              className="bg-white"
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 3: MUSHAK 6.3 & INVOICE FORMATTING ── */}
      <Card className="overflow-hidden rounded-xl border-neutral-200/80 bg-white shadow-2xs">
        <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
              <Receipt className="size-4 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-neutral-900">
                Mushak 6.3 & Invoice Layout
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Official invoice numbering, customer care hotline, and footer declarations
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3">
            <div>
              <span className="text-xs font-semibold text-neutral-900">
                Mushak 6.3 (মূসক-৬.৩) Compliance Format
              </span>
              <p className="mt-0.5 text-[11px] text-neutral-500">
                Generates official tax invoice format with itemized subtotal and VAT rate
              </p>
            </div>
            <div className="flex items-center">
              <input
                type="hidden"
                name="enableMushak63Format"
                value={mushak63 ? "true" : "false"}
              />
              <button
                type="button"
                role="switch"
                aria-checked={mushak63}
                onClick={() => setMushak63(!mushak63)}
                className={cn(
                  "focus-visible:ring-vl-cyan-500 relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2",
                  mushak63 ? "bg-purple-600" : "bg-neutral-300"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                    mushak63 ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label
                htmlFor="invoicePrefix"
                className="text-xs font-semibold tracking-wide text-neutral-700 uppercase"
              >
                Invoice Number Prefix <span className="text-rose-500">*</span>
              </label>
              <Input
                id="invoicePrefix"
                name="invoicePrefix"
                type="text"
                defaultValue={initialSettings.invoicePrefix}
                placeholder="VL-INV-"
                className="bg-white font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="customerCareContact"
                className="text-xs font-semibold tracking-wide text-neutral-700 uppercase"
              >
                Billing & Customer Care Hotline <span className="text-rose-500">*</span>
              </label>
              <Input
                id="customerCareContact"
                name="customerCareContact"
                type="text"
                defaultValue={initialSettings.customerCareContact}
                placeholder="01XXXXXXXXX"
                className="bg-white font-mono"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-3">
            <div>
              <span className="text-xs font-semibold text-neutral-900">
                Display Verified Digital Stamp / Seal
              </span>
              <p className="text-[11px] text-neutral-500">
                Renders a digital verification seal on printed customer PDF invoices
              </p>
            </div>
            <div className="flex items-center">
              <input type="hidden" name="showDigitalSeal" value={digitalSeal ? "true" : "false"} />
              <button
                type="button"
                role="switch"
                aria-checked={digitalSeal}
                onClick={() => setDigitalSeal(!digitalSeal)}
                className={cn(
                  "focus-visible:ring-vl-cyan-500 relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2",
                  digitalSeal ? "bg-purple-600" : "bg-neutral-300"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                    digitalSeal ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="invoiceFooterNote"
              className="text-xs font-semibold tracking-wide text-neutral-700 uppercase"
            >
              Invoice Footer Notice & Statutory Declaration <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="invoiceFooterNote"
              name="invoiceFooterNote"
              rows={3}
              defaultValue={initialSettings.invoiceFooterNote}
              placeholder="Notice or statutory text printed at the bottom of customer invoices"
              className="w-full rounded-md border border-neutral-200 bg-white p-3 font-mono text-xs text-neutral-900 shadow-2xs focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* ── BOTTOM ACTION FOOTER (NATURAL FLOW, NO FLOATING) ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-neutral-200/80 bg-white p-3.5 sm:px-4 shadow-2xs">
        <div className="text-xs text-neutral-500">
          <span>Tax rates and invoice layout changes apply to all future orders and receipts.</span>
        </div>
        <div className="flex items-center justify-end">
          <SubmitButton />
        </div>
      </div>
    </form>
  );
}
