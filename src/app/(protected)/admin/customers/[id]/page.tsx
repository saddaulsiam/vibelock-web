import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Mail,
  Phone,
  ShoppingBag,
  CheckCircle2,
  DollarSign,
  XCircle,
  RotateCcw,
  MessageCircle,
  ChevronRight,
  MapPin,
  Sparkles,
  UserCheck,
  User,
} from "lucide-react";
import { getAdminCustomerById } from "@/lib/admin/customer-queries";
import { CustomerBackButton } from "@/components/admin/customer-back-button";
import { CustomerRiskWidget } from "@/components/admin/customer-risk-widget";
import {
  AdminOrderStatusBadge,
  AdminPaymentStatusBadge,
  getSalesChannelBadge,
} from "@/components/admin/admin-order-badges";

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

function generateWhatsAppUrl(phone: string, customerName?: string | null): string {
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("880")) {
    // BD full country code
  } else if (clean.startsWith("0")) {
    clean = "88" + clean;
  } else if (clean.length === 10) {
    clean = "880" + clean;
  }
  const greeting = customerName ? `Hello ${customerName}` : "Hello";
  const msg = `${greeting}, thank you for contacting VibeLock! `;
  return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
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

  const { customer, orders, riskProfile, summary, totalOrderPages } = result;
  const initials = getInitials(customer.name, customer.email);

  const isVip = summary.totalOrders >= 3 || summary.totalSpent >= 10000;
  const isRepeat = summary.totalOrders >= 2 && !isVip;

  return (
    <div className="space-y-6">
      {/* 1. Header & Back Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-200/80 pb-4">
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
          <p className="mt-1 text-xs text-neutral-500 font-mono">{customer.email}</p>
        </div>

        {/* Quick Contact & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {customer.phone && (
            <>
              <a
                href={generateWhatsAppUrl(customer.phone, customer.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 text-xs font-semibold text-emerald-800 shadow-2xs hover:bg-emerald-100 transition"
              >
                <MessageCircle className="size-3.5 text-emerald-600" />
                <span>WhatsApp</span>
              </a>
              <a
                href={`tel:${customer.phone}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200/90 bg-white px-3.5 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 transition"
              >
                <Phone className="size-3.5 text-blue-600" />
                <span>Call Phone</span>
              </a>
            </>
          )}
          <a
            href={`mailto:${customer.email}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200/90 bg-white px-3.5 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 transition"
          >
            <Mail className="size-3.5 text-neutral-500" />
            <span>Email</span>
          </a>
        </div>
      </div>

      {/* 2. Customer Summary Metric Cards */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-neutral-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Orders</span>
            <ShoppingBag className="size-4 text-neutral-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-neutral-900">{summary.totalOrders}</div>
          <p className="mt-1 text-[11px] text-neutral-400">All lifetime orders</p>
        </div>

        <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/30 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Paid Orders</span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-800">{summary.paidOrders}</div>
          <p className="mt-1 text-[11px] text-emerald-600">Successfully paid</p>
        </div>

        <div className="rounded-xl border border-purple-200/90 bg-purple-50/30 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-purple-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Lifetime Spent</span>
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
            <span className="text-[11px] font-bold uppercase tracking-wider">Cancelled</span>
            <XCircle className="size-4 text-red-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-red-800">{summary.cancelledOrders}</div>
          <p className="mt-1 text-[11px] text-red-600">Cancelled orders</p>
        </div>

        <div className="rounded-xl border border-amber-200/90 bg-amber-50/30 p-4 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Returns / Refund</span>
            <RotateCcw className="size-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-800">
            {summary.returnedOrRefundedOrders}
          </div>
          <p className="mt-1 text-[11px] text-amber-600">Returned or refunded</p>
        </div>
      </div>

      {/* 3. Customer Info Card & Courier Risk Intelligence */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Customer Information Card */}
        <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-3.5 border-b border-neutral-100 pb-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-neutral-100 font-bold text-base text-neutral-700 ring-2 ring-neutral-200/80">
              {initials}
            </div>
            <div>
              <div className="font-bold text-base text-neutral-900">
                {customer.name || "Unnamed Customer"}
              </div>
              <div className="text-xs text-neutral-500">ID: {customer.id.slice(0, 8)}...</div>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="font-bold text-neutral-500 uppercase text-[10px] tracking-wider block">
                Email Address
              </span>
              <span className="font-mono text-neutral-900 text-sm mt-0.5 block truncate">
                {customer.email}
              </span>
            </div>

            <div>
              <span className="font-bold text-neutral-500 uppercase text-[10px] tracking-wider block">
                Phone Number
              </span>
              {customer.phone ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-neutral-900 text-sm">{customer.phone}</span>
                  <a
                    href={`tel:${customer.phone}`}
                    className="text-blue-600 hover:underline text-[11px] font-semibold"
                  >
                    Call
                  </a>
                </div>
              ) : (
                <span className="text-neutral-400 italic mt-0.5 block">No phone number recorded</span>
              )}
            </div>

            <div>
              <span className="font-bold text-neutral-500 uppercase text-[10px] tracking-wider block">
                Account Created
              </span>
              <span className="text-neutral-900 text-sm mt-0.5 block">
                {formatDate(customer.createdAt)}
              </span>
            </div>

            <div>
              <span className="font-bold text-neutral-500 uppercase text-[10px] tracking-wider block">
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
          />
        </div>
      </div>

      {/* 4. Saved Addresses */}
      <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
          <MapPin className="size-4 text-neutral-500" />
          <h2 className="text-sm font-bold text-neutral-900">Saved Delivery Addresses</h2>
          <span className="text-xs text-neutral-500 font-medium">({customer.addresses.length})</span>
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
                <p className="text-neutral-700 leading-relaxed">{address.street}</p>
                <p className="text-neutral-600 font-medium mt-1">
                  {address.city}
                  {address.state ? `, ${address.state}` : ""}
                  {address.zip ? ` - ${address.zip}` : ""}
                </p>
                <p className="text-neutral-500 text-[11px]">{address.country}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Complete Order History */}
      <div className="rounded-xl border border-neutral-200/90 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-4 text-neutral-500" />
            <h2 className="text-sm font-bold text-neutral-900">Order History</h2>
            <span className="text-xs text-neutral-500 font-medium">({summary.totalOrders})</span>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400 italic">
            This customer has not placed any orders yet.
          </div>
        ) : (
          <>
            {/* Desktop Orders Table (hidden md:block) */}
            <div className="hidden md:block overflow-hidden rounded-lg border border-neutral-200/80">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-neutral-50/75 border-b border-neutral-200/80 text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                  <tr>
                    <th className="py-2.5 px-3">Order Number</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Channel</th>
                    <th className="py-2.5 px-3">Items Preview</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Payment</th>
                    <th className="py-2.5 px-3">Total</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-neutral-50/60 transition">
                      <td className="py-2.5 px-3 font-bold text-neutral-900">
                        {order.orderNumber}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600 font-mono">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="py-2.5 px-3">
                        {getSalesChannelBadge(order.salesChannel)}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="max-w-[220px] truncate text-neutral-700">
                          {order.previewItems.length > 0 ? (
                            order.previewItems
                              .map(
                                (item) =>
                                  `${item.productName}${item.size ? ` (${item.size})` : ""}`
                              )
                              .join(", ")
                          ) : (
                            <span className="text-neutral-400">{order.itemCount} items</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <AdminOrderStatusBadge status={order.status} />
                      </td>
                      <td className="py-2.5 px-3">
                        <AdminPaymentStatusBadge status={order.paymentStatus} />
                      </td>
                      <td className="py-2.5 px-3 font-bold text-neutral-900">
                        {currency(order.total)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex items-center gap-1 rounded border border-neutral-200 bg-white px-2 py-0.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
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
                  className="rounded-lg border border-neutral-200 bg-neutral-50/40 p-3 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900">{order.orderNumber}</span>
                    <span className="font-mono text-neutral-500 text-[11px]">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <AdminOrderStatusBadge status={order.status} />
                    <AdminPaymentStatusBadge status={order.paymentStatus} />
                  </div>

                  <div className="flex items-center justify-between border-t border-neutral-200/60 pt-2">
                    <span className="font-bold text-neutral-900 text-sm">
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
