import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminUsersTable } from "@/components/admin/users";
import { AdminUserListItem, AdminUserStats } from "@/lib/admin/users";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/admin/admins",
}));

describe("Admin & Staff Management UI", () => {
  const mockStats: AdminUserStats = {
    totalStaff: 3,
    admins: 1,
    managers: 1,
    staff: 1,
  };

  const mockUsers: AdminUserListItem[] = [
    {
      id: "u1",
      name: "Siam Sadman",
      email: "siam@vibelock.bd",
      phone: "01711112222",
      role: "ADMIN",
      createdAt: new Date("2026-01-15T00:00:00.000Z"),
      emailVerified: new Date(),
      phoneVerified: null,
    },
    {
      id: "u2",
      name: "Manager User",
      email: "manager@vibelock.bd",
      phone: null,
      role: "MANAGER",
      createdAt: new Date("2026-02-10T00:00:00.000Z"),
      emailVerified: null,
      phoneVerified: null,
    },
    {
      id: "u3",
      name: "Staff Member",
      email: "staff@vibelock.bd",
      phone: "01899998888",
      role: "STAFF",
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
      emailVerified: null,
      phoneVerified: null,
    },
  ];

  test("renders member names, emails, and role badges", () => {
    const html = renderToStaticMarkup(
      <AdminUsersTable
        initialUsers={mockUsers}
        stats={mockStats}
        currentAdminId="u1"
      />
    );

    expect(html).toContain("Siam Sadman");
    expect(html).toContain("siam@vibelock.bd");
    expect(html).toContain("01711112222");
    expect(html).toContain("ADMIN");

    expect(html).toContain("Manager User");
    expect(html).toContain("manager@vibelock.bd");
    expect(html).toContain("MANAGER");

    expect(html).toContain("Staff Member");
    expect(html).toContain("staff@vibelock.bd");
    expect(html).toContain("STAFF");
  });

  test("highlights current logged in admin with 'You' pill", () => {
    const html = renderToStaticMarkup(
      <AdminUsersTable
        initialUsers={mockUsers}
        stats={mockStats}
        currentAdminId="u1"
      />
    );

    expect(html).toContain("You");
  });

  test("renders Add Staff / Admin button and role select dropdowns", () => {
    const html = renderToStaticMarkup(
      <AdminUsersTable
        initialUsers={mockUsers}
        stats={mockStats}
        currentAdminId="u1"
      />
    );

    expect(html).toContain("Add Staff / Admin");
    expect(html).toContain("Demote to CUSTOMER");
  });

  test("renders role tabs, search, columns visibility, export CSV, and meta counter", () => {
    const html = renderToStaticMarkup(
      <AdminUsersTable
        initialUsers={mockUsers}
        stats={mockStats}
        currentAdminId="u1"
      />
    );

    expect(html).toContain("All Roles");
    expect(html).toContain("Admins");
    expect(html).toContain("Managers");
    expect(html).toContain("Staff");
    expect(html).toContain("Columns");
    expect(html).toContain("Export CSV");
    expect(html).toContain("Showing");
    expect(html).toContain("members");
  });
});

