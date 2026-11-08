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
  Package,
  FileText,
  CreditCard,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createReturnRequestAction, uploadReturnProofAction } from "@/lib/returns/actions";
import { RETURN_REASONS } from "@/lib/returns/utils";
import { OrderItemSummary } from "@/lib/orders/types";

interface ReturnItem extends OrderItemSummary {
  returnableQuantity: number;
}

interface ReturnFormProps {
  orderNumber: string;
  orderPlacedDate?: string;
  items: ReturnItem[];
  daysRemaining?: number;
}

export function ReturnForm({
  orderNumber,
  orderPlacedDate,
  items,
  daysRemaining = 3,
}: ReturnFormProps) {
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
    <form onSubmit={handleSubmit} className="space-y-6 pb-32 sm:pb-0">
      {/* ── Unified Master Return Request Document ── */}
      <div className="overflow-hidden rounded-2xl border border-vl-dark-900/8 bg-white shadow-2xs">
        {/* Document Header */}
        <div className="border-b border-vl-dark-900/8 p-4 sm:p-6 md:p-7">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold tracking-[0.15em] text-vl-cyan uppercase sm:text-[11px] sm:tracking-[0.2em]">
                  Return & Exchange
                </span>
                {orderPlacedDate && (
                  <>
                    <span className="text-neutral-300">•</span>
                    <span className="text-[11px] text-neutral-500 sm:text-xs">
                      Placed {orderPlacedDate}
                    </span>
                  </>
                )}
              </div>
              <h1 className="mt-0.5 text-lg font-bold tracking-tight text-vl-dark-900 uppercase sm:text-2xl">
                Order #{orderNumber}
              </h1>
            </div>

            <div className="inline-flex items-center gap-1.5 self-start rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 sm:self-auto sm:px-3">
              <Clock className="size-3.5 text-emerald-600" />
              <span>
                {daysRemaining} Day{daysRemaining === 1 ? "" : "s"} Remaining
              </span>
            </div>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">
            Select the items you wish to return, choose a reason, and hand over the parcel to the
            Steadfast courier at your doorstep.
          </p>
        </div>

        {/* 1. Item Selection Section */}
        <div className="border-b border-vl-dark-900/8 p-4 sm:p-6 md:p-7">
          <div className="flex items-center justify-between border-b border-vl-dark-900/8 pb-3.5 sm:pb-4">
            <div className="flex items-center gap-2">
              <Package className="size-4 text-vl-dark-900" />
              <h2 className="text-xs font-bold tracking-wider text-vl-dark-900 uppercase sm:text-sm">
                1. Select Items to Return
              </h2>
            </div>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-700 sm:px-2.5 sm:text-xs">
              {totalSelectedCount} of {totalReturnableItems} selected
            </span>
          </div>

          <ul className="mt-2 divide-y divide-vl-dark-900/6">
            {items.map((item) => {
              const isSelected = (selectedQuantities[item.id] || 0) > 0;
              const currentQty = selectedQuantities[item.id] || 0;

              return (
                <li
                  key={item.id}
                  className={`my-2 rounded-2xl border p-3.5 transition-all sm:p-4 ${
                    isSelected
                      ? "border-vl-dark-900 bg-vl-white-100 shadow-xs"
                      : "border-vl-dark-900/8 bg-white hover:border-vl-dark-900/20"
                  }`}
                >
                  {/* Item Selection Trigger */}
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
                    className="flex cursor-pointer items-start gap-3 select-none sm:gap-3.5"
                  >
                    {/* Custom Checkbox */}
                    <div
                      className={`mt-1 flex size-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                        isSelected
                          ? "border-vl-dark-900 bg-vl-dark-900 text-white"
                          : "border-vl-dark-900/25 bg-white hover:border-vl-dark-900"
                      }`}
                    >
                      {isSelected && <Check className="size-3.5 stroke-[3]" />}
                    </div>

                    {/* Thumbnail */}
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-vl-dark-900/10 bg-neutral-100 sm:size-16">
                      <Image
                        src="/images/categories/cat-t-shirts.jpg"
                        alt={item.productName}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-2 text-xs font-semibold text-vl-dark-900 sm:text-sm">
                          {item.productName}
                        </h3>
                        {/* Line Price */}
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-bold text-vl-dark-900 sm:text-sm">
                            ৳ {(item.unitPrice * (currentQty || 1)).toLocaleString("en-BD")}
                          </p>
                          <p className="text-[10px] text-neutral-400 sm:text-[11px]">
                            ৳ {item.unitPrice.toLocaleString("en-BD")}
                          </p>
                        </div>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
                        {item.size && (
                          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700 sm:text-[11px]">
                            Size: {item.size}
                          </span>
                        )}
                        {item.color && (
                          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700 sm:text-[11px]">
                            Color: {item.color}
                          </span>
                        )}
                        {item.sku && (
                          <span className="font-mono text-[10px] text-neutral-400 sm:text-[11px]">
                            SKU: {item.sku}
                          </span>
                        )}
                        <span className="text-[10px] text-neutral-400 sm:text-[11px]">
                          • Max: {item.returnableQuantity}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Stepper (When Selected) */}
                  {isSelected && (
                    <div className="mt-3 flex items-center justify-between border-t border-vl-dark-900/8 pt-2.5 sm:mt-3 sm:justify-end sm:gap-3">
                      <span className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase sm:text-xs">
                        Return Quantity:
                      </span>
                      <div className="flex items-center rounded-xl border border-vl-dark-900/15 bg-white shadow-2xs overflow-hidden">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStepQuantity(item.id, -1, item.returnableQuantity);
                          }}
                          disabled={currentQty <= 1}
                          aria-label="Decrease quantity"
                          className="size-8 rounded-none text-vl-dark-900 hover:bg-neutral-100 disabled:opacity-30"
                        >
                          <Minus className="size-3.5" />
                        </Button>
                        <span className="w-8 text-center text-xs font-semibold text-vl-dark-900">
                          {currentQty}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStepQuantity(item.id, 1, item.returnableQuantity);
                          }}
                          disabled={currentQty >= item.returnableQuantity}
                          aria-label="Increase quantity"
                          className="size-8 rounded-none text-vl-dark-900 hover:bg-neutral-100 disabled:opacity-30"
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* 2. Return Reason & Verification Section */}
        <div className="space-y-6 border-b border-vl-dark-900/8 p-4 sm:p-6 md:p-7">
          <div className="flex items-center gap-2 border-b border-vl-dark-900/8 pb-4">
            <FileText className="size-4 text-vl-dark-900" />
            <h2 className="text-xs font-bold tracking-wider text-vl-dark-900 uppercase sm:text-sm">
              2. Reason & Details
            </h2>
          </div>

          {/* Reason Selection Grid */}
          <div>
            <label className="mb-2 block text-xs font-semibold tracking-wider text-vl-dark-900 uppercase">
              Select Return Reason <span className="text-rose-600">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {RETURN_REASONS.map((r) => {
                const isChecked = reason === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReason(r.value)}
                    className={`flex min-h-[46px] touch-manipulation items-center justify-between rounded-xl border p-3.5 text-left text-xs transition-all active:scale-[0.99] ${
                      isChecked
                        ? "border-vl-dark-900 bg-vl-dark-900 font-semibold text-white shadow-xs"
                        : "border-vl-dark-900/15 bg-white font-medium text-vl-dark-900 hover:border-vl-dark-900/40"
                    }`}
                  >
                    <span>{r.label}</span>
                    <div
                      className={`flex size-4.5 shrink-0 items-center justify-center rounded-full border ${
                        isChecked ? "border-white bg-white text-vl-dark-900" : "border-vl-dark-900/30"
                      }`}
                    >
                      {isChecked && <Check className="size-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photo Proof Alert */}
          {requiresProof && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950">
              <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-900">Photo Proof Required</p>
                <p className="mt-0.5 text-xs leading-relaxed text-amber-800">
                  For defective, damaged, or incorrect merchandise, please attach clear photos
                  showing the defect, stitch, or tag.
                </p>
              </div>
            </div>
          )}

          {/* Photo Upload Strip */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-vl-dark-900 uppercase">
                <Camera className="size-3.5 text-vl-dark-900" />
                <span>Photo Proof</span>
                {requiresProof ? (
                  <span className="text-xs font-semibold text-rose-600">* Required</span>
                ) : (
                  <span className="text-xs font-normal text-neutral-400">(optional)</span>
                )}
              </label>
              <span className="text-xs font-medium text-neutral-500">{images.length}/5 photos</span>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
                {images.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-vl-dark-900/10 bg-neutral-100 shadow-2xs"
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

            {images.length < 5 && (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={handleFileSelected}
                  className="hidden"
                  id="return-photo-upload"
                  disabled={isUploadingImage}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  loading={isUploadingImage}
                  className="h-auto w-full flex-wrap gap-2 rounded-xl border-dashed border-vl-dark-900/20 bg-white p-4 text-xs font-normal tracking-wider text-vl-dark-900 uppercase hover:border-vl-dark-900/50 hover:bg-neutral-50"
                >
                  {isUploadingImage ? (
                    <span>Uploading to Cloudinary...</span>
                  ) : (
                    <>
                      <Camera className="size-4 text-vl-dark-900" />
                      <span>Upload Photo</span>
                      <span className="text-[11px] font-normal text-neutral-400">
                        (Max 5MB • JPG, PNG, WebP)
                      </span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Customer Note Textarea */}
          <div className="space-y-1.5">
            <label
              htmlFor="customerNote"
              className="text-xs font-semibold tracking-wider text-vl-dark-900 uppercase"
            >
              Additional Details / Comments (Optional)
            </label>
            <Textarea
              id="customerNote"
              variant="brand"
              rows={3}
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder="Tell us what went wrong (e.g. size runs small, stitching issue on collar, received incorrect color)..."
              className="p-3.5 text-xs"
            />
          </div>
        </div>

        {/* 3. Integrated Policy & Estimated Refund Panel (Bottom) */}
        <div className="bg-vl-white-100 p-4 sm:p-6 md:p-7">
          <div className="flex flex-col gap-6 sm:grid sm:grid-cols-2 sm:gap-6 sm:divide-x sm:divide-vl-dark-900/8">
            {/* Refund Calculation & Submit (Stacked first on mobile) */}
            <div className="order-1 flex flex-col justify-between sm:order-2 sm:pl-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-vl-dark-900 uppercase">
                  <CreditCard className="size-4 text-vl-dark-900" />
                  <span>Refund Summary</span>
                </div>

                <dl className="mt-3 space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between text-neutral-500">
                    <span>Selected Items</span>
                    <span className="font-normal text-vl-dark-900">
                      {totalSelectedCount} item{totalSelectedCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-500">
                    <span>Merchandise Value</span>
                    <span className="font-normal text-vl-dark-900">
                      ৳ {totalEst.toLocaleString("en-BD")}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-500">
                    <span>Steadfast Pickup Fee</span>
                    <span className="font-normal text-emerald-700">FREE</span>
                  </div>
                  <Separator className="my-2.5! bg-vl-dark-900/10" />
                  <div className="flex items-baseline justify-between text-sm font-bold text-vl-dark-900 sm:text-base">
                    <span className="tracking-wide uppercase">Est. Refund Total</span>
                    <span className="text-lg font-bold sm:text-xl">
                      ৳ {totalEst.toLocaleString("en-BD")}
                    </span>
                  </div>
                </dl>
              </div>

              {/* Form Card Submit Button (Available on all viewports) */}
              <div className="mt-5 sm:mt-6">
                <Button
                  type="submit"
                  size="lg"
                  fullWidth
                  disabled={isSubmitting || totalSelectedCount === 0 || isUploadingImage}
                  loading={isSubmitting}
                >
                  <span>{isSubmitting ? "Submitting Request..." : "Submit Return Request"}</span>
                  {!isSubmitting && <ArrowRight className="size-4" />}
                </Button>
              </div>
            </div>

            {/* Policy & Courier Instructions (Stacked below refund on mobile) */}
            <div className="order-2 border-t border-vl-dark-900/8 pt-5 sm:order-1 sm:border-t-0 sm:pt-0 sm:pr-6">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-vl-dark-900 uppercase">
                <ShieldCheck className="size-4 text-emerald-600" />
                <span>Doorstep Return Policy</span>
              </div>
              <div className="mt-3 space-y-2.5 text-xs leading-relaxed text-neutral-600">
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-vl-dark-900">1.</span>
                  <p>Product must remain unwashed, unworn, with all original tags attached.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-vl-dark-900">2.</span>
                  <p>
                    A Steadfast courier rider will arrive at your delivery address for doorstep
                    pickup (<strong className="text-emerald-700">Free of Charge</strong>).
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-vl-dark-900">3.</span>
                  <p>
                    Refund is disbursed to your original payment method or bKash within 3–5 working
                    days post QC approval.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile Sticky Bottom Action Bar ── */}
      <div className="fixed right-0 bottom-0 left-0 z-50 border-t border-vl-dark-900/10 bg-white/95 px-4 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] shadow-xl backdrop-blur-md sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="block text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
              Est. Refund
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-vl-dark-900">
                ৳ {totalEst.toLocaleString("en-BD")}
              </span>
              <span className="text-[10px] font-semibold text-neutral-400">
                ({totalSelectedCount} item{totalSelectedCount === 1 ? "" : "s"})
              </span>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting || totalSelectedCount === 0 || isUploadingImage}
            loading={isSubmitting}
            className="max-w-[200px] flex-1"
          >
            <span>{isSubmitting ? "Submitting..." : "Submit Return"}</span>
            {!isSubmitting && <ArrowRight className="size-3.5" />}
          </Button>
        </div>
      </div>
    </form>
  );
}
