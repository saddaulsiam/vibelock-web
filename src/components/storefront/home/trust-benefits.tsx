import { Headphones, PackageCheck, RotateCcw, ShieldCheck, Sparkles, Truck } from "lucide-react";

const TRUST_BENEFITS = [
  { icon: Truck, label: "FREE SHIPPING OVER ৳2000" },
  { icon: ShieldCheck, label: "100% SECURE PAYMENTS" },
  { icon: Headphones, label: "24/7 DEDICATED SUPPORT" },
  { icon: PackageCheck, label: "CASH ON DELIVERY AVAILABLE" },
  { icon: Sparkles, label: "100% AUTHENTIC QUALITY" },
  { icon: RotateCcw, label: "EASY 7-DAY RETURN POLICY" },
];

export function TrustBenefits() {
  return (
    <section
      className="w-full max-w-full overflow-hidden border-y border-black bg-[#00D9FF] py-3 text-[#080A0C] select-none"
      aria-label="VibeLock Trust and Service Benefits"
    >
      <div className="animate-marquee hover:hover:paused flex w-max items-center text-xs font-black tracking-[0.2em] whitespace-nowrap uppercase sm:text-sm">
        {/* Track 1 */}
        <div className="flex shrink-0 items-center">
          {TRUST_BENEFITS.concat(TRUST_BENEFITS).map((item, idx) => (
            <span key={`t1-${idx}`} className="inline-flex items-center">
              <span className="mx-4 text-xs select-none sm:mx-6 sm:text-sm" aria-hidden="true">
                ✦
              </span>
              <span className="inline-flex items-center gap-2">
                <item.icon
                  className="size-4 shrink-0 stroke-[2.25] sm:size-4.5"
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </span>
            </span>
          ))}
        </div>

        {/* Track 2 (Duplicate for seamless loop) */}
        <div className="flex shrink-0 items-center" aria-hidden="true">
          {TRUST_BENEFITS.concat(TRUST_BENEFITS).map((item, idx) => (
            <span key={`t2-${idx}`} className="inline-flex items-center">
              <span className="mx-4 text-xs select-none sm:mx-6 sm:text-sm">✦</span>
              <span className="inline-flex items-center gap-2">
                <item.icon className="size-4 shrink-0 stroke-[2.25] sm:size-4.5" />
                <span>{item.label}</span>
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
