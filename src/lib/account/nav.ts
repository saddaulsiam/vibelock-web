import { LayoutDashboard, RotateCcw, ShoppingBag, Ticket, User } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  matches?: (pathname: string) => boolean;
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
  },
  {
    label: "Coupons",
    href: "/account/coupons",
    icon: Ticket,
  },
  {
    label: "Returns",
    href: "/account/returns",
    icon: RotateCcw,
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
