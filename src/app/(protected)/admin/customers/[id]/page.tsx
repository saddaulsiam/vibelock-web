import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ShoppingBag,
  CheckCircle2,
  DollarSign,
  XCircle,
  RotateCcw,
  ChevronRight,
  MapPin,
  Sparkles,
  UserCheck,
  User,
  Ban,
  Lock,
} from "lucide-react";
import { getAdminCustomerById } from "@/lib/admin/customers";
import {
  CustomerAbandonedCartCard,
  CustomerBackButton,
  CustomerDetailHeaderActions,
  CustomerPreferencesCard,
  CustomerReviewsCard,
  CustomerRiskWidget,
  CustomerSecurityCard,
  CustomerStaffNotes,
  CustomerTimelineCard,
} from "@/components/admin/customers";
import {
  AdminOrderStatusBadge,
  AdminPaymentStatusBadge,
  getSalesChannelBadge,
} from "@/components/admin/orders/admin-order-badges";

function currency(value: unknown): string {
  const num = typeof value === "number" ? value : Number(value || 0);
  const [integerPart, fractionPart] = (Number.isFinite(num) ? num : 0).toFixed(2).split(".");
  const sign = integerPart.startsWith("-") ? "-" : "";
  const unsignedInteger = sign ? integerPart.slice(1) : integerPart;
  const groupedInteger = unsignedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `৳${sign}${groupedInteger}.${fractionPart ?? "00"}`;
}

function formatDate(value: Date | string): string {
  return new Date(value).toLocaleDateString("en-BD", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name: string | null, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export default async function AdminCustomerDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const requestedPage = Number(query.page);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const result = await getAdminCustomerById(id, page);

  if (!result) notFound();

  const {
    customer,
    orders,
    riskProfile,
    preferences,
    staffNotes,
    abandonedCart,
    reviews,
    timeline,
    isCodBlocked,
    codBlockReason,
    isAccountSuspended,
    suspensionReason,
    summary,
    totalOrderPages,
  } = result;
  const initials = getInitials(customer.name, customer.email);

  const isVip = summary.totalOrders >= 3 || summary.totalSpent >= 10000;
  const isRepeat = summary.totalOrders >= 2 && !isVip;

  return (
    <div className="space-y-6">
      {/* Account Suspended Alert Banner */}
      {isAccountSuspended && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-amber-900 shadow-2xs">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-xs">
            <Lock className="size-5" />
          </div>
          <div className="text-xs">
            <div className="text-sm font-bold text-amber-950">Customer Account Login Suspended</div>
            <p className="mt-0.5 leading-relaxed text-amber-800">
              This account has been suspended by store administration. Storefront login and checkout
              are blocked.
              {suspensionReason ? ` (Reason: ${suspensionReason})` : ""}
            </p>
          </div>
        </div>
      )}

      {/* COD Restricted Alert Banner */}
      {isCodBlocked && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50/90 p-4 text-rose-900 shadow-2xs">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-xs">
            <Ban className="size-5" />
          </div>
          <div className="text-xs">
            <div className="text-sm font-bold text-rose-950">
              Cash on Delivery (COD) Privilege Suspended
            </div>
            <p className="mt-0.5 leading-relaxed text-rose-800">
              This customer is restricted from placing COD orders due to high return risk or
              administrative hold. Online advance payment is required for all orders.
              {codBlockReason ? ` (Reason: ${codBlockReason})` : ""}
            </p>
          </div>
        </div>
      )}

      {/* 1. Header & Back Navigation */}
      <div className="flex flex-col gap-4 border-b border-neutral-200/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CustomerBackButton />
          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#101114] sm:text-3xl">
              {customer.name || "Unnamed Customer"}
            </h1>
            {isVip && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                <Sparkles className="size-3 text-emerald-600" /> VIP Customer
              </span>
            )}
            {isRepeat && (
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                <UserCheck className="size-3 text-blue-600" /> Repeat Buyer
              </span>
            )}
            {summary.totalOrders === 1 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
                <ShoppingBag className="size-3 text-purple-600" /> 1 Order Placed
              </span>
            )}
            {summary.totalOrders === 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
                <User className="size-3 text-neutral-400" /> Registered Lead
              </span>
            )}
          </div>
          <p className="mt-1 font-mono text-xs text-neutral-500">{customer.email}</p>
        </div>

        {/* Header Actions: Edit Profile, Smart WhatsApp CRM, Phone, Email */}
        <CustomerDetailHeaderActions
          customer={customer}
          preferredSize={preferences.preferredSize}
          totalOrders={summary.totalOrders}
          totalSpent={summary.totalSpent}
        />
      </div>

      {/* 2. Customer Summary Metric Cards */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-neutral-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[11px] font-bold tracking-wider uppercase">Total Orders</span>
            <ShoppingBag className="size-4 text-neutral-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-neutral-900">{summary.totalOrders}</div>
          <p className="mt-1 text-[11px] text-neutral-400">All lifetime orders</p>
        </div>

        <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/30 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-bold tracking-wider uppercase">Paid Orders</span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-800">{summary.paidOrders}</div>
          <p className="mt-1 text-[11px] text-emerald-600">Successfully paid</p>
        </div>

        <div className="rounded-xl border border-purple-200/90 bg-purple-50/30 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-purple-700">
            <span className="text-[11px] font-bold tracking-wider uppercase">Lifetime Spent</span>
            <DollarSign className="size-4 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-purple-900">
            {currency(summary.totalSpent)}
          </div>
          <p className="mt-1 text-[11px] text-purple-600">
            {summary.paidOrders > 0 ? `Avg ${currency(summary.aov)}/order` : "No paid orders"}
          </p>
        </div>

        <div className="rounded-xl border border-red-200/90 bg-red-50/30 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-red-700">
            <span className="text-[11px] font-bold tracking-wider uppercase">Cancelled</span>
            <XCircle className="size-4 text-red-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-red-800">{summary.cancelledOrders}</div>
          <p className="mt-1 text-[11px] text-red-600">Cancelled orders</p>
        </div>

        <div className="col-span-2 rounded-xl border border-amber-200/90 bg-amber-50/30 p-4 shadow-2xs sm:col-span-1">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[11px] font-bold tracking-wider uppercase">Returns / Refund</span>
            <RotateCcw className="size-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-800">
            {summary.returnedOrRefundedOrders}
          </div>
          <p className="mt-1 text-[11px] text-amber-600">Returned or refunded</p>
        </div>
      </div>

      {/* 3. Customer Shopping Preferences & Size Insights */}
      <CustomerPreferencesCard preferences={preferences} />

      {/* 4. Active & Abandoned Shopping Cart Recovery */}
      <CustomerAbandonedCartCard
        cart={abandonedCart}
        customerPhone={customer.phone}
        customerName={customer.name}
      />

      {/* 4. Customer Info Card & Courier Risk Intelligence */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Customer Information Card */}
        <div className="space-y-4 rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
          <div className="flex items-center gap-3.5 border-b border-neutral-100 pb-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-base font-bold text-neutral-700 ring-2 ring-neutral-200/80">
              {initials}
            </div>
            <div>
              <div className="text-base font-bold text-neutral-900">
                {customer.name || "Unnamed Customer"}
              </div>
              <div className="text-xs text-neutral-500">ID: {customer.id.slice(0, 8)}...</div>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="block text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
                Email Address
              </span>
              <span className="mt-0.5 block truncate font-mono text-sm text-neutral-900">
                {customer.email}
              </span>
            </div>

            <div>
              <span className="block text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
                Phone Number
              </span>
              {customer.phone ? (
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="font-mono text-sm text-neutral-900">{customer.phone}</span>
                  <a
                    href={`tel:${customer.phone}`}
                    className="text-[11px] font-semibold text-blue-600 hover:underline"
                  >
                    Call
                  </a>
                </div>
              ) : (
                <span className="mt-0.5 block text-neutral-400 italic">
                  No phone number recorded
                </span>
              )}
            </div>

            <div>
              <span className="block text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
                Account Created
              </span>
              <span className="mt-0.5 block text-sm text-neutral-900">
                {formatDate(customer.createdAt)}
              </span>
            </div>

            <div>
              <span className="block text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
                Account Status
              </span>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="inline-flex size-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-neutral-800">Active Customer</span>
              </div>
            </div>
          </div>
        </div>

        {/* Steadfast Courier & VibeLock Fraud Intelligence Widget */}
        <div className="lg:col-span-2">
          <CustomerRiskWidget
            initialProfile={riskProfile}
            customerPhone={customer.phone}
            customerId={customer.id}
            isCodBlocked={isCodBlocked}
            codBlockReason={codBlockReason}
          />
        </div>
      </div>

      {/* 4. Saved Addresses */}
      <div className="space-y-4 rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
          <MapPin className="size-4 text-neutral-500" />
          <h2 className="text-sm font-bold text-neutral-900">Saved Delivery Addresses</h2>
          <span className="text-xs font-medium text-neutral-500">
            ({customer.addresses.length})
          </span>
        </div>

        {customer.addresses.length === 0 ? (
          <p className="text-xs text-neutral-400 italic">No saved addresses on file.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {customer.addresses.map((address) => (
              <div
                key={address.id}
                className={`rounded-lg border p-3.5 text-xs transition ${
                  address.isDefault
                    ? "border-emerald-300 bg-emerald-50/30"
                    : "border-neutral-200/80 bg-neutral-50/50"
                }`}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-bold text-neutral-800">{address.label || "Address"}</span>
                  {address.isDefault && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      Default
                    </span>
                  )}
                </div>
                <p className="leading-relaxed text-neutral-700">{address.street}</p>
                <p className="mt-1 font-medium text-neutral-600">
                  {address.city}
                  {address.state ? `, ${address.state}` : ""}
                  {address.zip ? ` - ${address.zip}` : ""}
                </p>
                <p className="text-[11px] text-neutral-500">{address.country}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Product Reviews & Ratings History */}
      <CustomerReviewsCard reviews={reviews} />

      {/* 7. Internal Staff Notes */}
      <CustomerStaffNotes customerId={customer.id} notes={staffNotes} />

      {/* 8. Account Security & Administrative Controls */}
      <CustomerSecurityCard
        customerId={customer.id}
        customerName={customer.name}
        customerEmail={customer.email}
        orderCount={summary.totalOrders}
        isAccountSuspended={isAccountSuspended}
        suspensionReason={suspensionReason}
      />

      {/* 9. Unified 360° Activity Timeline */}
      <CustomerTimelineCard timeline={timeline} />

      {/* 7. Complete Order History */}
      <div className="space-y-4 rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-4 text-neutral-500" />
            <h2 className="text-sm font-bold text-neutral-900">Order History</h2>
            <span className="text-xs font-medium text-neutral-500">({summary.totalOrders})</span>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400 italic">
            This customer has not placed any orders yet.
          </div>
        ) : (
          <>
            {/* Desktop Orders Table (hidden md:block) */}
            <div className="hidden overflow-hidden rounded-lg border border-neutral-200/80 md:block">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="border-b border-neutral-200/80 bg-neutral-50/75 text-[11px] font-bold tracking-wider text-neutral-600 uppercase">
                  <tr>
                    <th className="px-3 py-2.5">Order Number</th>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Channel</th>
                    <th className="px-3 py-2.5">Items Preview</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Payment</th>
                    <th className="px-3 py-2.5">Total</th>
                    <th className="px-3 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {orders.map((order) => (
                    <tr key={order.id} className="transition hover:bg-neutral-50/60">
                      <td className="px-3 py-2.5 font-bold text-neutral-900">
                        {order.orderNumber}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-neutral-600">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-3 py-2.5">{getSalesChannelBadge(order.salesChannel)}</td>
                      <td className="px-3 py-2.5">
                        <div className="max-w-[220px] truncate text-neutral-700">
                          {order.previewItems.length > 0 ? (
                            order.previewItems
                              .map(
                                (item) => `${item.productName}${item.size ? ` (${item.size})` : ""}`
                              )
                              .join(", ")
                          ) : (
                            <span className="text-neutral-400">{order.itemCount} items</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <AdminOrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-3 py-2.5">
                        <AdminPaymentStatusBadge status={order.paymentStatus} />
                      </td>
                      <td className="px-3 py-2.5 font-bold text-neutral-900">
                        {currency(order.total)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex items-center gap-1 rounded border border-neutral-200 bg-white px-2 py-0.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
                        >
                          <span>View</span>
                          <ChevronRight className="size-3 text-neutral-400" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Orders Cards (md:hidden) */}
            <div className="grid gap-2.5 md:hidden">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50/40 p-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900">{order.orderNumber}</span>
                    <span className="font-mono text-[11px] text-neutral-500">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <AdminOrderStatusBadge status={order.status} />
                    <AdminPaymentStatusBadge status={order.paymentStatus} />
                  </div>

                  <div className="flex items-center justify-between border-t border-neutral-200/60 pt-2">
                    <span className="text-sm font-bold text-neutral-900">
                      {currency(order.total)}
                    </span>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="inline-flex items-center gap-1 rounded bg-[#101114] px-2.5 py-1 text-xs font-semibold text-white"
                    >
                      <span>View Order</span>
                      <ChevronRight className="size-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalOrderPages > 1 && (
              <div className="flex items-center justify-between pt-3 text-xs">
                <span className="text-neutral-500">
                  Page <span className="font-bold text-neutral-900">{page}</span> of{" "}
                  <span className="font-bold text-neutral-900">{totalOrderPages}</span>
                </span>

                <div className="flex items-center gap-1.5">
                  {page > 1 && (
                    <Link
                      href={`/admin/customers/${customer.id}?page=${page - 1}`}
                      className="inline-flex h-7 items-center rounded border border-neutral-200 bg-white px-2.5 font-semibold text-neutral-700 hover:bg-neutral-50"
                    >
                      Previous
                    </Link>
                  )}
                  {page < totalOrderPages && (
                    <Link
                      href={`/admin/customers/${customer.id}?page=${page + 1}`}
                      className="inline-flex h-7 items-center rounded border border-neutral-200 bg-white px-2.5 font-semibold text-neutral-700 hover:bg-neutral-50"
                    >
                      Next
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
