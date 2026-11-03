import type { Metadata } from "next";
import { getCustomerCoupons } from "@/lib/account/queries";
import { CouponsView } from "@/components/account/coupons/coupons-view";

export const metadata: Metadata = {
  title: "Coupons & Vouchers | VibeLock",
  description: "View and copy active discount coupons and store credit vouchers for VibeLock.",
  robots: { index: false, follow: false },
};

export default async function AccountCouponsPage() {
  const coupons = await getCustomerCoupons();

  return <CouponsView coupons={coupons} />;
}

