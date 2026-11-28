"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  updateLoyaltySettingsAction,
  type LoyaltySettingsActionState,
} from "@/lib/admin/settings/loyalty-settings-actions";
import type { LoyaltyProgramSettings } from "@/lib/settings/loyalty-settings";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Coins,
  Crown,
  Globe,
  Loader2,
  Save,
  Sparkles,
  Store,
} from "lucide-react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

const initialState: LoyaltySettingsActionState = { error: null };

function SectionSubmitButton({ label = "Save Changes" }: { label?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      variant="primary"
      size="sm"
      className="gap-2 px-4 font-semibold shadow-2xs"
    >
      {pending ? (
        <>
          <Loader2 className="size-3.5 animate-spin text-white" />
          <span>Saving...</span>
        </>
      ) : (
        <>
          <Save className="size-3.5" />
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

export function LoyaltySettingsForm({
  initialSettings,
}: {
  initialSettings: LoyaltyProgramSettings;
}) {
  const [formState, formAction] = useActionState(updateLoyaltySettingsAction, initialState);

  // Local switch states
  const [enabled, setEnabled] = useState(initialSettings.enabled);
  const [enableInPos, setEnableInPos] = useState(initialSettings.enableInPos);
  const [enableOnline, setEnableOnline] = useState(initialSettings.enableOnline);

  // Rate states for live preview
  const [spendPerPoint, setSpendPerPoint] = useState(initialSettings.spendAmountPerPoint);
  const [pointValue, setPointValue] = useState(initialSettings.pointRedemptionValue);

  return (
    <div className="space-y-4">
      {/* ── SECTION 1: PROGRAM STATUS & CHANNELS ── */}
      <form action={formAction}>
        <input type="hidden" name="enabled" value={String(enabled)} />
        <input type="hidden" name="enableInPos" value={String(enableInPos)} />
        <input type="hidden" name="enableOnline" value={String(enableOnline)} />

        <Card className="rounded-brand overflow-hidden border-neutral-200/80 bg-white shadow-2xs">
          <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-5 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-brand flex size-8 items-center justify-center border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
                  <Sparkles className="text-vl-cyan-600 size-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-neutral-900">
                    Loyalty Program Status &amp; Channels
                  </CardTitle>
                  <CardDescription className="text-xs text-neutral-500">
                    Enable customer reward points and select available shopping channels
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant="outline"
                className={
                  enabled
                    ? "border-emerald-300 bg-emerald-50 text-[11px] font-bold text-emerald-800"
                    : "border-neutral-200 bg-neutral-100 text-[11px] font-medium text-neutral-600"
                }
              >
                {enabled ? "ACTIVE" : "PAUSED"}
              </Badge>
            </div>
          </CardHeader>

          <SectionAlert error={formState.error} message={formState.message} />

          <CardContent className="space-y-4 p-5 text-xs">
            {/* Master Toggle */}
            <div className="rounded-brand flex items-center justify-between border border-neutral-200 bg-neutral-50/50 p-3">
              <div className="space-y-0.5">
                <span className="font-semibold text-neutral-900">
                  Enable Customer Loyalty Program
                </span>
                <p className="text-[11px] text-neutral-500">
                  When enabled, registered shoppers and verified phone numbers accumulate reward
                  points
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            {/* Channel Toggles */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-brand flex items-center justify-between border border-neutral-200 p-3">
                <div className="flex items-center gap-2">
                  <Store className="size-4 text-neutral-600" />
                  <div>
                    <span className="font-medium text-neutral-900">Physical Store POS</span>
                    <p className="text-[10px] text-neutral-500">
                      Counter lookup &amp; instant billing redemption
                    </p>
                  </div>
                </div>
                <Switch
                  checked={enableInPos}
                  onCheckedChange={setEnableInPos}
                  disabled={!enabled}
                />
              </div>

              <div className="rounded-brand flex items-center justify-between border border-neutral-200 p-3">
                <div className="flex items-center gap-2">
                  <Globe className="size-4 text-neutral-600" />
                  <div>
                    <span className="font-medium text-neutral-900">Online Storefront</span>
                    <p className="text-[10px] text-neutral-500">
                      Customer account portal &amp; checkout redemption
                    </p>
                  </div>
                </div>
                <Switch
                  checked={enableOnline}
                  onCheckedChange={setEnableOnline}
                  disabled={!enabled}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end border-t border-neutral-100 bg-neutral-50/30 px-5 py-3">
            <SectionSubmitButton label="Save Program Status" />
          </CardFooter>
        </Card>
      </form>

      {/* ── SECTION 2: EARNING & REDEMPTION RULES ── */}
      <form action={formAction}>
        <input type="hidden" name="enabled" value={String(enabled)} />
        <input type="hidden" name="enableInPos" value={String(enableInPos)} />
        <input type="hidden" name="enableOnline" value={String(enableOnline)} />

        <Card className="rounded-brand overflow-hidden border-neutral-200/80 bg-white shadow-2xs">
          <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="rounded-brand flex size-8 items-center justify-center border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
                <Coins className="size-4 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-neutral-900">
                  Points Earning &amp; Redemption Rates
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500">
                  Configure how points are earned on purchases and their cash discount value
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <SectionAlert error={formState.error} message={formState.message} />

          <CardContent className="space-y-4 p-5 text-xs">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="font-semibold text-neutral-800">Spend Amount per Point (৳)</label>
                <div className="relative">
                  <span className="absolute top-2 left-3 font-mono font-bold text-neutral-400">
                    ৳
                  </span>
                  <Input
                    type="number"
                    name="spendAmountPerPoint"
                    min="10"
                    max="10000"
                    defaultValue={initialSettings.spendAmountPerPoint}
                    onChange={(e) => setSpendPerPoint(Number(e.target.value) || 100)}
                    className="pl-8"
                  />
                </div>
                <p className="text-[10px] text-neutral-500">
                  Customer receives 1 point for every ৳{spendPerPoint} spent
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-neutral-800">Point Redemption Value (৳)</label>
                <div className="relative">
                  <span className="absolute top-2 left-3 font-mono font-bold text-neutral-400">
                    ৳
                  </span>
                  <Input
                    type="number"
                    step="0.1"
                    name="pointRedemptionValue"
                    min="0.1"
                    max="100"
                    defaultValue={initialSettings.pointRedemptionValue}
                    onChange={(e) => setPointValue(Number(e.target.value) || 1)}
                    className="pl-8"
                  />
                </div>
                <p className="text-[10px] text-neutral-500">
                  1 redeemed point gives a ৳{pointValue} direct order discount
                </p>
              </div>
            </div>

            {/* Live Calculation Preview Banner */}
            <div className="rounded-brand border-vl-cyan-200 bg-vl-cyan-50/50 border p-3 text-[11px] text-neutral-700">
              <span className="font-bold text-neutral-900">Live Reward Example: </span>A purchase of
              ৳1,000 earns <strong>{Math.floor(1000 / Math.max(1, spendPerPoint))} points</strong>.
              When redeemed, these points reduce a future bill by{" "}
              <strong>
                ৳{(Math.floor(1000 / Math.max(1, spendPerPoint)) * pointValue).toFixed(0)}
              </strong>{" "}
              (Effective reward cashback:{" "}
              {(
                ((Math.floor(1000 / Math.max(1, spendPerPoint)) * pointValue) / 1000) *
                100
              ).toFixed(1)}
              %).
            </div>

            {/* Redemption Guardrails */}
            <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="font-semibold text-neutral-800">Minimum Points to Redeem</label>
                <Input
                  type="number"
                  name="minPointsToRedeem"
                  min="0"
                  defaultValue={initialSettings.minPointsToRedeem}
                />
                <p className="text-[10px] text-neutral-500">
                  Customers must have at least this balance before points can be applied
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-neutral-800">
                  Max Cart Discount Coverage (%)
                </label>
                <Input
                  type="number"
                  name="maxCartDiscountPercentage"
                  min="1"
                  max="100"
                  defaultValue={initialSettings.maxCartDiscountPercentage}
                />
                <p className="text-[10px] text-neutral-500">
                  Points cannot exceed this percentage of the order subtotal (100% = full coverage)
                </p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end border-t border-neutral-100 bg-neutral-50/30 px-5 py-3">
            <SectionSubmitButton label="Save Earning &amp; Redemption Rates" />
          </CardFooter>
        </Card>
      </form>

      {/* ── SECTION 3: VIP CUSTOMER TIERS ── */}
      <form action={formAction}>
        <input type="hidden" name="enabled" value={String(enabled)} />
        <input type="hidden" name="enableInPos" value={String(enableInPos)} />
        <input type="hidden" name="enableOnline" value={String(enableOnline)} />

        <Card className="rounded-brand overflow-hidden border-neutral-200/80 bg-white shadow-2xs">
          <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="rounded-brand flex size-8 items-center justify-center border border-neutral-200 bg-white text-neutral-800 shadow-2xs">
                <Crown className="size-4 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-neutral-900">
                  VIP Membership Tiers &amp; Thresholds
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500">
                  Lifetime spend thresholds in BDT (৳) required to unlock loyalty tiers
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <SectionAlert error={formState.error} message={formState.message} />

          <CardContent className="space-y-4 p-5 text-xs">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              {/* Bronze (Baseline) */}
              <div className="rounded-brand border border-neutral-200 bg-neutral-50/50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className="border-neutral-300 bg-neutral-200/60 font-bold text-neutral-800"
                  >
                    BRONZE
                  </Badge>
                  <Award className="size-4 text-neutral-500" />
                </div>
                <span className="block text-[11px] font-bold text-neutral-900">
                  Baseline Shoppers
                </span>
                <p className="mt-1 font-mono text-xs font-semibold text-neutral-600">
                  ৳0 - First Order
                </p>
                <p className="mt-1 text-[10px] text-neutral-500">
                  Standard reward point accumulation
                </p>
              </div>

              {/* Silver */}
              <div className="rounded-brand border border-slate-200 bg-slate-50/50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className="border-slate-300 bg-slate-200/70 font-bold text-slate-800"
                  >
                    SILVER
                  </Badge>
                  <Award className="size-4 text-slate-600" />
                </div>
                <label className="block text-[11px] font-bold text-neutral-900">
                  Min Lifetime Spend (৳)
                </label>
                <Input
                  type="number"
                  name="silverThreshold"
                  min="500"
                  defaultValue={initialSettings.silverThreshold}
                  className="mt-1.5 h-8 bg-white font-mono text-xs font-semibold"
                />
                <p className="mt-1 text-[10px] text-neutral-500">
                  Qualifies for Silver tier privileges
                </p>
              </div>

              {/* Gold */}
              <div className="rounded-brand border border-amber-200 bg-amber-50/40 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className="border-amber-300 bg-amber-200/80 font-bold text-amber-900"
                  >
                    GOLD
                  </Badge>
                  <Crown className="size-4 text-amber-600" />
                </div>
                <label className="block text-[11px] font-bold text-neutral-900">
                  Min Lifetime Spend (৳)
                </label>
                <Input
                  type="number"
                  name="goldThreshold"
                  min="1000"
                  defaultValue={initialSettings.goldThreshold}
                  className="mt-1.5 h-8 bg-white font-mono text-xs font-semibold"
                />
                <p className="mt-1 text-[10px] text-neutral-500">
                  High-value frequent store shopper
                </p>
              </div>

              {/* Platinum */}
              <div className="rounded-brand border-vl-cyan-200 bg-vl-cyan-50/30 border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className="border-vl-cyan-300 bg-vl-cyan-200/90 font-bold text-neutral-900"
                  >
                    PLATINUM
                  </Badge>
                  <Crown className="text-vl-cyan-600 size-4" />
                </div>
                <label className="block text-[11px] font-bold text-neutral-900">
                  Min Lifetime Spend (৳)
                </label>
                <Input
                  type="number"
                  name="platinumThreshold"
                  min="2000"
                  defaultValue={initialSettings.platinumThreshold}
                  className="mt-1.5 h-8 bg-white font-mono text-xs font-semibold"
                />
                <p className="mt-1 text-[10px] text-neutral-500">VIP flagship luxury tier status</p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end border-t border-neutral-100 bg-neutral-50/30 px-5 py-3">
            <SectionSubmitButton label="Save VIP Tier Thresholds" />
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
