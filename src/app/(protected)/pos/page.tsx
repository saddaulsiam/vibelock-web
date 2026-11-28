import { PosView } from "@/components/pos/pos-view";
import { requireRole } from "@/lib/auth/authorization";
import { getPosCatalog, getPosCategories } from "@/lib/pos/pos-queries";
import { getCurrentShiftAction } from "@/lib/pos/pos-shift-actions";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const user = await requireRole("STAFF");
  const [categories, products, shiftRes] = await Promise.all([
    getPosCategories(),
    getPosCatalog(),
    getCurrentShiftAction(),
  ]);

  return (
    <PosView
      products={products}
      categories={categories}
      cashierName={user.name || user.email || "Cashier"}
      cashierRole={user.role}
      initialShift={shiftRes.success ? shiftRes.data : null}
    />
  );
}
