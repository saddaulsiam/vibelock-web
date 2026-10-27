"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingCart,
  MessageCircle,
  ExternalLink,
  Sparkles,
  Clock,
  Send,
  X,
  Package,
} from "lucide-react";
import { AdminCustomerAbandonedCart } from "@/lib/admin/customer-queries";

interface CustomerAbandonedCartCardProps {
  cart: AdminCustomerAbandonedCart;
  customerPhone?: string | null;
  customerName?: string | null;
}

export function CustomerAbandonedCartCard({
  cart,
  customerPhone,
  customerName,
}: CustomerAbandonedCartCardProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState("");

  const formatCurrency = (val: number) => `৳${Math.round(val).toLocaleString()}`;

  // Clean Bangladeshi phone number to international format 8801...
  const cleanPhone = (phone?: string | null) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("880")) return digits;
    if (digits.startsWith("0")) return `88${digits}`;
    if (digits.length === 10) return `880${digits}`;
    return digits;
  };

  const formattedPhone = cleanPhone(customerPhone);

  // Keep WhatsApp message template in polite Bengali as requested
  const generateDefaultCartRecoveryMessage = () => {
    const name = customerName || "Customer";
    const itemListText = cart.items
      .map(
        (item) =>
          `• ${item.productName}${item.size ? ` (Size: ${item.size})` : ""}${
            item.quantity > 1 ? ` x ${item.quantity}` : ""
          } - ${formatCurrency(item.price * item.quantity)}`
      )
      .join("\n");

    return `আসসালামু আলাইকুম ${name}! 👋\n\nআপনি VibeLock-এ আপনার ব্যাগে কিছু প্রিমিয়াম ড্রপ-শোল্ডার আইটেম সিলেক্ট করেছিলেন:\n${itemListText}\n\nমোট মূল্য: ${formatCurrency(
      cart.subtotal
    )}\n\nস্টক শেষ হওয়ার আগেই আপনার অর্ডারটি সম্পূর্ণ করতে এই লিংকে ক্লিক করুন:\nhttps://vibelock.com/cart\n\nকোনো সাইজ কনফিউশন বা প্রশ্ন থাকলে আমাদের সরাসরি এখানে রিপ্লাই দিতে পারেন! 🖤\n- VibeLock Streetwear Team`;
  };

  const handleOpenRecoveryModal = () => {
    setCustomMessage(generateDefaultCartRecoveryMessage());
    setIsPreviewOpen(true);
  };

  const handleSendWhatsApp = () => {
    if (!formattedPhone) return;
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(customMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setIsPreviewOpen(false);
  };

  if (!cart.hasCart || cart.items.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
              <ShoppingCart className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Active Shopping Cart</h2>
              <p className="text-[11px] text-neutral-400">Abandoned cart tracking</p>
            </div>
          </div>
          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-600">
            Cart Empty
          </span>
        </div>
        <p className="text-xs text-neutral-400 italic py-2">
          No active or abandoned cart items for this customer at this time.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-amber-300 bg-linear-to-b from-amber-50/40 via-white to-white p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs">
            <ShoppingCart className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-amber-950">Abandoned Cart</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-300">
                <Sparkles className="size-2.5 text-amber-600" /> High Recovery Opportunity
              </span>
            </div>
            <p className="text-[11px] text-amber-800">
              Customer added items to cart but has not completed checkout.
            </p>
          </div>
        </div>

        {/* Quick WhatsApp Action Button */}
        <div>
          {formattedPhone ? (
            <button
              onClick={handleOpenRecoveryModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
            >
              <MessageCircle className="size-3.5 fill-white/20" />
              <span>Send WhatsApp Recovery</span>
            </button>
          ) : (
            <span className="text-[11px] text-amber-700 italic">
              Phone number required for WhatsApp
            </span>
          )}
        </div>
      </div>

      {/* Cart Meta */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-amber-100/50 rounded-lg p-2.5 border border-amber-200/60">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">
              Total Items
            </span>
            <div className="font-extrabold text-neutral-900 text-sm">{cart.totalItems} pcs</div>
          </div>
          <div className="h-6 w-px bg-amber-200" />
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">
              Cart Value
            </span>
            <div className="font-black text-emerald-700 text-sm">
              {formatCurrency(cart.subtotal)}
            </div>
          </div>
        </div>

        {cart.updatedAt && (
          <div className="flex items-center gap-1 text-[11px] text-amber-800">
            <Clock className="size-3 text-amber-600" />
            <span>
              Last updated:{" "}
              <strong className="font-semibold text-neutral-900">
                {new Date(cart.updatedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Cart Items List */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
          Cart Items ({cart.items.length})
        </span>

        <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200/80 bg-white overflow-hidden">
          {cart.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 gap-3 hover:bg-neutral-50/60 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Thumbnail */}
                <div className="relative size-12 shrink-0 rounded-md border border-neutral-200 overflow-hidden bg-neutral-100 flex items-center justify-center">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.productName}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : (
                    <Package className="size-5 text-neutral-400" />
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-neutral-900 truncate">
                      {item.productName}
                    </span>
                    <Link
                      href={`/products/${item.productSlug}`}
                      target="_blank"
                      className="text-neutral-400 hover:text-neutral-700 transition"
                    >
                      <ExternalLink className="size-3" />
                    </Link>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                    {item.size && (
                      <span className="rounded bg-neutral-100 px-1.5 py-0.2 font-semibold text-neutral-800 border border-neutral-200">
                        Size: {item.size}
                      </span>
                    )}
                    {item.color && (
                      <span className="rounded bg-neutral-100 px-1.5 py-0.2 font-semibold text-neutral-700 border border-neutral-200">
                        {item.color}
                      </span>
                    )}
                    <span className="font-mono text-neutral-400 text-[10px]">SKU: {item.sku}</span>
                  </div>
                </div>
              </div>

              {/* Price & Quantity */}
              <div className="text-right shrink-0">
                <div className="font-bold text-xs text-neutral-900">
                  {formatCurrency(item.price * item.quantity)}
                </div>
                <div className="text-[10px] text-neutral-500 font-medium">
                  {formatCurrency(item.price)} × {item.quantity}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recovery Preview & Confirmation Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                  <MessageCircle className="size-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900">
                    WhatsApp Cart Recovery Preview
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Review or edit the message before sending to customer
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700">
                Message Content (WhatsApp):
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={9}
                className="w-full rounded-xl border border-neutral-300 p-3 text-xs leading-relaxed font-sans text-neutral-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="rounded-lg bg-emerald-50/60 p-2.5 text-[11px] text-emerald-800 border border-emerald-200/60">
              💡 Clicking will open WhatsApp with this prefilled message to{" "}
              <strong>{customerPhone}</strong>.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="rounded-lg border border-neutral-200 px-3.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
              >
                <Send className="size-3.5" />
                <span>Open in WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
