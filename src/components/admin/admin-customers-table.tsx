"use client";

import { AdminOrderStatusBadge } from "@/components/admin/admin-order-badges";
import {
  AdminTableColumnVisibility,
  type ColumnOption,
} from "@/components/admin/admin-table-column-visibility";
import {
  ADMIN_TABLE_CLASSES,
  AdminTableSearchInput,
  AdminTableTabs,
  type AdminTableTabItem,
} from "@/components/admin/admin-table-controls";
import { AdminTableInfiniteScroll } from "@/components/admin/admin-table-infinite-scroll";
import { CustomerCreateModal } from "@/components/admin/customer-create-modal";
import { loadMoreAdminCustomersAction } from "@/lib/admin/customer-actions";
import type {
  AdminCustomerListItem,
  CustomerSegment,
  CustomerSortBy,
} from "@/lib/admin/customer-queries";
import {
  ArrowUpDown,
  Check,
  ChevronRight,
  Copy,
  Download,
  MessageCircle,
  Phone,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  User,
  UserCheck,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

export type CustomerColumnKey = "contact" | "tier" | "orders" | "spent" | "latestOrder";

const customerColumnOptions: ColumnOption<CustomerColumnKey>[] = [
  { key: "contact", label: "Phone & Contact" },
  { key: "tier", label: "Segment Tier" },
  { key: "orders", label: "Orders Count" },
  { key: "spent", label: "Lifetime Spent" },
  { key: "latestOrder", label: "Latest Order" },
];

function formatBdt(value: unknown): string {
  const num = typeof value === "number" ? value : Number(value || 0);
  const [integerPart, fractionPart] = (Number.isFinite(num) ? num : 0).toFixed(2).split(".");
  const sign = integerPart.startsWith("-") ? "-" : "";
  const unsignedInteger = sign ? integerPart.slice(1) : integerPart;
  const groupedInteger = unsignedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `৳${sign}${groupedInteger}.${fractionPart ?? "00"}`;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "No orders yet";
  const d = new Date(date);
  return d.toLocaleDateString("en-BD", {
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

function generateCustomerWhatsAppUrl(phone: string, customerName?: string | null): string {
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("880")) {
    // BD full country code
  } else if (clean.startsWith("0")) {
    clean = "88" + clean;
  } else if (clean.length === 10) {
    clean = "880" + clean;
  }
  const greeting = customerName ? `Hello ${customerName}` : "Hello";
  const msg = `${greeting}, thank you for being with VibeLock! `;
  return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
}

interface AdminCustomersTableProps {
  customers: AdminCustomerListItem[];
  total: number;
  totalPages?: number;
  currentPage?: number;
  currentSearch?: string;
  currentSegment?: CustomerSegment;
  currentSort?: CustomerSortBy;
  segmentCounts: {
    ALL: number;
    REPEAT: number;
    SINGLE: number;
    LEADS: number;
  };
}

export function AdminCustomersTable({
  customers,
  total,
  currentSearch = "",
  currentSegment = "ALL",
  currentSort = "newest",
  segmentCounts,
}: AdminCustomersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = React.useState(currentSearch);
  const [prevSearchProp, setPrevSearchProp] = React.useState(currentSearch);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  // Focus search input with '/' keyboard shortcut (matches orders, coupons & products tables)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = React.useState<Record<CustomerColumnKey, boolean>>({
    contact: true,
    tier: true,
    orders: true,
    spent: true,
    latestOrder: true,
  });

  // Infinite Scroll State
  const [additionalCustomers, setAdditionalCustomers] = React.useState<AdminCustomerListItem[]>([]);
  const [pageNumber, setPageNumber] = React.useState(1);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [prevCustomers, setPrevCustomers] = React.useState(customers);

  // Sync state if currentSearch prop changes externally
  if (currentSearch !== prevSearchProp) {
    setPrevSearchProp(currentSearch);
    setSearchTerm(currentSearch);
  }

  // When customers list updates due to URL filtering / navigation, reset additional loaded items
  if (customers !== prevCustomers) {
    setPrevCustomers(customers);
    setAdditionalCustomers([]);
    setPageNumber(1);
  }

  // Combine initial slice with any infinite-scroll loaded customers
  const loadedCustomers = React.useMemo(() => {
    const existingIds = new Set(customers.map((c) => c.id));
    return [...customers, ...additionalCustomers.filter((c) => !existingIds.has(c.id))];
  }, [customers, additionalCustomers]);

  const hasMore = loadedCustomers.length < total;

  const handleLoadMore = React.useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = pageNumber + 1;
      const res = await loadMoreAdminCustomersAction({
        search: currentSearch || undefined,
        segment: currentSegment !== "ALL" ? currentSegment : undefined,
        sortBy: currentSort,
        page: nextPage,
        pageSize: 20,
      });

      if (res && res.customers.length > 0) {
        setAdditionalCustomers((prev) => [...prev, ...res.customers]);
        setPageNumber(nextPage);
      }
    } catch (err) {
      console.error("Failed to load more customers:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentSearch, currentSegment, currentSort, hasMore, isLoadingMore, pageNumber]);

  const updateFilters = React.useCallback(
    (updates: {
      q?: string | null;
      segment?: string | null;
      sort?: string | null;
    }) => {
      const params = new URLSearchParams(searchParams.toString());

      if (updates.q !== undefined) {
        if (updates.q && updates.q.trim()) {
          params.set("q", updates.q.trim());
        } else {
          params.delete("q");
        }
        params.delete("page");
      }

      if (updates.segment !== undefined) {
        if (updates.segment && updates.segment !== "ALL") {
          params.set("segment", updates.segment);
        } else {
          params.delete("segment");
        }
        params.delete("page");
      }

      if (updates.sort !== undefined) {
        if (updates.sort && updates.sort !== "newest") {
          params.set("sort", updates.sort);
        } else {
          params.delete("sort");
        }
      }

      params.delete("page");

      const query = params.toString();
      router.push(`/admin/customers${query ? `?${query}` : ""}`);
    },
    [router, searchParams]
  );

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchTerm });
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    updateFilters({ q: "" });
  };

  const handleCopyPhone = (id: string, phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportCsv = () => {
    const safeCell = (val: unknown) => {
      const text = String(val ?? "");
      const sanitized = /^[=+\-@]/.test(text) ? `'${text}` : text;
      return /[",\n\r]/.test(sanitized) ? `"${sanitized.replace(/"/g, '""')}"` : sanitized;
    };

    const headers = [
      "Customer Name",
      "Email",
      "Phone",
      "Segment Tier",
      "Total Orders",
      "Paid Order Value (BDT)",
      "Latest Order Date",
      "Joined Date",
    ];

    const rows = loadedCustomers.map((c) => [
      safeCell(c.name || "Unnamed Customer"),
      safeCell(c.email),
      safeCell(c.phone || ""),
      safeCell(c.tier),
      safeCell(c.orderCount),
      safeCell(c.paidOrderValue),
      safeCell(c.latestOrderDate ? new Date(c.latestOrderDate).toISOString().slice(0, 10) : ""),
      safeCell(new Date(c.createdAt).toISOString().slice(0, 10)),
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `vibelock-customers-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const tabs: AdminTableTabItem<CustomerSegment>[] = [
    { key: "ALL", label: "All Customers", count: segmentCounts.ALL },
    {
      key: "REPEAT",
      label: "Repeat / VIP",
      count: segmentCounts.REPEAT,
      dotColor: "bg-emerald-500",
    },
    {
      key: "SINGLE",
      label: "First-Time",
      count: segmentCounts.SINGLE,
      dotColor: "bg-blue-500",
    },
    {
      key: "LEADS",
      label: "Leads (0 Orders)",
      count: segmentCounts.LEADS,
      dotColor: "bg-neutral-400",
    },
  ];

  const hasActiveFilters = Boolean(
    currentSearch || currentSegment !== "ALL" || currentSort !== "newest"
  );

  return (
    <div className="space-y-4">
      {/* 1. Shared AdminTableTabs Pattern */}
      <AdminTableTabs
        tabs={tabs}
        activeKey={currentSegment}
        onChange={(seg) => updateFilters({ segment: seg })}
      />

      {/* 2. Search & Toolbar Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="max-w-md flex-1">
          <AdminTableSearchInput
            inputRef={searchInputRef}
            value={searchTerm}
            onChange={handleSearchChange}
            onClear={handleClearSearch}
            placeholder="Search customer name, email, or phone (press / to focus)..."
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sort Dropdown */}
          <div className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 shadow-2xs transition-colors hover:border-neutral-300 focus-within:ring-2 focus-within:ring-[#00D9FF]">
            <ArrowUpDown className="size-3.5 shrink-0 text-neutral-500" />
            <select
              aria-label="Sort customers"
              value={currentSort}
              onChange={(e) => updateFilters({ sort: e.target.value as CustomerSortBy })}
              className="cursor-pointer bg-transparent text-xs font-semibold text-neutral-800 outline-none focus:outline-none"
            >
              <option value="newest">Sort: Newest Joined</option>
              <option value="spent">Sort: Highest Spent (LTV)</option>
              <option value="orders">Sort: Most Orders</option>
              <option value="oldest">Sort: Oldest Joined</option>
            </select>
          </div>

          {/* Column Visibility Customizer */}
          <AdminTableColumnVisibility
            columns={customerColumnOptions}
            visibleColumns={visibleColumns}
            onChange={(key, val) => setVisibleColumns((prev) => ({ ...prev, [key]: val }))}
            buttonClassName={ADMIN_TABLE_CLASSES.buttonSecondary}
            onReset={() =>
              setVisibleColumns({
                contact: true,
                tier: true,
                orders: true,
                spent: true,
                latestOrder: true,
              })
            }
          />

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={exportCsv}
            disabled={loadedCustomers.length === 0}
            className={ADMIN_TABLE_CLASSES.buttonSecondary}
          >
            <Download className="size-3.5 text-neutral-500" />
            <span>Export CSV</span>
          </button>

          {/* Add Customer Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className={ADMIN_TABLE_CLASSES.buttonPrimary}
          >
            <UserPlus className="size-3.5" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Meta Counter & Active Filter Reset */}
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <div>
          Showing <span className="font-semibold text-neutral-900">{loadedCustomers.length}</span> of{" "}
          <span className="font-semibold text-neutral-900">{total}</span> customers
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              router.push("/admin/customers");
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:underline"
          >
            <RotateCcw className="size-3" />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {/* 3. Empty State */}
      {loadedCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-white p-12 text-center shadow-2xs">
          <div className="flex size-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
            <User className="size-6" />
          </div>
          <h3 className="mt-4 text-base font-bold text-neutral-900">No customers found</h3>
          <p className="mt-1 max-w-sm text-xs text-neutral-500">
            {currentSearch
              ? `No customer accounts match "${currentSearch}". Try a different name, email, or phone number.`
              : "No customer accounts found for the selected segment."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                router.push("/admin/customers");
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#101114] px-4 py-2 text-xs font-semibold text-white hover:bg-[#101114]/90"
            >
              <RotateCcw className="size-3.5" />
              <span>Reset all filters</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* 4. Desktop Table View (hidden md:block) using ADMIN_TABLE_CLASSES */}
          <div className="hidden overflow-hidden rounded-xl border border-neutral-200/90 bg-white shadow-2xs md:block">
            <table className={ADMIN_TABLE_CLASSES.table}>
              <thead className={ADMIN_TABLE_CLASSES.thead}>
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  {visibleColumns.contact && <th className="px-4 py-3">Contact</th>}
                  {visibleColumns.tier && <th className="px-4 py-3">Segment Tier</th>}
                  {visibleColumns.orders && <th className="px-4 py-3 text-center">Orders</th>}
                  {visibleColumns.spent && <th className="px-4 py-3">Lifetime Spent</th>}
                  {visibleColumns.latestOrder && <th className="px-4 py-3">Latest Order</th>}
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className={ADMIN_TABLE_CLASSES.tbody}>
                {loadedCustomers.map((c) => {
                  const initials = getInitials(c.name, c.email);
                  const isCopied = copiedId === c.id;

                  return (
                    <tr
                      key={c.id}
                      className={ADMIN_TABLE_CLASSES.tr + " group cursor-pointer"}
                      onClick={() => router.push(`/admin/customers/${c.id}`)}
                    >
                      {/* Customer Identity (Always Visible) */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-700 ring-2 ring-neutral-200/70">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-neutral-900 transition-colors group-hover:text-blue-600">
                              {c.name || "Unnamed Customer"}
                            </div>
                            <div className="font-mono text-xs text-neutral-500">{c.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Phone & Contact Shortcuts */}
                      {visibleColumns.contact && (
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          {c.phone ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs text-neutral-800">{c.phone}</span>
                              <button
                                type="button"
                                onClick={(e) => handleCopyPhone(c.id, c.phone!, e)}
                                className="rounded p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
                                title="Copy phone"
                              >
                                {isCopied ? (
                                  <Check className="size-3 text-emerald-600" />
                                ) : (
                                  <Copy className="size-3" />
                                )}
                              </button>
                              <a
                                href={generateCustomerWhatsAppUrl(c.phone, c.name)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded p-1 text-emerald-600 transition hover:bg-emerald-50"
                                title="Chat on WhatsApp"
                              >
                                <MessageCircle className="size-3.5" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-xs italic text-neutral-400">No phone</span>
                          )}
                        </td>
                      )}

                      {/* Tier Badge */}
                      {visibleColumns.tier && (
                        <td className="px-4 py-3">
                          {c.tier === "VIP" && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                              <Sparkles className="size-3 text-emerald-600" /> VIP Buyer
                            </span>
                          )}
                          {c.tier === "REPEAT" && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
                              <UserCheck className="size-3 text-blue-600" /> Repeat Buyer
                            </span>
                          )}
                          {c.tier === "SINGLE" && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[11px] font-semibold text-purple-800">
                              <ShoppingBag className="size-3 text-purple-600" /> 1 Order
                            </span>
                          )}
                          {c.tier === "LEAD" && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600">
                              <User className="size-3 text-neutral-400" /> Lead
                            </span>
                          )}
                        </td>
                      )}

                      {/* Orders Count */}
                      {visibleColumns.orders && (
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-bold text-neutral-800">
                            {c.orderCount}
                          </span>
                        </td>
                      )}

                      {/* Lifetime Spent (LTV) */}
                      {visibleColumns.spent && (
                        <td className="px-4 py-3">
                          <div className="font-bold text-neutral-900">
                            {formatBdt(c.paidOrderValue)}
                          </div>
                          {c.orderCount > 1 && c.paidOrderValue > 0 && (
                            <div className="text-[11px] text-neutral-400">
                              Avg {formatBdt(Math.round(c.paidOrderValue / c.orderCount))}
                            </div>
                          )}
                        </td>
                      )}

                      {/* Latest Order */}
                      {visibleColumns.latestOrder && (
                        <td className="px-4 py-3">
                          {c.latestOrderDate ? (
                            <div>
                              <div className="text-xs font-medium text-neutral-800">
                                {formatDate(c.latestOrderDate)}
                              </div>
                              {c.latestOrderStatus && (
                                <div className="mt-0.5">
                                  <AdminOrderStatusBadge status={c.latestOrderStatus} />
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-400">Never ordered</span>
                          )}
                        </td>
                      )}

                      {/* Action (Always Visible) */}
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/admin/customers/${c.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 shadow-2xs transition hover:bg-neutral-50 hover:text-neutral-900"
                        >
                          <span>View</span>
                          <ChevronRight className="size-3 text-neutral-400" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 5. Mobile Cards View (md:hidden) */}
          <div className="grid gap-3 md:hidden">
            {loadedCustomers.map((c) => {
              const initials = getInitials(c.name, c.email);
              const isCopied = copiedId === c.id;

              return (
                <div
                  key={c.id}
                  className="space-y-3 rounded-xl border border-neutral-200/90 bg-white p-4 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-700 ring-2 ring-neutral-200/70">
                        {initials}
                      </div>
                      <div>
                        <div className="font-bold leading-tight text-neutral-900">
                          {c.name || "Unnamed Customer"}
                        </div>
                        <div className="max-w-[200px] truncate font-mono text-xs text-neutral-500">
                          {c.email}
                        </div>
                      </div>
                    </div>

                    <div>
                      {c.tier === "VIP" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          VIP
                        </span>
                      )}
                      {c.tier === "REPEAT" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                          Repeat
                        </span>
                      )}
                      {c.tier === "SINGLE" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-800">
                          1 Order
                        </span>
                      )}
                      {c.tier === "LEAD" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                          Lead
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Phone & Quick Contact Buttons */}
                  {c.phone && (
                    <div className="flex items-center justify-between rounded-lg bg-neutral-50 p-2 text-xs">
                      <div className="flex items-center gap-1.5 font-mono text-neutral-800">
                        <Phone className="size-3 text-neutral-500" />
                        <span>{c.phone}</span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyPhone(c.id, c.phone!, e)}
                          className="rounded p-0.5 text-neutral-400 hover:text-neutral-700"
                          title="Copy phone"
                        >
                          {isCopied ? (
                            <Check className="size-3 text-emerald-600" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${c.phone}`}
                          className="inline-flex items-center gap-1 rounded border border-neutral-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50"
                        >
                          <Phone className="size-3 text-blue-600" /> Call
                        </a>
                        <a
                          href={generateCustomerWhatsAppUrl(c.phone, c.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                        >
                          <MessageCircle className="size-3 text-emerald-600" /> WA
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 rounded-lg border border-neutral-100 bg-neutral-50/50 p-2.5 text-center text-xs">
                    <div>
                      <div className="text-[10px] font-bold uppercase text-neutral-400">
                        Orders
                      </div>
                      <div className="mt-0.5 font-bold text-neutral-800">{c.orderCount}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase text-neutral-400">
                        Lifetime Spent
                      </div>
                      <div className="mt-0.5 font-bold text-neutral-900">
                        {formatBdt(c.paidOrderValue)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase text-neutral-400">
                        Latest
                      </div>
                      <div className="mt-0.5 truncate text-[11px] font-medium text-neutral-700">
                        {c.latestOrderDate ? formatDate(c.latestOrderDate) : "—"}
                      </div>
                    </div>
                  </div>

                  {/* View Details Link */}
                  <Link
                    href={`/admin/customers/${c.id}`}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-neutral-300 bg-white py-2 text-xs font-bold text-neutral-800 shadow-2xs hover:bg-neutral-50"
                  >
                    <span>View Customer Profile</span>
                    <ChevronRight className="size-3.5 text-neutral-400" />
                  </Link>
                </div>
              );
            })}
          </div>

          {/* 6. Shared AdminTableInfiniteScroll Sentinel & Load More Controls */}
          <AdminTableInfiniteScroll
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={handleLoadMore}
            loadedCount={loadedCustomers.length}
            totalCount={total}
            itemName="customers"
            filterSummary={
              segmentCounts?.ALL && segmentCounts.ALL !== total
                ? `filtered from ${segmentCounts.ALL} total`
                : null
            }
          />
        </>
      )}

      {/* Manual Customer Creation Modal */}
      <CustomerCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
