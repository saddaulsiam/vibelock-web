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

  const sections = [
    {
      id: "description",
      title: "Product Details & Story",
      icon: FileText,
      content: (
        <div className="space-y-3 text-xs sm:text-sm leading-relaxed text-vl-dark-900/75">
          {description ? (
            description
              .split("\n")
              .filter(Boolean)
              .map((line, idx) => <p key={idx}>{line}</p>)
          ) : (
            <p>
              Engineered with premium craftsmanship, {productName} represents VibeLock&apos;s
              commitment to raw, authentic Bangladeshi streetwear culture.
            </p>
          )}
        </div>
      ),
    },
    {
      id: "specs",
      title: "Fabric & Specifications",
      icon: Shirt,
      content: (
        <div className="space-y-2.5 text-xs sm:text-sm text-vl-dark-900/80">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-vl-white-300/50 p-3">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-vl-dark-900/50 block">Fabric</span>
              <span className="font-semibold text-vl-dark-900">100% Combed Cotton</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-vl-dark-900/50 block">Weight</span>
              <span className="font-semibold text-vl-dark-900">220 - 240+ GSM Heavyweight</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-vl-dark-900/50 block">Fit Type</span>
              <span className="font-semibold text-vl-dark-900">Streetwear Drop-Shoulder</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-vl-dark-900/50 block">Origin</span>
              <span className="font-semibold text-vl-dark-900">Crafted in Dhaka, BD</span>
            </div>
          </div>
          <div className="pt-2 text-xs text-vl-dark-900/70 space-y-1">
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
        <div className="space-y-2.5 text-xs sm:text-sm text-vl-dark-900/80">
          <ul className="divide-y divide-vl-dark-900/10 rounded-xl border border-vl-dark-900/10">
            <li className="flex items-center justify-between p-3">
              <div>
                <p className="font-bold text-vl-dark-900">Inside Dhaka City</p>
                <p className="text-[11px] text-vl-dark-900/60">Delivered within 24 to 48 hours</p>
              </div>
              <span className="font-mono font-bold text-vl-dark-900">৳60</span>
            </li>
            <li className="flex items-center justify-between p-3">
              <div>
                <p className="font-bold text-vl-dark-900">Outside Dhaka (All BD)</p>
                <p className="text-[11px] text-vl-dark-900/60">Steadfast / Pathao Express (3-5 days)</p>
              </div>
              <span className="font-mono font-bold text-vl-dark-900">৳120</span>
            </li>
          </ul>
          <p className="text-[11px] text-vl-dark-900/60 italic">
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
        <div className="space-y-2 text-xs sm:text-sm text-vl-dark-900/75">
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
    <div className="divide-y divide-vl-dark-900/10 border-y border-vl-dark-900/10 mt-6 sm:mt-8">
      {sections.map((section) => {
        const isOpen = openSection === section.id;
        const Icon = section.icon;

        return (
          <div key={section.id} className="py-3 sm:py-3.5">
            <button
              type="button"
              onClick={() => toggle(section.id)}
              className="flex w-full items-center justify-between text-left focus-visible:outline-2 focus-visible:outline-vl-cyan rounded-md"
              aria-expanded={isOpen}
            >
              <span className="flex items-center gap-2.5 font-heading text-xs sm:text-sm font-bold tracking-wider text-vl-dark-900 uppercase">
                <Icon className="size-4 text-vl-dark-900/70" aria-hidden="true" />
                {section.title}
              </span>
              <ChevronDown
                className={`size-4 text-vl-dark-900/60 transition-transform duration-200 ${
                  isOpen ? "rotate-180 text-vl-cyan-dark" : ""
                }`}
                aria-hidden="true"
              />
            </button>

            {isOpen && <div className="pt-3 pb-1">{section.content}</div>}
          </div>
        );
      })}
    </div>
  );
}

