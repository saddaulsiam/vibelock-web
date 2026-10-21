import type { Metadata } from "next";
import { getAccountOverview } from "@/lib/account/queries";
import { AccountDashboardView } from "@/components/account/account-dashboard-view";

export const metadata: Metadata = {
  title: "My Account | VibeLock",
  description:
    "Manage your VibeLock profile, recent orders, shipping addresses, and exclusive rewards.",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const account = await getAccountOverview();

  return <AccountDashboardView account={account} />;
}
