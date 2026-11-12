"use client";

import { useState } from "react";
import { ChevronDown, FileText, Shirt, Truck, RotateCcw } from "lucide-react";

interface ProductInfoAccordionProps {
  description: string | null;
  productName: string;
}

export function ProductInfoAccordion({ description, productName }: ProductInfoAccordionProps) {
  const [openSection, setOpenSection] = useState<string | null>("description");

  const toggle = (section: string) => {
    setOpenSection((current) => (current === section ? null : section));
  };

  const renderDescription = (text: string | null) => {
    if (!text) {
      return (
        <p className="text-xs sm:text-sm leading-relaxed text-vl-dark-900/75">
          Engineered with premium craftsmanship, {productName} represents VibeLock&apos;s
          commitment to raw, authentic Bangladeshi streetwear culture.
        </p>
      );
    }

    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    return (
      <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm leading-relaxed text-vl-dark-900/80">
        {lines.map((line, idx) => {
          const isBullet = line.startsWith("•") || line.startsWith("-") || line.startsWith("*");
          const cleanText = isBullet ? line.replace(/^[•\-\*]\s*/, "") : line;

          if (isBullet) {
            return (
              <div key={idx} className="flex items-start gap-2 sm:gap-2.5">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-vl-dark-900/40" />
                <span className="flex-1">{cleanText}</span>
              </div>
            );
          }
          return <p key={idx}>{cleanText}</p>;
        })}
      </div>
    );
  };

  const sections = [
    {
      id: "description",
      title: "Product Details & Story",
      icon: FileText,
      content: renderDescription(description),
    },
    {
      id: "specs",
      title: "Fabric & Specifications",
      icon: Shirt,
      content: (
        <div className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm text-vl-dark-900/80">
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 rounded-xs bg-vl-white-300/40 border border-vl-dark-900/5 p-2 sm:p-2.5">
            <div>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-vl-dark-900/50 block">Fabric</span>
              <span className="font-semibold text-vl-dark-900 text-[11px] sm:text-xs">100% Combed Cotton</span>
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-vl-dark-900/50 block">Weight</span>
              <span className="font-semibold text-vl-dark-900 text-[11px] sm:text-xs">220 - 240+ GSM</span>
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-vl-dark-900/50 block">Fit Type</span>
              <span className="font-semibold text-vl-dark-900 text-[11px] sm:text-xs">Streetwear Boxy</span>
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-vl-dark-900/50 block">Origin</span>
              <span className="font-semibold text-vl-dark-900 text-[11px] sm:text-xs">Crafted in Dhaka</span>
            </div>
          </div>
          <div className="pt-1 text-[11px] sm:text-xs text-vl-dark-900/70 space-y-0.5 sm:space-y-1">
            <p className="font-bold text-vl-dark-900">Care Instructions:</p>
            <p>• Machine wash cold inside out with similar colors.</p>
            <p>• Do not tumble dry. Hang dry in shade to preserve screenprints.</p>
            <p>• Iron inside-out on low heat; avoid direct iron on print details.</p>
          </div>
        </div>
      ),
    },
    {
      id: "shipping",
      title: "Shipping & Delivery Times",
      icon: Truck,
      content: (
        <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-vl-dark-900/80">
          <ul className="divide-y divide-vl-dark-900/10 rounded-xs border border-vl-dark-900/10">
            <li className="flex items-center justify-between p-2 sm:p-2.5">
              <div>
                <p className="font-bold text-vl-dark-900 text-xs sm:text-sm">Inside Dhaka City</p>
                <p className="text-[10px] sm:text-[11px] text-vl-dark-900/60">Delivered within 24 to 48 hours</p>
              </div>
              <span className="font-mono font-bold text-vl-dark-900 text-xs sm:text-sm">৳60</span>
            </li>
            <li className="flex items-center justify-between p-2 sm:p-2.5">
              <div>
                <p className="font-bold text-vl-dark-900 text-xs sm:text-sm">Outside Dhaka (All BD)</p>
                <p className="text-[10px] sm:text-[11px] text-vl-dark-900/60">Steadfast / Pathao Express (3-5 days)</p>
              </div>
              <span className="font-mono font-bold text-vl-dark-900 text-xs sm:text-sm">৳120</span>
            </li>
          </ul>
          <p className="text-[9px] sm:text-[10px] text-vl-dark-900/55 italic">
            * Tracking link sent via SMS immediately after consignment handover.
          </p>
        </div>
      ),
    },
    {
      id: "returns",
      title: "7-Day Exchange Policy",
      icon: RotateCcw,
      content: (
        <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-vl-dark-900/75 leading-relaxed">
          <p>
            Did the size not fit perfectly? No worries! We provide a <strong>7-day replacement guarantee</strong> for all unworn garments with original tags intact.
          </p>
          <p>
            To initiate an exchange, simply visit your <strong>Account &gt; Returns</strong> or message our support hotline.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="divide-y divide-vl-dark-900/10 border-b border-vl-dark-900/10">
      {sections.map((section) => {
        const isOpen = openSection === section.id;
        const Icon = section.icon;

        return (
          <div key={section.id} className="py-2.5 sm:py-3">
            <button
              type="button"
              onClick={() => toggle(section.id)}
              className="flex w-full items-center justify-between text-left focus-visible:outline-2 focus-visible:outline-vl-cyan rounded-xs cursor-pointer group"
              aria-expanded={isOpen}
            >
              <span className="flex items-center gap-2 sm:gap-2.5 font-heading text-[11px] sm:text-xs font-bold tracking-wider text-vl-dark-900 uppercase transition-colors group-hover:text-vl-cyan-dark">
                <Icon className="size-3 sm:size-3.5 text-vl-dark-900/60" aria-hidden="true" />
                {section.title}
              </span>
              <ChevronDown
                className={`size-3 sm:size-3.5 text-vl-dark-900/50 transition-transform duration-200 ${
                  isOpen ? "rotate-180 text-vl-cyan-dark" : "group-hover:text-vl-dark-900"
                }`}
                aria-hidden="true"
              />
            </button>

            {isOpen && <div className="pt-2 sm:pt-2.5 pb-1">{section.content}</div>}
          </div>
        );
      })}
    </div>
  );
}
