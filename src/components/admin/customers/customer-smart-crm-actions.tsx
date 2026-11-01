"use client";

import {
  ChevronDown,
  Gift,
  HeartHandshake,
  MessageCircle,
  PackageCheck,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import * as React from "react";

interface SmartCrmCustomer {
  id: string;
  name: string | null;
  phone: string | null;
  email: string;
  preferredSize?: string | null;
  totalOrders: number;
  totalSpent: number;
}

interface CustomerSmartCrmActionsProps {
  customer: SmartCrmCustomer;
}

interface CrmTemplate {
  id: string;
  title: string;
  badge: string;
  icon: React.ElementType;
  color: string;
  generateText: (c: SmartCrmCustomer) => string;
}

function getCleanCustomerName(name?: string | null): string {
  if (!name) return "";
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (!trimmed || lower === "undefined" || lower === "null" || lower === "customer") {
    return "";
  }
  return trimmed;
}

const CRM_TEMPLATES: CrmTemplate[] = [
  {
    id: "vip_thank_you",
    title: "VIP Customer Appreciation",
    badge: "VIP Loyalty",
    icon: Sparkles,
    color: "text-amber-600 bg-amber-50 border-amber-200",
    generateText: (c) => {
      const name = getCleanCustomerName(c.name);
      const greeting = name ? `আসসালামু আলাইকুম ${name} ভাই/আপু,` : "আসসালামু আলাইকুম,";
      return `${greeting}\n\nVibeLock-এ আপনার অব্যাহত ভালোবাসার জন্য আন্তরিক ধন্যবাদ! আপনি আমাদের একজন সম্মানিত VIP কাস্টমার হিসেবে সবসময় সেরা সেবা ও প্রায়োরিটি সাপোর্ট পাবেন। নতুন কোনো কালেকশন বা সাইজ সংক্রান্ত সহযোগিতার জন্য সরাসরি আমাদের মেসেজ দিতে পারেন।\n\n— Team VibeLock`;
    },
  },
  {
    id: "exclusive_discount",
    title: "Exclusive 10% Discount Reward",
    badge: "Reward",
    icon: Gift,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    generateText: (c) => {
      const name = getCleanCustomerName(c.name);
      const greeting = name ? `হ্যালো ${name}!` : "হ্যালো!";
      return `${greeting}\n\nVibeLock-এর সাথে আপনার চমৎকার অভিজ্ঞতার জন্য আমাদের পক্ষ থেকে একটি বিশেষ উপহার! আপনার পরবর্তী অর্ডারে ফ্ল্যাট ১০% ডিসকাউন্ট উপভোগ করতে ব্যবহার করুন এক্সক্লুসিভ কোড: *VIP10*।\n\nআমাদের লেটেস্ট ড্রপ দেখতে ভিজিট করুন: https://vibelock.bd\n\nহ্যাপি শপিং!`;
    },
  },
  {
    id: "size_restock",
    title: "New Drop & Size Restock Alert",
    badge: "Drop Alert",
    icon: PackageCheck,
    color: "text-blue-600 bg-blue-50 border-blue-200",
    generateText: (c) => {
      const name = getCleanCustomerName(c.name);
      const greeting = name ? `আসসালামু আলাইকুম ${name}!` : "আসসালামু আলাইকুম!";
      const sizeStr = c.preferredSize ? `"${c.preferredSize}"` : "আপনার পছন্দের";
      return `${greeting}\n\nআপনি নিয়মিত ${sizeStr} সাইজ অর্ডার করে থাকেন। আনন্দের সাথে জানাচ্ছি যে VibeLock-এর নতুন সিজন ড্রপে আপনার সাইজের প্রিমিয়াম ওভারসাইজড টি-শার্ট ও হুডি রিস্টক হয়েছে!\n\nস্টক সীমিত থাকায় আপনার পছন্দের পিসটি এখনই বুক করতে পারেন।\n\nধন্যবাদ,\nVibeLock Streetwear`;
    },
  },
  {
    id: "care_feedback",
    title: "Post-Delivery Care & Feedback",
    badge: "Care",
    icon: HeartHandshake,
    color: "text-purple-600 bg-purple-50 border-purple-200",
    generateText: (c) => {
      const name = getCleanCustomerName(c.name);
      const greeting = name ? `হ্যালো ${name} ভাই/আপু,` : "হ্যালো,";
      return `${greeting}\n\nআশা করি VibeLock থেকে আপনার সাম্প্রতিক ডেলিভারিটি সফলভাবে পেয়েছেন। কাপড়ের কোয়ালিটি, ফেব্রিক এবং সাইজ ফিটিংস আপনার কেমন লাগলো? আপনার মূল্যবান মতামত আমাদের সেবাকে আরো উন্নত করতে সাহায্য করবে।\n\nকোনো সমস্যা বা এক্সচেঞ্জের প্রয়োজন হলে আমাদের নিঃসংকোচে জানান। ধন্যবাদ!`;
    },
  },
];

function buildWhatsAppUrl(phone: string, message: string): string {
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("880")) {
    // Already BD format
  } else if (clean.startsWith("0")) {
    clean = "88" + clean;
  } else if (clean.length === 10) {
    clean = "880" + clean;
  }
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

export function CustomerSmartCrmActions({ customer }: CustomerSmartCrmActionsProps) {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState<CrmTemplate | null>(null);
  const [customMessage, setCustomMessage] = React.useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectTemplate = (template: CrmTemplate) => {
    setSelectedTemplate(template);
    setCustomMessage(template.generateText(customer));
    setIsDropdownOpen(false);
  };

  const handleSendWhatsApp = () => {
    if (!customer.phone) return;
    const url = buildWhatsAppUrl(customer.phone, customMessage);
    window.open(url, "_blank", "noopener,noreferrer");
    setSelectedTemplate(null);
  };

  if (!customer.phone) {
    return null;
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger Button with Dropdown Chevron */}
      <div className="inline-flex rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 shadow-2xs transition hover:bg-emerald-100">
        <a
          href={buildWhatsAppUrl(
            customer.phone,
            getCleanCustomerName(customer.name)
              ? `Hello ${getCleanCustomerName(customer.name)}, thank you for contacting VibeLock!`
              : "Hello, thank you for contacting VibeLock!"
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-1.5 px-3 text-xs font-semibold"
        >
          <MessageCircle className="size-3.5 text-emerald-600" />
          <span>WhatsApp</span>
        </a>
        <button
          type="button"
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className="border-l border-emerald-200 px-1.5 hover:bg-emerald-200/50"
          aria-label="Smart CRM Templates"
          title="Smart WhatsApp CRM Templates"
        >
          <ChevronDown className="size-3.5 text-emerald-700" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="animate-in fade-in zoom-in-95 absolute right-0 z-30 mt-1.5 w-72 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl duration-100">
          <div className="border-b border-neutral-100 px-2.5 py-1.5">
            <span className="text-[11px] font-bold tracking-wider text-neutral-500 uppercase">
              Smart CRM WhatsApp Templates
            </span>
          </div>
          <div className="py-1">
            {CRM_TEMPLATES.map((tpl) => {
              const Icon = tpl.icon;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(tpl)}
                  className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition hover:bg-neutral-50"
                >
                  <div className={`mt-0.5 rounded-md border p-1 ${tpl.color}`}>
                    <Icon className="size-3.5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-neutral-900">{tpl.title}</div>
                    <span className="text-[10px] text-neutral-500">Click to preview message</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Message Preview & Customization Modal */}
      {selectedTemplate && (
        <div
          className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
            {/* Header */}
            <div className="mb-4 flex items-start justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                  <MessageCircle className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">{selectedTemplate.title}</h3>
                  <p className="text-xs text-neutral-500">
                    To: {customer.name || "Customer"} ({customer.phone})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTemplate(null)}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Editable Textarea */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-700">
                Message Preview (You can edit before sending):
              </label>
              <textarea
                rows={6}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 p-3 text-xs leading-relaxed text-neutral-900 focus:border-neutral-900 focus:bg-white focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="mt-5 flex items-center justify-end gap-2 border-t border-neutral-100 pt-4">
              <button
                type="button"
                onClick={() => setSelectedTemplate(null)}
                className="rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-emerald-700"
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
