"use client";

import {
  AdminTableColumnVisibility,
  AdminTableMetaBar,
  AdminTableSearchInput,
  AdminTableTabItem,
  AdminTableTabs,
  InfiniteScroll,
  useAdminTableColumns,
  type ColumnOption,
} from "@/components/admin/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select-native";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ADMIN_TABLE_CLASSES, exportToCsv } from "@/lib/admin/shared";
import {
  createAdminUserAction,
  lookupUserByEmailForPromotionAction,
  promoteExistingUserAction,
  updateAdminUserRoleAction,
  type PromotionUserPreview,
} from "@/lib/admin/users/admin-user-actions";
import type { AdminUserListItem, AdminUserStats } from "@/lib/admin/users/admin-user-queries";
import { Role } from "@prisma/client";
import {
  CheckCircle2,
  Download,
  Mail,
  Phone,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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

export function AdminUsersTable({ initialUsers, currentAdminId }: AdminUsersTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [visibleCount, setVisibleCount] = useState(25);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Column Visibility Hook
  const { visibleColumns, handleColumnChange, handleColumnReset, totalVisibleCols } =
    useAdminTableColumns(userColumnOptions);

  // When filters or search change, reset pagination
  const [prevSearch, setPrevSearch] = useState(search);
  const [prevRole, setPrevRole] = useState(roleFilter);

  if (search !== prevSearch || roleFilter !== prevRole) {
    setPrevSearch(search);
    setPrevRole(roleFilter);
    setVisibleCount(25);
  }

  // New User / Promote Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "promote">("create");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "MANAGER" | "STAFF">("STAFF");
  const [newPassword, setNewPassword] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Promote Existing User State
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupResult, setLookupResult] = useState<PromotionUserPreview | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [promoteRole, setPromoteRole] = useState<"ADMIN" | "MANAGER" | "STAFF">("STAFF");
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [isLookingUp, startLookupTransition] = useTransition();

  const filteredUsers = initialUsers.filter((u) => {
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;

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

  const handleExportCsv = () => {
    exportToCsv({
      filename: `vibelock-staff-admins-${new Date().toISOString().slice(0, 10)}`,
      headers: ["User ID", "Name", "Email", "Phone", "Role", "Created Date"],
      rows: filteredUsers.map((u) => [
        u.id,
        u.name || "",
        u.email,
        u.phone || "",
        u.role,
        new Date(u.createdAt).toISOString().replace("T", " ").slice(0, 19),
      ]),
    });
  };

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

  const resetDialogState = () => {
    setCreateError(null);
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setNewRole("STAFF");
    setNewPassword("");
    setLookupEmail("");
    setLookupResult(null);
    setLookupError(null);
    setPromoteRole("STAFF");
    setPromoteError(null);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetDialogState();
      setDialogMode("create");
    }
  };

  const handleLookupUser = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    setPromoteError(null);
    setLookupResult(null);

    startLookupTransition(async () => {
      const res = await lookupUserByEmailForPromotionAction(lookupEmail);
      if (!res.success || !res.user) {
        setLookupError(res.error || "User not found.");
      } else {
        setLookupResult(res.user);
      }
    });
  };

  const handlePromoteUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupResult) return;

    setPromoteError(null);
    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      const res = await promoteExistingUserAction({
        userId: lookupResult.id,
        newRole: promoteRole,
      });

      if (!res.success) {
        setPromoteError(res.error || "Failed to promote user.");
      } else {
        setIsDialogOpen(false);
        resetDialogState();
        setActionSuccess(`${lookupResult.email} promoted to ${promoteRole} successfully.`);
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
          <Badge className="border border-purple-200 bg-purple-50 text-xs font-semibold text-purple-800 hover:bg-purple-100">
            <ShieldCheck className="mr-1 size-3 text-purple-600" />
            ADMIN
          </Badge>
        );
      case "MANAGER":
        return (
          <Badge className="border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-800 hover:bg-blue-100">
            <Shield className="mr-1 size-3 text-blue-600" />
            MANAGER
          </Badge>
        );
      case "STAFF":
        return (
          <Badge className="border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-800 hover:bg-emerald-100">
            <UserCheck className="mr-1 size-3 text-emerald-600" />
            STAFF
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs text-neutral-600">
            {role}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <ShieldAlert className="size-4 shrink-0 text-red-600" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* ── 1. Shared AdminTableTabs Pattern ── */}
      <AdminTableTabs tabs={roleTabs} activeKey={roleFilter} onChange={setRoleFilter} />

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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={filteredUsers.length === 0}
            title="Export filtered staff/admins to CSV"
            className="gap-1.5"
          >
            <Download className="size-3.5 text-neutral-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>

          {/* Create / Promote Admin Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger className={ADMIN_TABLE_CLASSES.buttonPrimary}>
              <Plus className="size-3.5" />
              <span>Add Staff / Admin</span>
            </DialogTrigger>
            <DialogContent className="bg-white sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-vl-dark-900 text-lg font-bold">
                  {dialogMode === "create"
                    ? "Register Staff or Administrator"
                    : "Promote Existing User"}
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-600">
                  {dialogMode === "create"
                    ? "Create a brand-new dashboard account with role permissions."
                    : "Search a registered VibeLock user by email and grant dashboard access without changing their password."}
                </DialogDescription>
              </DialogHeader>

              {/* Two-Mode Switcher */}
              <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-neutral-200 bg-neutral-100 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setDialogMode("create");
                    setCreateError(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    dialogMode === "create"
                      ? "bg-white text-neutral-900 shadow-xs"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  <Plus className="size-3.5" />
                  Create New Staff
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDialogMode("promote");
                    setLookupError(null);
                    setPromoteError(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    dialogMode === "promote"
                      ? "bg-white text-neutral-900 shadow-xs"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  <UserPlus className="size-3.5" />
                  Promote Existing
                </button>
              </div>

              {dialogMode === "create" ? (
                <form onSubmit={handleCreateUser} className="space-y-3.5 pt-1">
                  {createError && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                      {createError}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Tanvir Ahmed"
                      size="default"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="admin@vibelock.bd"
                      size="default"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">Phone Number</label>
                    <Input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="017XXXXXXXX"
                      size="default"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">
                      Role Permission <span className="text-red-500">*</span>
                    </label>
                    <NativeSelect
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as "ADMIN" | "MANAGER" | "STAFF")}
                      size="default"
                    >
                      <option value="STAFF">STAFF — Fulfillment & Customer Support</option>
                      <option value="MANAGER">MANAGER — Catalog, Inventory & Orders</option>
                      <option value="ADMIN">ADMIN — Full System Access & Settings</option>
                    </NativeSelect>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">
                      Initial Password <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      size="default"
                    />
                  </div>

                  <DialogFooter className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="default"
                      onClick={() => setIsDialogOpen(false)}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="default" loading={isPending}>
                      Create Account
                    </Button>
                  </DialogFooter>
                </form>
              ) : (
                <div className="space-y-3.5 pt-1">
                  <form onSubmit={handleLookupUser} className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-700">
                      Registered Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        required
                        value={lookupEmail}
                        onChange={(e) => {
                          setLookupEmail(e.target.value);
                          setLookupError(null);
                          setPromoteError(null);
                        }}
                        placeholder="customer@example.com"
                        size="default"
                      />
                      <Button
                        type="submit"
                        variant="outline"
                        size="default"
                        loading={isLookingUp}
                        className="shrink-0 gap-1.5"
                      >
                        <Search className="size-3.5" />
                        Find
                      </Button>
                    </div>
                  </form>

                  {lookupError && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                      {lookupError}
                    </div>
                  )}

                  {promoteError && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                      {promoteError}
                    </div>
                  )}

                  {lookupResult && (
                    <form onSubmit={handlePromoteUser} className="space-y-3.5">
                      <div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-neutral-900">
                              {lookupResult.name || "Unnamed User"}
                            </p>
                            <p className="truncate text-[11px] text-neutral-600">
                              {lookupResult.email}
                            </p>
                          </div>
                          {getRoleBadge(lookupResult.role)}
                        </div>

                        <div className="flex items-center justify-between border-t border-neutral-200 pt-2 text-[11px]">
                          <span className="text-neutral-600">Email Verification</span>
                          {lookupResult.isEmailVerified ? (
                            <Badge className="border border-emerald-200 bg-emerald-50 text-[11px] font-semibold text-emerald-800">
                              <CheckCircle2 className="mr-1 size-3 text-emerald-600" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge className="border border-amber-200 bg-amber-50 text-[11px] font-semibold text-amber-800">
                              <ShieldAlert className="mr-1 size-3 text-amber-600" />
                              Unverified
                            </Badge>
                          )}
                        </div>
                      </div>

                      {lookupResult.role !== "CUSTOMER" && (
                        <div className="rounded-md border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-800">
                          This user already has <strong>{lookupResult.role}</strong> access. You can
                          adjust their role directly from the table.
                        </div>
                      )}

                      {lookupResult.role === "CUSTOMER" && !lookupResult.isEmailVerified && (
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                          Unverified accounts cannot be promoted to staff or administrator roles.
                          Ask the user to verify their email first.
                        </div>
                      )}

                      {lookupResult.role === "CUSTOMER" && lookupResult.isEmailVerified && (
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-neutral-700">
                            Assign Role Permission <span className="text-red-500">*</span>
                          </label>
                          <NativeSelect
                            value={promoteRole}
                            onChange={(e) =>
                              setPromoteRole(e.target.value as "ADMIN" | "MANAGER" | "STAFF")
                            }
                            size="default"
                          >
                            <option value="STAFF">STAFF — Fulfillment & Customer Support</option>
                            <option value="MANAGER">MANAGER — Catalog, Inventory & Orders</option>
                            <option value="ADMIN">ADMIN — Full System Access & Settings</option>
                          </NativeSelect>
                        </div>
                      )}

                      <DialogFooter className="pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="default"
                          onClick={() => handleDialogOpenChange(false)}
                          disabled={isPending}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          variant="primary"
                          size="default"
                          loading={isPending}
                          disabled={
                            lookupResult.role !== "CUSTOMER" || !lookupResult.isEmailVerified
                          }
                        >
                          Promote User
                        </Button>
                      </DialogFooter>
                    </form>
                  )}

                  {!lookupResult && (
                    <DialogFooter className="pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="default"
                        onClick={() => handleDialogOpenChange(false)}
                        disabled={isLookingUp}
                      >
                        Cancel
                      </Button>
                    </DialogFooter>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Meta Counter & Active Filter Reset */}
      <AdminTableMetaBar
        currentCount={visibleUsers.length}
        totalFiltered={filteredUsers.length}
        totalCount={initialUsers.length}
        itemName="member"
        hasActiveFilters={hasActiveFilters}
        onResetFilters={handleResetFilters}
      />

      {/* ── Table Container ── */}
      <Table>
        <TableHeader>
          <TableRow>
            {visibleColumns.member && <TableHead>Member</TableHead>}
            {visibleColumns.contact && <TableHead>Contact</TableHead>}
            {visibleColumns.role && <TableHead>Assigned Role</TableHead>}
            {visibleColumns.date && <TableHead>Joined Date</TableHead>}
            <TableHead className="text-right">Role Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={Math.max(1, totalVisibleCols)}
                className="py-8 text-center text-xs text-neutral-500"
              >
                No staff or administrators found matching the criteria.
              </TableCell>
            </TableRow>
          ) : (
            visibleUsers.map((user) => {
              const isCurrent = user.id === currentAdminId;
              const initials = (user.name || user.email).substring(0, 2).toUpperCase();

              return (
                <TableRow key={user.id}>
                  {/* User Info */}
                  {visibleColumns.member && (
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="bg-vl-dark-900 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate text-xs font-semibold text-neutral-900">
                            {user.name || "Unnamed User"}
                            {isCurrent && (
                              <span className="rounded bg-neutral-100 px-1 py-0.5 text-[10px] font-normal text-neutral-600">
                                You
                              </span>
                            )}
                          </p>
                          <p className="flex items-center gap-1 truncate text-[11px] text-neutral-500">
                            <Mail className="size-3 text-neutral-400" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  )}

                  {/* Contact */}
                  {visibleColumns.contact && (
                    <TableCell className="text-xs text-neutral-600">
                      {user.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3 text-neutral-400" />
                          {user.phone}
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </TableCell>
                  )}

                  {/* Role Badge */}
                  {visibleColumns.role && <TableCell>{getRoleBadge(user.role)}</TableCell>}

                  {/* Joined Date */}
                  {visibleColumns.date && (
                    <TableCell className="text-xs text-neutral-500">
                      {new Date(user.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                  )}

                  {/* Action Dropdown */}
                  <TableCell className="text-right">
                    <NativeSelect
                      disabled={isPending}
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                      size="sm"
                      className="inline-flex w-auto"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="STAFF">STAFF</option>
                      <option value="CUSTOMER">Demote to CUSTOMER</option>
                    </NativeSelect>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* ── Infinite Scroll Sentinel & Load More Controls ── */}
      <InfiniteScroll
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
