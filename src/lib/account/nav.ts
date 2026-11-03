import { LayoutDashboard, RotateCcw, ShoppingBag, Ticket, User } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  matches?: (pathname: string) => boolean;
  badgeKey?: "orders" | "coupons" | "returns";
};

export const accountNavItems: NavItem[] = [
  {
    label: "Overview",
    href: "/account",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Orders",
    href: "/account/orders",
    icon: ShoppingBag,
    badgeKey: "orders",
  },
  {
    label: "Coupons",
    href: "/account/coupons",
    icon: Ticket,
    badgeKey: "coupons",
  },
  {
    label: "Returns",
    href: "/account/returns",
    icon: RotateCcw,
    badgeKey: "returns",
  },
  {
    label: "Profile",
    href: "/account/profile",
    icon: User,
    matches: (p: string) =>
      p.startsWith("/account/profile") ||
      p.startsWith("/account/addresses") ||
      p.startsWith("/account/security"),
  },
];

