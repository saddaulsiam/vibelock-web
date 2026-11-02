import { describe, it, expect } from "vitest";
import { ROLE_HIERARCHY, hasRequiredRole } from "@/lib/auth/roles";
import { navGroups, filterNavGroupsByRole } from "@/components/admin/shared/admin-navigation";

describe("Unified RBAC Hierarchy & Permissions", () => {
  it("enforces the correct numerical hierarchy order", () => {
    expect(ROLE_HIERARCHY.CUSTOMER).toBe(1);
    expect(ROLE_HIERARCHY.STAFF).toBe(2);
    expect(ROLE_HIERARCHY.MANAGER).toBe(3);
    expect(ROLE_HIERARCHY.ADMIN).toBe(4);

    expect(ROLE_HIERARCHY.CUSTOMER).toBeLessThan(ROLE_HIERARCHY.STAFF);
    expect(ROLE_HIERARCHY.STAFF).toBeLessThan(ROLE_HIERARCHY.MANAGER);
    expect(ROLE_HIERARCHY.MANAGER).toBeLessThan(ROLE_HIERARCHY.ADMIN);
  });

  describe("hasRequiredRole", () => {
    it("returns false for null or undefined roles", () => {
      expect(hasRequiredRole(null, "STAFF")).toBe(false);
      expect(hasRequiredRole(undefined, "STAFF")).toBe(false);
    });

    it("evaluates CUSTOMER access correctly", () => {
      expect(hasRequiredRole("CUSTOMER", "CUSTOMER")).toBe(true);
      expect(hasRequiredRole("CUSTOMER", "STAFF")).toBe(false);
      expect(hasRequiredRole("CUSTOMER", "MANAGER")).toBe(false);
      expect(hasRequiredRole("CUSTOMER", "ADMIN")).toBe(false);
    });

    it("evaluates STAFF access correctly", () => {
      expect(hasRequiredRole("STAFF", "CUSTOMER")).toBe(true);
      expect(hasRequiredRole("STAFF", "STAFF")).toBe(true);
      expect(hasRequiredRole("STAFF", "MANAGER")).toBe(false);
      expect(hasRequiredRole("STAFF", "ADMIN")).toBe(false);
    });

    it("evaluates MANAGER access correctly", () => {
      expect(hasRequiredRole("MANAGER", "CUSTOMER")).toBe(true);
      expect(hasRequiredRole("MANAGER", "STAFF")).toBe(true);
      expect(hasRequiredRole("MANAGER", "MANAGER")).toBe(true);
      expect(hasRequiredRole("MANAGER", "ADMIN")).toBe(false);
    });

    it("evaluates ADMIN access correctly", () => {
      expect(hasRequiredRole("ADMIN", "CUSTOMER")).toBe(true);
      expect(hasRequiredRole("ADMIN", "STAFF")).toBe(true);
      expect(hasRequiredRole("ADMIN", "MANAGER")).toBe(true);
      expect(hasRequiredRole("ADMIN", "ADMIN")).toBe(true);
    });
  });

  describe("Navigation RBAC Filtering (filterNavGroupsByRole)", () => {
    it("shows only 6 operational items for STAFF and hides empty groups", () => {
      const filtered = filterNavGroupsByRole(navGroups, "STAFF");
      const totalItems = filtered.flatMap((g) => g.items);
      const labels = totalItems.map((i) => i.label);

      // Staff should only see 6 items
      expect(totalItems).toHaveLength(6);
      expect(labels).toEqual([
        "Dashboard",
        "POS Counter",
        "Orders",
        "Shipping",
        "Returns",
        "Inventory",
      ]);

      // Groups with no items (Marketing & CRM, Analytics & Settings) must not be rendered
      const groupNames = filtered.map((g) => g.group).filter(Boolean);
      expect(groupNames).not.toContain("Marketing & CRM");
      expect(groupNames).not.toContain("Analytics & Settings");
    });

    it("shows 15 management items for MANAGER and excludes Admin/Settings", () => {
      const filtered = filterNavGroupsByRole(navGroups, "MANAGER");
      const totalItems = filtered.flatMap((g) => g.items);
      const labels = totalItems.map((i) => i.label);

      // Manager should see 15 items
      expect(totalItems).toHaveLength(15);
      expect(labels).toContain("Payments");
      expect(labels).toContain("Products");
      expect(labels).toContain("Categories");
      expect(labels).toContain("Inventory Intelligence");
      expect(labels).toContain("Customers");
      expect(labels).toContain("Reviews");
      expect(labels).toContain("Coupons");
      expect(labels).toContain("Banners");
      expect(labels).toContain("Reports");

      // Admins & Settings must be hidden from Manager
      expect(labels).not.toContain("Admins");
      expect(labels).not.toContain("Settings");
    });

    it("shows all 17 items across all groups for ADMIN", () => {
      const filtered = filterNavGroupsByRole(navGroups, "ADMIN");
      const totalItems = filtered.flatMap((g) => g.items);
      const labels = totalItems.map((i) => i.label);

      expect(totalItems).toHaveLength(17);
      expect(labels).toContain("Admins");
      expect(labels).toContain("Settings");
      expect(labels).toContain("Dashboard");
      expect(labels).toContain("POS Counter");
    });
  });
});

