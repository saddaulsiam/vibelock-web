"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import {
  AdminUserListItem,
  AdminUserStats,
} from "@/lib/admin/admin-user-queries";
import {
  createAdminUserAction,
  updateAdminUserRoleAction,
} from "@/lib/admin/admin-user-actions";
import { ADMIN_TABLE_CLASSES } from "@/lib/admin/admin-table-styles";
import {
  AdminTableSearchInput,
  AdminTableTabItem,
  AdminTableTabs,
} from "@/components/admin/admin-table-controls";
import { AdminTableInfiniteScroll } from "@/components/admin/admin-table-infinite-scroll";
import {
  AdminTableColumnVisibility,
  type ColumnOption,
} from "@/components/admin/admin-table-column-visibility";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Download,
  Mail,
  Phone,
  Plus,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

export type UserColumnKey = "member" | "contact" | "role" | "date";

const userColumnOptions: ColumnOption<UserColumnKey>[] = [
  { key: "member", label: "Member (Name & Email)" },
  { key: "contact", label: "Phone Contact" },
  { key: "role", label: "Assigned Role" },
  { key: "date", label: "Joined Date" },
];

interface AdminUsersTableProps {
  initialUsers: AdminUserListItem[];
  stats: AdminUserStats;
  currentAdminId: string;
}

export function AdminUsersTable({
  initialUsers,
  currentAdminId,
}: AdminUsersTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [visibleCount, setVisibleCount] = useState(25);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState<Record<UserColumnKey, boolean>>({
    member: true,
    contact: true,
    role: true,
    date: true,
  });

  const handleColumnChange = (key: UserColumnKey, val: boolean) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: val }));
  };

  const handleColumnReset = () => {
    setVisibleColumns({
      member: true,
      contact: true,
      role: true,
      date: true,
    });
  };

  // When filters or search change, reset pagination
  const [prevSearch, setPrevSearch] = useState(search);
  const [prevRole, setPrevRole] = useState(roleFilter);

  if (search !== prevSearch || roleFilter !== prevRole) {
    setPrevSearch(search);
    setPrevRole(roleFilter);
    setVisibleCount(25);
  }

  // New User Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "MANAGER" | "STAFF">("STAFF");
  const [newPassword, setNewPassword] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const filteredUsers = initialUsers.filter((u) => {
    const matchesRole =
      roleFilter === "ALL" || u.role === roleFilter;

    const query = search.toLowerCase().trim();
    const matchesSearch =
      !query ||
      (u.name && u.name.toLowerCase().includes(query)) ||
      u.email.toLowerCase().includes(query) ||
      (u.phone && u.phone.includes(query));

    return matchesRole && matchesSearch;
  });

  const visibleUsers = filteredUsers.slice(0, visibleCount);
  const hasMore = visibleUsers.length < filteredUsers.length;

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + 25, filteredUsers.length));
      setIsLoadingMore(false);
    }, 200);
  };

  // Role Tab Definitions
  const allCount = initialUsers.length;
  const adminCount = initialUsers.filter((u) => u.role === "ADMIN").length;
  const managerCount = initialUsers.filter((u) => u.role === "MANAGER").length;
  const staffCount = initialUsers.filter((u) => u.role === "STAFF").length;

  const roleTabs: AdminTableTabItem<string>[] = [
    { key: "ALL", label: "All Roles", count: allCount },
    { key: "ADMIN", label: "Admins", count: adminCount, dotColor: "bg-purple-500" },
    { key: "MANAGER", label: "Managers", count: managerCount, dotColor: "bg-blue-500" },
    { key: "STAFF", label: "Staff", count: staffCount, dotColor: "bg-emerald-500" },
  ];

  const hasActiveFilters = Boolean(search.trim() || roleFilter !== "ALL");

  const handleResetFilters = () => {
    setSearch("");
    setRoleFilter("ALL");
    setVisibleCount(25);
  };

  const exportCsv = () => {
    const safeCell = (val: unknown) => {
      const text = String(val ?? "");
      const sanitized = /^[=+\-@]/.test(text) ? `'${text}` : text;
      return /[",\n\r]/.test(sanitized) ? `"${sanitized.replace(/"/g, '""')}"` : sanitized;
    };

    const headers = [
      "User ID",
      "Name",
      "Email",
      "Phone",
      "Role",
      "Created Date",
    ];

    const rows = filteredUsers.map((u) => [
      safeCell(u.id),
      safeCell(u.name || ""),
      safeCell(u.email),
      safeCell(u.phone || ""),
      safeCell(u.role),
      safeCell(new Date(u.createdAt).toISOString().replace("T", " ").slice(0, 19)),
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `vibelock-staff-admins-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totalVisibleCols =
    (visibleColumns.member ? 1 : 0) +
    (visibleColumns.contact ? 1 : 0) +
    (visibleColumns.role ? 1 : 0) +
    (visibleColumns.date ? 1 : 0) +
    1; // Role Action column

  const handleRoleChange = (userId: string, targetRole: Role) => {
    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      const res = await updateAdminUserRoleAction({ userId, newRole: targetRole });
      if (!res.success) {
        setActionError(res.error || "Failed to update role");
      } else {
        setActionSuccess("User role updated successfully.");
        router.refresh();
      }
    });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    startTransition(async () => {
      const res = await createAdminUserAction({
        name: newName,
        email: newEmail,
        phone: newPhone || undefined,
        role: newRole,
        password: newPassword,
      });

      if (!res.success) {
        setCreateError(res.error || "Failed to create user");
      } else {
        setIsDialogOpen(false);
        setNewName("");
        setNewEmail("");
        setNewPhone("");
        setNewPassword("");
        setActionSuccess("New team member registered successfully.");
        router.refresh();
      }
    });
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case "ADMIN":
        return (
          <Badge className="border border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100 font-semibold text-xs">
            <ShieldCheck className="mr-1 size-3 text-purple-600" />
            ADMIN
          </Badge>
        );
      case "MANAGER":
        return (
          <Badge className="border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 font-semibold text-xs">
            <Shield className="mr-1 size-3 text-blue-600" />
            MANAGER
          </Badge>
        );
      case "STAFF":
        return (
          <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold text-xs">
            <UserCheck className="mr-1 size-3 text-emerald-600" />
            STAFF
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-neutral-600 text-xs">
            {role}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-center gap-2">
          <ShieldAlert className="size-4 shrink-0 text-red-600" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* ── 1. Shared AdminTableTabs Pattern ── */}
      <AdminTableTabs
        tabs={roleTabs}
        activeKey={roleFilter}
        onChange={setRoleFilter}
      />

      {/* ── 2. Search & Toolbar Controls ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-md">
          <AdminTableSearchInput
            value={search}
            onChange={setSearch}
            onClear={() => setSearch("")}
            placeholder="Search staff by name, email, or phone..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Column Visibility Dropdown */}
          <AdminTableColumnVisibility<UserColumnKey>
            columns={userColumnOptions}
            visibleColumns={visibleColumns}
            onChange={handleColumnChange}
            onReset={handleColumnReset}
          />

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={exportCsv}
            disabled={filteredUsers.length === 0}
            className={ADMIN_TABLE_CLASSES.buttonSecondary}
            title="Export filtered staff/admins to CSV"
          >
            <Download className="size-3.5 text-neutral-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Create Admin Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger className={ADMIN_TABLE_CLASSES.buttonPrimary}>
              <Plus className="size-3.5" />
              <span>Add Staff / Admin</span>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-[#101114]">
                  Register Staff or Administrator
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-600">
                  Grant dashboard access with specific permissions according to their role.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateUser} className="space-y-3.5 pt-2">
                {createError && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                    {createError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Tanvir Ahmed"
                    className="h-9 w-full rounded-md border border-neutral-200 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="admin@vibelock.bd"
                    className="h-9 w-full rounded-md border border-neutral-200 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="h-9 w-full rounded-md border border-neutral-200 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700">
                    Role Permission <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) =>
                      setNewRole(e.target.value as "ADMIN" | "MANAGER" | "STAFF")
                    }
                    className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                  >
                    <option value="STAFF">STAFF — Fulfillment & Customer Support</option>
                    <option value="MANAGER">MANAGER — Catalog, Inventory & Orders</option>
                    <option value="ADMIN">ADMIN — Full System Access & Settings</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700">
                    Initial Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="h-9 w-full rounded-md border border-neutral-200 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                  />
                </div>

                <DialogFooter className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDialogOpen(false)}
                    className={ADMIN_TABLE_CLASSES.buttonSecondary}
                    disabled={isPending}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className={ADMIN_TABLE_CLASSES.buttonPrimary}
                  >
                    {isPending ? "Creating..." : "Create Account"}
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Meta Counter & Active Filter Reset */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
        <div className="flex items-center gap-2">
          <p>
            Showing <span className="font-semibold text-neutral-900">{visibleUsers.length}</span> of{" "}
            <span className="font-semibold text-neutral-900">{filteredUsers.length}</span>{" "}
            {filteredUsers.length === 1 ? "member" : "members"}
            {filteredUsers.length !== initialUsers.length && ` (filtered from ${initialUsers.length})`}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
            >
              <RotateCcw className="size-3" />
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className={ADMIN_TABLE_CLASSES.container}>
        <table className={ADMIN_TABLE_CLASSES.table}>
          <thead className={ADMIN_TABLE_CLASSES.thead}>
            <tr>
              {visibleColumns.member && <th className="px-4 py-3">Member</th>}
              {visibleColumns.contact && <th className="px-4 py-3">Contact</th>}
              {visibleColumns.role && <th className="px-4 py-3">Assigned Role</th>}
              {visibleColumns.date && <th className="px-4 py-3">Joined Date</th>}
              <th className="px-4 py-3 text-right">Role Action</th>
            </tr>
          </thead>
          <tbody className={ADMIN_TABLE_CLASSES.tbody}>
            {filteredUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={Math.max(1, totalVisibleCols)}
                  className="px-4 py-8 text-center text-xs text-neutral-500"
                >
                  No staff or administrators found matching the criteria.
                </td>
              </tr>
            ) : (
              visibleUsers.map((user) => {
                const isCurrent = user.id === currentAdminId;
                const initials = (user.name || user.email)
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <tr key={user.id} className={ADMIN_TABLE_CLASSES.tr}>
                    {/* User Info */}
                    {visibleColumns.member && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#101114] text-xs font-bold text-white">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
                              {user.name || "Unnamed User"}
                              {isCurrent && (
                                <span className="rounded bg-neutral-100 px-1 py-0.5 text-[10px] font-normal text-neutral-600">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="truncate text-[11px] text-neutral-500 flex items-center gap-1">
                              <Mail className="size-3 text-neutral-400" />
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Contact */}
                    {visibleColumns.contact && (
                      <td className="px-4 py-3 text-xs text-neutral-600">
                        {user.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="size-3 text-neutral-400" />
                            {user.phone}
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                    )}

                    {/* Role Badge */}
                    {visibleColumns.role && (
                      <td className="px-4 py-3">{getRoleBadge(user.role)}</td>
                    )}

                    {/* Joined Date */}
                    {visibleColumns.date && (
                      <td className="px-4 py-3 text-xs text-neutral-500">
                        {new Date(user.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    )}

                    {/* Action Dropdown */}
                    <td className="px-4 py-3 text-right">
                      <select
                        disabled={isPending}
                        value={user.role}
                        onChange={(e) =>
                          handleRoleChange(user.id, e.target.value as Role)
                        }
                        className="h-8 rounded-md border border-neutral-200 bg-white px-2 text-xs font-medium text-neutral-800 shadow-2xs transition-colors hover:border-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF]"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="STAFF">STAFF</option>
                        <option value="CUSTOMER">Demote to CUSTOMER</option>
                      </select>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Infinite Scroll Sentinel & Load More Controls ── */}
      <AdminTableInfiniteScroll
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={handleLoadMore}
        loadedCount={visibleUsers.length}
        totalCount={filteredUsers.length}
        itemName="members"
        filterSummary={
          filteredUsers.length !== initialUsers.length
            ? `filtered from ${initialUsers.length} total`
            : null
        }
      />
    </div>
  );
}
