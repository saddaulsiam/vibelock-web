import { Truck, ShieldCheck, RotateCcw } from "lucide-react";

export function ProductTrustBadges() {
  const perks = [
    {
      icon: Truck,
      text: "Cash on Delivery nationwide (2-4 business days)",
    },
    {
      icon: ShieldCheck,
      text: "Carefully Inspected Before Every Delivery",
    },
    {
      icon: RotateCcw,
      text: "Easy exchange policy within 7 days of drop dispatch",
    },
  ];

  return (
    <div className="border-border/50 bg-vl-white-300/30 rounded-xs border p-3 sm:p-3.5">
      <ul className="space-y-2.5 sm:space-y-3">
        {perks.map((perk) => {
          const Icon = perk.icon;
          return (
            <li
              key={perk.text}
              className="text-2xs text-vl-dark-900/80 flex items-center gap-2.5 sm:gap-3 sm:text-[13px]"
            >
              <Icon className="text-vl-dark-900/60 size-4 shrink-0" aria-hidden="true" />
              <span>{perk.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
