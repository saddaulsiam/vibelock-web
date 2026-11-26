"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { TaxInvoiceSettings } from "@/lib/settings/tax-invoice-settings";
import {
  updateTaxInvoiceSettingsAction,
  type TaxInvoiceActionState,
} from "@/lib/admin/settings/tax-invoice-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileText,
  HelpCircle,
  Loader2,
  Percent,
  Receipt,
  Save,
} from "lucide-react";

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
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
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

  return (
    <form action={formAction} className="space-y-8">
      {/* Status Alerts */}
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

      {/* Grid: 2 columns */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* CARD 1: VAT & TAX CALCULATION RULES */}
        <Card className="border-vl-dark-900/10 shadow-sm dark:border-vl-dark-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <Percent className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">VAT & Tax Calculation Rules</CardTitle>
                <CardDescription className="text-xs">
                  Configure Bangladesh NBR Value Added Tax rates and price display modes.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Enable Tax Master Switch */}
            <div className="rounded-xl border border-vl-dark-900/10 bg-vl-dark-900/[0.02] p-4 dark:border-vl-dark-800 dark:bg-vl-dark-900/40">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="enableTax"
                  value="true"
                  defaultChecked={initialSettings.enableTax}
                  className="mt-1 size-4 rounded border-vl-dark-900/20 text-vl-cyan-600 focus:ring-vl-cyan-500"
                />
                <div>
                  <span className="text-sm font-medium text-vl-dark-900 dark:text-vl-white">
                    Enable VAT / Tax Collection
                  </span>
                  <p className="text-xs text-vl-dark-500 dark:text-vl-dark-400">
                    When active, tax amounts are computed on checkout orders and printed on customer invoices.
                  </p>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="vatRatePercent" className="text-xs font-semibold text-vl-dark-700 dark:text-vl-dark-300">
                  Standard VAT Rate (%)
                </label>
                <div className="relative">
                  <Input
                    id="vatRatePercent"
                    name="vatRatePercent"
                    type="number"
                    step="0.1"
                    min={0}
                    max={30}
                    defaultValue={initialSettings.vatRatePercent}
                    className="pr-8"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-vl-dark-400">
                    %
                  </span>
                </div>
                <p className="text-[11px] text-vl-dark-500">
                  Common rates: 5% (Apparel/Retail), 7.5%, or 15% standard.
                </p>
                {state.fieldErrors?.vatRatePercent && (
                  <p className="text-xs text-red-500">{state.fieldErrors.vatRatePercent[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="taxCalculationMode" className="text-xs font-semibold text-vl-dark-700 dark:text-vl-dark-300">
                  Pricing Tax Mode
                </label>
                <select
                  id="taxCalculationMode"
                  name="taxCalculationMode"
                  defaultValue={initialSettings.taxCalculationMode}
                  className="w-full rounded-md border border-vl-dark-900/20 bg-vl-white px-3 py-2 text-xs text-vl-dark-900 shadow-sm focus:border-vl-cyan-500 focus:outline-none focus:ring-1 focus:ring-vl-cyan-500 dark:border-vl-dark-700 dark:bg-vl-dark-800 dark:text-vl-white"
                >
                  <option value="INCLUSIVE">INCLUSIVE (Prices include VAT)</option>
                  <option value="EXCLUSIVE">EXCLUSIVE (VAT added on checkout)</option>
                </select>
                <p className="text-[11px] text-vl-dark-500">
                  INCLUSIVE is standard consumer retail in Bangladesh.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="applyTaxToShipping"
                  value="true"
                  defaultChecked={initialSettings.applyTaxToShipping}
                  className="mt-1 size-4 rounded border-vl-dark-900/20 text-vl-cyan-600 focus:ring-vl-cyan-500"
                />
                <div>
                  <span className="text-sm font-medium text-vl-dark-900 dark:text-vl-white">
                    Apply Tax to Courier Delivery Charges
                  </span>
                  <p className="text-xs text-vl-dark-500 dark:text-vl-dark-400">
                    If checked, VAT percentage is also calculated over shipping fees in addition to product subtotal.
                  </p>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: NBR REGISTRATION & MUSHAK 6.3 LEGAL ENTITY */}
        <Card className="border-vl-dark-900/10 shadow-sm dark:border-vl-dark-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-vl-cyan-500/10 text-vl-cyan-600 dark:bg-vl-cyan-500/20 dark:text-vl-cyan-400">
                <Building2 className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">NBR Registration & Tax Identity</CardTitle>
                <CardDescription className="text-xs">
                  Official Business Identification Number (BIN) and legal tax jurisdiction info.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="registeredBusinessName" className="text-xs font-semibold text-vl-dark-700 dark:text-vl-dark-300">
                Registered Legal Business Name
              </label>
              <Input
                id="registeredBusinessName"
                name="registeredBusinessName"
                type="text"
                defaultValue={initialSettings.registeredBusinessName}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="binNumber" className="text-xs font-semibold text-vl-dark-700 dark:text-vl-dark-300">
                  NBR BIN (Business Identification No.)
                </label>
                <Input
                  id="binNumber"
                  name="binNumber"
                  type="text"
                  defaultValue={initialSettings.binNumber}
                  placeholder="001234567-0101"
                />
                <p className="text-[11px] text-vl-dark-500">Printed prominently on Mushak 6.3 invoices.</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="taxCircle" className="text-xs font-semibold text-vl-dark-700 dark:text-vl-dark-300">
                  Tax Circle
                </label>
                <Input
                  id="taxCircle"
                  name="taxCircle"
                  type="text"
                  defaultValue={initialSettings.taxCircle}
                  placeholder="Circle-15 (Uttara)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="taxZone" className="text-xs font-semibold text-vl-dark-700 dark:text-vl-dark-300">
                Taxes Zone / Commissionerate
              </label>
              <Input
                id="taxZone"
                name="taxZone"
                type="text"
                defaultValue={initialSettings.taxZone}
                placeholder="Taxes Zone-08, Dhaka"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="registeredOfficeAddress" className="text-xs font-semibold text-vl-dark-700 dark:text-vl-dark-300">
                Registered Legal Business Address
              </label>
              <Input
                id="registeredOfficeAddress"
                name="registeredOfficeAddress"
                type="text"
                defaultValue={initialSettings.registeredOfficeAddress}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* CARD 3: MUSHAK 6.3 & INVOICE FORMATTING */}
        <Card className="border-vl-dark-900/10 shadow-sm dark:border-vl-dark-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                <Receipt className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Mushak 6.3 & Invoice Layout</CardTitle>
                <CardDescription className="text-xs">
                  Bangladesh standard tax invoice numbering, headers, and digital compliance formatting.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-xl border border-vl-dark-900/10 bg-vl-dark-900/[0.02] p-4 dark:border-vl-dark-800 dark:bg-vl-dark-900/40">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="enableMushak63Format"
                  value="true"
                  defaultChecked={initialSettings.enableMushak63Format}
                  className="mt-1 size-4 rounded border-vl-dark-900/20 text-vl-cyan-600 focus:ring-vl-cyan-500"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-vl-dark-900 dark:text-vl-white">
                      Mushak 6.3 (মূসক-৬.৩) Compliance Layout
                    </span>
                    <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-200">
                      NBR Standard
                    </Badge>
                  </div>
                  <p className="text-xs text-vl-dark-500 dark:text-vl-dark-400">
                    Generates official tax invoice format with itemized subtotal, VAT rate, and statutory declarations.
                  </p>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="invoicePrefix" className="text-xs font-semibold text-vl-dark-700 dark:text-vl-dark-300">
                  Invoice Number Prefix
                </label>
                <Input
                  id="invoicePrefix"
                  name="invoicePrefix"
                  type="text"
                  defaultValue={initialSettings.invoicePrefix}
                  required
                />
                <p className="text-[11px] text-vl-dark-500">
                  Preview: {initialSettings.invoicePrefix}2026-0042
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="customerCareContact" className="text-xs font-semibold text-vl-dark-700 dark:text-vl-dark-300">
                  Billing & Customer Care Hotline
                </label>
                <Input
                  id="customerCareContact"
                  name="customerCareContact"
                  type="text"
                  defaultValue={initialSettings.customerCareContact}
                  required
                />
              </div>
            </div>

            <div className="pt-2 border-t border-vl-dark-900/10 dark:border-vl-dark-800">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="showDigitalSeal"
                  value="true"
                  defaultChecked={initialSettings.showDigitalSeal}
                  className="mt-1 size-4 rounded border-vl-dark-900/20 text-vl-cyan-600 focus:ring-vl-cyan-500"
                />
                <div>
                  <span className="text-sm font-medium text-vl-dark-900 dark:text-vl-white">
                    Display Verified Digital Merchant Stamp / Seal
                  </span>
                  <p className="text-xs text-vl-dark-500 dark:text-vl-dark-400">
                    Renders an authenticated digital verification mark on printed customer PDF invoices.
                  </p>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* CARD 4: STATUTORY DECLARATION & FOOTER NOTES */}
        <Card className="border-vl-dark-900/10 shadow-sm dark:border-vl-dark-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                <FileText className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Statutory Notes & Legal Terms</CardTitle>
                <CardDescription className="text-xs">
                  Custom legal terms, SRO exemptions, or customer instructions printed at the bottom of each invoice.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="invoiceFooterNote" className="text-xs font-semibold text-vl-dark-700 dark:text-vl-dark-300">
                Invoice Footer Notice & Statutory Declaration
              </label>
              <textarea
                id="invoiceFooterNote"
                name="invoiceFooterNote"
                rows={4}
                defaultValue={initialSettings.invoiceFooterNote}
                className="w-full rounded-md border border-vl-dark-900/20 bg-vl-white p-3 text-xs text-vl-dark-900 shadow-sm focus:border-vl-cyan-500 focus:outline-none focus:ring-1 focus:ring-vl-cyan-500 dark:border-vl-dark-700 dark:bg-vl-dark-800 dark:text-vl-white font-mono"
                required
              />
              <p className="text-[11px] text-vl-dark-500">
                Statutory exemption references (e.g. SRO 186/2019 for digital invoice electronic signatures).
              </p>
            </div>

            <div className="flex items-start gap-2.5 rounded-lg bg-vl-dark-900/[0.04] p-3 text-xs text-vl-dark-600 dark:bg-vl-dark-800/60 dark:text-vl-dark-300">
              <HelpCircle className="size-4 shrink-0 text-vl-cyan-600 mt-0.5" />
              <span>
                Invoices generated through VibeLock calculate tax snapshots atomically at time of checkout, ensuring tax audits and monthly NBR VAT return filings reflect exact historical billing records.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Save Actions Bar */}
      <div className="flex items-center justify-between rounded-xl border border-vl-dark-900/10 bg-vl-dark-900/[0.02] p-4 dark:border-vl-dark-800 dark:bg-vl-dark-900/40">
        <p className="text-xs text-vl-dark-500 dark:text-vl-dark-400">
          Tax and VAT modifications apply to all subsequent orders immediately upon saving.
        </p>
        <SubmitButton />
      </div>
    </form>
  );
}
