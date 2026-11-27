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
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Loader2,
  Percent,
  Receipt,
  Save,
} from "lucide-react";

const initialState: TaxInvoiceActionState = { error: null };

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

export function TaxInvoiceForm({ initialSettings }: { initialSettings: TaxInvoiceSettings }) {
  const [taxRulesState, taxRulesAction] = useActionState(updateTaxInvoiceSettingsAction, initialState);
  const [taxIdentityState, taxIdentityAction] = useActionState(updateTaxInvoiceSettingsAction, initialState);
  const [invoiceLayoutState, invoiceLayoutAction] = useActionState(updateTaxInvoiceSettingsAction, initialState);

  const [enableTax, setEnableTax] = useState(initialSettings.enableTax);
  const [applyShippingTax, setApplyShippingTax] = useState(initialSettings.applyTaxToShipping);
  const [mushak63, setMushak63] = useState(initialSettings.enableMushak63Format);
  const [digitalSeal, setDigitalSeal] = useState(initialSettings.showDigitalSeal);

  return (
    <div className="space-y-4">
      {/* ── SECTION 1: VAT & TAX CALCULATION RULES ── */}
      <form action={taxRulesAction}>
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
              <Switch
                name="enableTax"
                checked={enableTax}
                onCheckedChange={setEnableTax}
                activeColor="emerald"
                aria-label="Enable VAT & Tax Calculation"
              />
            </div>
          </CardHeader>

          <SectionAlert error={taxRulesState.error} message={taxRulesState.message} />

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
              {taxRulesState.fieldErrors?.vatRatePercent && (
                <p className="text-[11px] font-semibold text-rose-600">
                  {taxRulesState.fieldErrors.vatRatePercent[0]}
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
              <Switch
                name="applyTaxToShipping"
                checked={applyShippingTax}
                onCheckedChange={setApplyShippingTax}
                disabled={!enableTax}
                activeColor="emerald"
                aria-label="Apply VAT to Courier Delivery Charges"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-neutral-100 bg-neutral-50/50 px-5 py-3">
            <p className="text-xs text-neutral-500">
              Configure Bangladesh VAT rate, inclusive/exclusive pricing, and delivery tax rules.
            </p>
            <SectionSubmitButton label="Save Tax Rules" />
          </CardFooter>
        </Card>
      </form>

      {/* ── SECTION 2: NBR REGISTRATION & TAX IDENTITY ── */}
      <form action={taxIdentityAction}>
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

          <SectionAlert error={taxIdentityState.error} message={taxIdentityState.message} />

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

          <CardFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-neutral-100 bg-neutral-50/50 px-5 py-3">
            <p className="text-xs text-neutral-500">
              Official NBR Business Identification Number (BIN) and registered office details.
            </p>
            <SectionSubmitButton label="Save Tax Identity" />
          </CardFooter>
        </Card>
      </form>

      {/* ── SECTION 3: MUSHAK 6.3 & INVOICE FORMATTING ── */}
      <form action={invoiceLayoutAction}>
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

          <SectionAlert error={invoiceLayoutState.error} message={invoiceLayoutState.message} />

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
              <Switch
                name="enableMushak63Format"
                checked={mushak63}
                onCheckedChange={setMushak63}
                activeColor="purple"
                aria-label="Mushak 6.3 Compliance Format"
              />
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
              <Switch
                name="showDigitalSeal"
                checked={digitalSeal}
                onCheckedChange={setDigitalSeal}
                activeColor="purple"
                aria-label="Display Verified Digital Stamp / Seal"
              />
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

          <CardFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-neutral-100 bg-neutral-50/50 px-5 py-3">
            <p className="text-xs text-neutral-500">
              Mushak 6.3 layout settings, invoice prefix, digital verification seal, and footer declarations.
            </p>
            <SectionSubmitButton label="Save Invoice Layout" />
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
