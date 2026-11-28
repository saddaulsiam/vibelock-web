import { AccountDashboardView } from "@/components/account/dashboard/account-dashboard-view";
import { getAccountOverview } from "@/lib/account/queries";
import type { Metadata } from "next";

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
