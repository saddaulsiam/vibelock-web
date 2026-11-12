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
        <p className="text-vl-dark-900/75 text-xs leading-relaxed sm:text-sm">
          Engineered with premium craftsmanship, {productName} represents VibeLock&apos;s commitment
          to raw, authentic Bangladeshi streetwear culture.
        </p>
      );
    }

    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    return (
      <div className="text-vl-dark-900/80 space-y-1.5 text-xs leading-relaxed sm:space-y-2 sm:text-sm">
        {lines.map((line, idx) => {
          const isBullet = line.startsWith("•") || line.startsWith("-") || line.startsWith("*");
          const cleanText = isBullet ? line.replace(/^[•\-\*]\s*/, "") : line;

          if (isBullet) {
            return (
              <div key={idx} className="flex items-start gap-2 sm:gap-2.5">
                <span className="bg-vl-dark-900/40 mt-1.5 size-1 shrink-0 rounded-full" />
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
        <div className="text-vl-dark-900/80 space-y-2 text-xs sm:space-y-2.5 sm:text-sm">
          <div className="bg-vl-white-300/40 border-vl-dark-900/5 grid grid-cols-2 gap-1.5 rounded-xs border p-2 sm:gap-2 sm:p-2.5">
            <div>
              <span className="text-vl-dark-900/50 block text-[9px] font-bold tracking-wider uppercase sm:text-[10px]">
                Fabric
              </span>
              <span className="text-vl-dark-900 text-[11px] font-semibold sm:text-xs">
                100% Combed Cotton
              </span>
            </div>
            <div>
              <span className="text-vl-dark-900/50 block text-[9px] font-bold tracking-wider uppercase sm:text-[10px]">
                Weight
              </span>
              <span className="text-vl-dark-900 text-[11px] font-semibold sm:text-xs">
                220 - 240+ GSM
              </span>
            </div>
            <div>
              <span className="text-vl-dark-900/50 block text-[9px] font-bold tracking-wider uppercase sm:text-[10px]">
                Fit Type
              </span>
              <span className="text-vl-dark-900 text-[11px] font-semibold sm:text-xs">
                Streetwear Boxy
              </span>
            </div>
            <div>
              <span className="text-vl-dark-900/50 block text-[9px] font-bold tracking-wider uppercase sm:text-[10px]">
                Origin
              </span>
              <span className="text-vl-dark-900 text-[11px] font-semibold sm:text-xs">
                Crafted in Dhaka
              </span>
            </div>
          </div>
          <div className="text-vl-dark-900/70 space-y-0.5 pt-1 text-[11px] sm:space-y-1 sm:text-xs">
            <p className="text-vl-dark-900 font-bold">Care Instructions:</p>
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
        <div className="text-vl-dark-900/80 space-y-1.5 text-xs sm:space-y-2 sm:text-sm">
          <ul className="divide-vl-dark-900/10 border-vl-dark-900/10 divide-y rounded-xs border">
            <li className="flex items-center justify-between p-2 sm:p-2.5">
              <div>
                <p className="text-vl-dark-900 text-xs font-bold sm:text-sm">Inside Dhaka City</p>
                <p className="text-vl-dark-900/60 text-[10px] sm:text-[11px]">
                  Delivered within 24 to 48 hours
                </p>
              </div>
              <span className="text-vl-dark-900 font-mono text-xs font-bold sm:text-sm">৳60</span>
            </li>
            <li className="flex items-center justify-between p-2 sm:p-2.5">
              <div>
                <p className="text-vl-dark-900 text-xs font-bold sm:text-sm">
                  Outside Dhaka (All BD)
                </p>
                <p className="text-vl-dark-900/60 text-[10px] sm:text-[11px]">
                  Steadfast / Pathao Express (3-5 days)
                </p>
              </div>
              <span className="text-vl-dark-900 font-mono text-xs font-bold sm:text-sm">৳120</span>
            </li>
          </ul>
          <p className="text-vl-dark-900/55 text-[9px] italic sm:text-[10px]">
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
        <div className="text-vl-dark-900/75 space-y-1.5 text-xs leading-relaxed sm:space-y-2 sm:text-sm">
          <p>
            Did the size not fit perfectly? No worries! We provide a{" "}
            <strong>7-day replacement guarantee</strong> for all unworn garments with original tags
            intact.
          </p>
          <p>
            To initiate an exchange, simply visit your <strong>Account &gt; Returns</strong> or
            message our support hotline.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="divide-vl-dark-900/10 border-vl-dark-900/10 divide-y border-b">
      {sections.map((section) => {
        const isOpen = openSection === section.id;
        const Icon = section.icon;

        return (
          <div key={section.id} className="py-2.5 sm:py-3">
            <button
              type="button"
              onClick={() => toggle(section.id)}
              className="focus-visible:outline-vl-cyan group flex w-full cursor-pointer items-center justify-between rounded-xs text-left focus-visible:outline-2"
              aria-expanded={isOpen}
            >
              <span className="font-heading text-vl-dark-900 group-hover:text-vl-cyan-dark flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase transition-colors sm:gap-2.5 sm:text-xs">
                <Icon className="text-vl-dark-900/60 size-3 sm:size-3.5" aria-hidden="true" />
                {section.title}
              </span>
              <ChevronDown
                className={`text-vl-dark-900/50 size-3 transition-transform duration-200 sm:size-3.5 ${
                  isOpen ? "text-vl-cyan-dark rotate-180" : "group-hover:text-vl-dark-900"
                }`}
                aria-hidden="true"
              />
            </button>

            {isOpen && <div className="pt-2 pb-1 sm:pt-2.5">{section.content}</div>}
          </div>
        );
      })}
    </div>
  );
}
