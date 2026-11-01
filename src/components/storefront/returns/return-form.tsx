"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  Plus,
  Minus,
  Camera,
  X,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Package,
  FileText,
  CreditCard,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { createReturnRequestAction, uploadReturnProofAction } from "@/lib/returns/actions";
import { RETURN_REASONS } from "@/lib/returns/utils";
import { OrderItemSummary } from "@/lib/orders/types";

interface ReturnItem extends OrderItemSummary {
  returnableQuantity: number;
}

interface ReturnFormProps {
  orderNumber: string;
  items: ReturnItem[];
  daysRemaining?: number;
}

export function ReturnForm({ orderNumber, items, daysRemaining = 3 }: ReturnFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [reason, setReason] = useState<string>("");
  const [customerNote, setCustomerNote] = useState<string>("");
  const [images, setImages] = useState<string[]>([]);

  // Track selected quantity for each item ID
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});

  // Toggle item selection
  const handleToggleItem = (itemId: string, maxQty: number) => {
    setSelectedQuantities((prev) => {
      const current = prev[itemId] || 0;
      if (current > 0) {
        // Deselect
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      // Select with 1 item by default
      return { ...prev, [itemId]: Math.min(1, maxQty) };
    });
  };

  // Adjust quantity stepper
  const handleStepQuantity = (itemId: string, delta: number, maxQty: number) => {
    setSelectedQuantities((prev) => {
      const current = prev[itemId] || 0;
      const nextQty = Math.max(1, Math.min(maxQty, current + delta));
      return { ...prev, [itemId]: nextQty };
    });
  };

  const selectedEntries = Object.entries(selectedQuantities).filter(([, qty]) => qty > 0);
  const totalSelectedCount = selectedEntries.reduce((sum, [, qty]) => sum + qty, 0);

  const calculateTotalRefundEst = () => {
    let total = 0;
    for (const item of items) {
      const qty = selectedQuantities[item.id] || 0;
      total += qty * item.unitPrice;
    }
    return total;
  };

  const selectedReasonObj = RETURN_REASONS.find((r) => r.value === reason);
  const requiresProof = selectedReasonObj ? selectedReasonObj.requiresProof : false;

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (images.length >= 5) {
      toast.error("You can upload up to 5 photos.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo size must be less than 5MB.");
      return;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadReturnProofAction(formData);
      if (res.success && res.url) {
        setImages((prev) => [...prev, res.url!]);
        toast.success("Photo proof attached.");
      } else {
        toast.error(res.error || "Failed to upload photo proof.");
      }
    } catch {
      toast.error("An error occurred during photo upload.");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedItems = selectedEntries.map(([orderItemId, quantity]) => ({
      orderItemId,
      quantity,
    }));

    if (selectedItems.length === 0) {
      toast.error("Please tap on at least one item you wish to return.");
      return;
    }

    if (!reason) {
      toast.error("Please select a return reason below.");
      return;
    }

    if (requiresProof && images.length === 0) {
      toast.error("Photo proof is mandatory for defective or incorrect items.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createReturnRequestAction({
        orderNumber,
        reason,
        customerNote,
        images,
        items: selectedItems,
      });

      if (res.success) {
        toast.success("message" in res ? (res.message as string) : "Return request submitted.");
        router.push(`/account/orders/${orderNumber}`);
      } else {
        toast.error("error" in res ? (res.error as string) : "An error occurred");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalEst = calculateTotalRefundEst();
  const totalReturnableItems = items.reduce((s, it) => s + it.returnableQuantity, 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24 sm:pb-0">
      {/* 2-Column Responsive Layout Matching Order Details */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Left Column: Item Selection & Reason Details */}
        <div className="space-y-6">
          {/* Item Selection Card */}
          <div className="rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
            <h2 className="flex items-center gap-2 border-b border-[#101114]/10 pb-4 text-base font-bold text-[#101114]">
              <Package className="size-4.5 text-[#101114]" />
              <span>Select Items to Return</span>
              <span className="text-muted-foreground ml-auto rounded-full bg-[#101114]/5 px-2.5 py-0.5 text-xs font-bold">
                {totalSelectedCount} of {totalReturnableItems} items selected
              </span>
            </h2>

            <ul className="mt-2 divide-y divide-[#101114]/10">
              {items.map((item) => {
                const isSelected = (selectedQuantities[item.id] || 0) > 0;
                const currentQty = selectedQuantities[item.id] || 0;

                return (
                  <li
                    key={item.id}
                    className="flex flex-col gap-4 py-4 first:pt-4 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    {/* Item Checkbox, Thumbnail & Info */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleToggleItem(item.id, item.returnableQuantity)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleToggleItem(item.id, item.returnableQuantity);
                        }
                      }}
                      className="flex flex-1 cursor-pointer items-start gap-3.5 select-none"
                    >
                      {/* Touch Checkbox */}
                      <div
                        className={`mt-1 flex size-5 shrink-0 items-center justify-center rounded-lg border transition-all ${
                          isSelected
                            ? "border-[#101114] bg-[#101114] text-white"
                            : "border-[#101114]/20 bg-white hover:border-[#101114]/40"
                        }`}
                      >
                        {isSelected && <Check className="size-3.5 stroke-[3]" />}
                      </div>

                      {/* Thumbnail */}
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#101114]/10 bg-[#101114]">
                        <Image
                          src="/images/categories/cat-t-shirts.jpg"
                          alt={item.productName}
                          fill
                          sizes="56px"
                          className="object-cover opacity-85"
                        />
                      </div>

                      {/* Item Details */}
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold text-[#101114]">
                          {item.productName}
                        </h3>
                        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                          {[item.size && `Size: ${item.size}`, item.color && `Color: ${item.color}`]
                            .filter(Boolean)
                            .map((opt) => (
                              <span
                                key={opt as string}
                                className="rounded-md bg-[#F3F0E8] px-2 py-0.5 font-medium text-[#101114]"
                              >
                                {opt}
                              </span>
                            ))}
                          <span className="font-mono text-[#101114]/50">SKU: {item.sku}</span>
                          <span>• Max: {item.returnableQuantity}</span>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <p className="text-sm font-black text-[#101114]">
                          ৳ {(item.unitPrice * (currentQty || 1)).toLocaleString("en-BD")}
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          ৳ {item.unitPrice.toLocaleString("en-BD")} each
                        </p>
                      </div>
                    </div>

                    {/* Stepper Quantity Control */}
                    {isSelected && (
                      <div className="flex items-center justify-between gap-2 border-t border-[#101114]/10 pt-2.5 pl-8 sm:justify-end sm:border-t-0 sm:pt-0 sm:pl-0">
                        <span className="text-muted-foreground text-xs font-semibold sm:hidden">
                          Return Qty:
                        </span>
                        <div className="flex items-center rounded-xl border border-[#101114]/15 bg-white shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleStepQuantity(item.id, -1, item.returnableQuantity)}
                            disabled={currentQty <= 1}
                            aria-label="Decrease return quantity"
                            className="flex size-8 items-center justify-center rounded-l-xl text-[#101114] transition hover:bg-[#F3F0E8] disabled:opacity-30"
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-[#101114]">
                            {currentQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStepQuantity(item.id, 1, item.returnableQuantity)}
                            disabled={currentQty >= item.returnableQuantity}
                            aria-label="Increase return quantity"
                            className="flex size-8 items-center justify-center rounded-r-xl text-[#101114] transition hover:bg-[#F3F0E8] disabled:opacity-30"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Reason & Photo Proof Card */}
          <div className="space-y-5 rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
            <h2 className="flex items-center gap-2 border-b border-[#101114]/10 pb-4 text-base font-bold text-[#101114]">
              <FileText className="size-4.5 text-[#101114]" />
              <span>Reason & Proof</span>
            </h2>

            {/* Visual Touch Tiles */}
            <div>
              <label className="text-muted-foreground mb-2 block text-xs font-semibold">
                Select Return Reason <span className="text-rose-600">*</span>
              </label>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {RETURN_REASONS.map((r) => {
                  const isSelected = reason === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setReason(r.value)}
                      className={`flex items-center justify-between rounded-xl border p-3.5 text-left text-xs transition-all ${
                        isSelected
                          ? "border-[#101114] bg-[#101114] font-bold text-white shadow-xs"
                          : "border-[#101114]/15 bg-white font-medium text-[#101114] hover:border-[#101114]/30"
                      }`}
                    >
                      <span>{r.label}</span>
                      <div
                        className={`flex size-4.5 shrink-0 items-center justify-center rounded-full border ${
                          isSelected
                            ? "border-white bg-white text-[#101114]"
                            : "border-[#101114]/30"
                        }`}
                      >
                        {isSelected && <Check className="size-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mandatory Proof Alert */}
            {requiresProof && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950">
                <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-bold text-amber-900">Photo Proof Required</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-amber-800">
                    For defective, damaged, or incorrect merchandise, please attach clear photos
                    showing the flaw, stitch, or tag.
                  </p>
                </div>
              </div>
            )}

            {/* Custom Message / Notes Textarea */}
            <div className="space-y-1.5">
              <label
                htmlFor="customerNote"
                className="text-muted-foreground block text-xs font-semibold"
              >
                Custom Message / Additional Details
              </label>
              <textarea
                id="customerNote"
                rows={3}
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                placeholder="Tell us what went wrong (e.g. size runs small, stitching torn on collar, received blue instead of black)..."
                className="placeholder:text-muted-foreground w-full rounded-xl border border-[#101114]/15 bg-white p-3 text-xs text-[#101114] transition outline-none focus:border-[#101114] focus:ring-1 focus:ring-[#101114]"
              />
            </div>

            {/* Photo Proof Upload Zone */}
            <div className="space-y-2.5 border-t border-[#101114]/10 pt-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-[#101114]">
                  <Camera className="size-4 text-[#101114]" />
                  <span>Photo Proof</span>
                  {requiresProof ? (
                    <span className="text-xs font-bold text-rose-600">* Required</span>
                  ) : (
                    <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                  )}
                </span>
                <span className="text-muted-foreground text-xs font-semibold">
                  {images.length}/5 photos
                </span>
              </div>

              {/* Photo Preview Strip */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
                  {images.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-[#101114]/10 bg-[#101114] shadow-2xs"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgUrl}
                        alt={`Proof ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/75 text-white transition hover:bg-black"
                        title="Remove photo"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Button */}
              {images.length < 5 && (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    onChange={handleFileSelected}
                    className="hidden"
                    id="mobile-return-photo-upload"
                    disabled={isUploadingImage}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="flex w-full items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-[#101114]/20 bg-[#F3F0E8]/50 p-4 text-xs font-bold text-[#101114] transition hover:border-[#101114]/40 hover:bg-[#F3F0E8] disabled:opacity-60"
                  >
                    {isUploadingImage ? (
                      <>
                        <Loader2 className="size-4 animate-spin text-[#101114]" />
                        <span>Uploading to Cloudinary...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="size-4 text-[#101114]" />
                        <span>Upload Photos (Camera or Gallery)</span>
                        <span className="text-muted-foreground text-[11px] font-normal">
                          (Max 5MB • JPG, PNG, WebP)
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Refund Summary & Return Policy */}
        <div className="space-y-6">
          {/* Refund Summary Card */}
          <div className="space-y-4 rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
            <h2 className="flex items-center gap-2 border-b border-[#101114]/10 pb-4 text-base font-bold text-[#101114]">
              <CreditCard className="size-4 text-[#101114]" />
              <span>Refund Summary</span>
            </h2>

            <dl className="space-y-2.5 text-xs sm:text-sm">
              <div className="text-muted-foreground flex justify-between">
                <dt>Selected Items</dt>
                <dd className="font-semibold text-[#101114]">
                  {totalSelectedCount} item{totalSelectedCount === 1 ? "" : "s"}
                </dd>
              </div>
              <div className="text-muted-foreground flex justify-between">
                <dt>Merchandise Value</dt>
                <dd className="font-semibold text-[#101114]">
                  ৳ {totalEst.toLocaleString("en-BD")}
                </dd>
              </div>
              <div className="text-muted-foreground flex justify-between">
                <dt>Steadfast Pickup Fee</dt>
                <dd className="font-semibold text-emerald-700">FREE</dd>
              </div>
              <Separator className="my-3! bg-[#101114]/10" />
              <div className="flex justify-between text-base font-black text-[#101114]">
                <dt>Est. Refund Amount</dt>
                <dd className="text-[#101114]">৳ {totalEst.toLocaleString("en-BD")}</dd>
              </div>
            </dl>

            <p className="text-muted-foreground pt-1 text-[11px] leading-relaxed">
              Refund is issued to original payment method or bKash within 3–5 working days after QC
              approval at our Dhaka warehouse.
            </p>

            {/* Desktop Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || totalSelectedCount === 0 || isUploadingImage}
              className="mt-2 hidden h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#101114] px-6 text-xs font-bold tracking-wider text-white uppercase shadow-xs transition hover:bg-[#101114]/90 disabled:opacity-50 sm:inline-flex"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <span>Submit Return Request</span>
                  <ArrowRight className="size-3.5" />
                </>
              )}
            </button>
          </div>

          {/* 3-Day Return Policy Card */}
          <div className="space-y-3 rounded-2xl border border-[#101114]/10 bg-white p-5 shadow-xs sm:p-6">
            <h2 className="flex items-center gap-2 border-b border-[#101114]/10 pb-4 text-base font-bold text-[#101114]">
              <ShieldCheck className="size-4.5 text-emerald-600" />
              <span>3-Day Return Policy</span>
              <span className="text-muted-foreground ml-auto inline-flex items-center gap-1 rounded-full bg-[#101114]/5 px-2 py-0.5 text-xs font-bold">
                <Clock className="size-3" />
                {daysRemaining}d Left
              </span>
            </h2>

            <div className="text-muted-foreground space-y-2.5 text-xs leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="font-bold text-[#101114]">1.</span>
                <p>
                  Ensure product is unwashed, unworn, and all original tags remain securely
                  attached.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-[#101114]">2.</span>
                <p>
                  Our team will review your request and schedule a Steadfast courier pickup from
                  your delivery address.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-[#101114]">3.</span>
                <p>Hand over the parcel inside original poly packaging when the rider arrives.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile Sticky Bottom Action Bar ── */}
      <div className="fixed right-0 bottom-0 left-0 z-40 border-t border-[#101114]/10 bg-white/95 p-3.5 shadow-lg backdrop-blur-md sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-muted-foreground block text-[10px] font-bold tracking-wider uppercase">
              Est. Refund
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-[#101114]">
                ৳ {totalEst.toLocaleString("en-BD")}
              </span>
              <span className="text-muted-foreground text-[10px] font-bold">
                ({totalSelectedCount} item{totalSelectedCount === 1 ? "" : "s"})
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || totalSelectedCount === 0 || isUploadingImage}
            className="inline-flex h-10.5 max-w-[200px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#101114] px-4 text-xs font-black tracking-wider text-white uppercase shadow-xs transition hover:bg-[#101114]/90 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <span>Submit Return</span>
                <ArrowRight className="size-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
