import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DiscountType } from "@prisma/client";
import { couponStatus, getAdminCoupons, type CouponFilter } from "@/lib/admin/coupon-queries";

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
function money(value: unknown) {
  return `৳${Number(value).toFixed(2)}`;
}
function filterOf(value: string | undefined): CouponFilter {
  return value === "active" || value === "inactive" || value === "expired" ? value : "all";
}

async function CouponTable({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const search = valueOf(searchParams.q);
  const filter = filterOf(valueOf(searchParams.status));
  const typeValue = valueOf(searchParams.type);
  const type = Object.values(DiscountType).includes(typeValue as DiscountType)
    ? (typeValue as DiscountType)
    : undefined;
  const rawPage = Number(valueOf(searchParams.page));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const { coupons, totalPages } = await getAdminCoupons({ search, filter, type, page });
  const query = `q=${encodeURIComponent(search ?? "")}&status=${filter}${type ? `&type=${type}` : ""}`;

  return (
    <div className="space-y-4">
      <form method="get" className="flex flex-wrap items-center gap-3">
        <Input
          name="q"
          placeholder="Search coupon code..."
          defaultValue={search}
          className="max-w-xs"
        />
        <select
          name="status"
          defaultValue={filter}
          className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="expired">Expired</option>
        </select>
        <select
          name="type"
          defaultValue={type ?? ""}
          className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
        >
          <option value="">All types</option>
          <option value="PERCENTAGE">Percentage</option>
          <option value="FIXED">Fixed</option>
        </select>
        <button
          type="submit"
          className="inline-flex h-9 items-center justify-center border border-[#101114] bg-[#101114] px-4 text-sm font-semibold text-white"
        >
          Filter
        </button>
        <Link
          href="/admin/coupons/new"
          className="ml-auto inline-flex h-9 items-center justify-center bg-[#101114] px-4 text-sm font-semibold text-white"
        >
          New coupon
        </Link>
      </form>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr className="text-left">
              <th className="p-3 font-medium">Code</th>
              <th className="p-3 font-medium">Discount</th>
              <th className="p-3 font-medium">Usage</th>
              <th className="p-3 font-medium">Expires</th>
              <th className="p-3 font-medium">Created</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-muted-foreground p-10 text-center">
                  No coupons found.
                </td>
              </tr>
            ) : (
              coupons.map((coupon) => {
                const status = couponStatus(coupon);
                return (
                  <tr key={coupon.id}>
                    <td className="p-3 font-mono font-medium">{coupon.code}</td>
                    <td className="p-3">
                      {coupon.discountType === "PERCENTAGE"
                        ? `${coupon.discountValue}%`
                        : money(coupon.discountValue)}
                    </td>
                    <td className="p-3">
                      {coupon.usageCount} / {coupon.usageLimit ?? "∞"}
                    </td>
                    <td className="p-3">
                      {coupon.endDate
                        ? new Date(coupon.endDate).toLocaleDateString("en-BD")
                        : "No expiry"}
                    </td>
                    <td className="p-3">
                      {new Date(coupon.createdAt).toLocaleDateString("en-BD")}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={
                          status === "EXPIRED"
                            ? "destructive"
                            : status === "ACTIVE"
                              ? "outline"
                              : "secondary"
                        }
                      >
                        {status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/admin/coupons/${coupon.id}/edit`}
                        className="text-primary font-medium hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 ? (
        <nav aria-label="Coupon pages" className="flex items-center justify-center gap-3">
          {page > 1 ? (
            <Link
              href={`/admin/coupons?${query}&page=${page - 1}`}
              className="inline-flex size-10 items-center justify-center rounded-sm border"
            >
              ←
            </Link>
          ) : null}
          <span className="text-sm font-medium">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/admin/coupons?${query}&page=${page + 1}`}
              className="inline-flex size-10 items-center justify-center rounded-sm border"
            >
              →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Coupons &amp; Discounts</h1>
        <p className="text-muted-foreground">
          Configure coupon codes used by future checkout integrations.
        </p>
      </div>
      <Suspense fallback={<div className="p-12 text-center">Loading coupons...</div>}>
        <CouponTable searchParams={await searchParams} />
      </Suspense>
    </div>
  );
}
