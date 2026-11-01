import { describe, expect, test, vi, beforeEach } from "vitest";
import { lookupPosCustomerByPhoneAction } from "@/lib/pos/pos-customer-actions";
import prisma from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/authorization";

// Mock auth
vi.mock("@/lib/auth/authorization", () => ({
  requireRole: vi.fn().mockResolvedValue({
    id: "user-staff-1",
    name: "Staff Cashier",
    email: "cashier@vibelock.com",
    role: "STAFF",
  }),
}));

// Mock prisma client
vi.mock("@/lib/prisma/client", () => {
  return {
    default: {
      user: {
        findFirst: vi.fn(),
      },
      order: {
        findMany: vi.fn(),
      },
    },
    Prisma: {},
  };
});

describe("POS System - lookupPosCustomerByPhoneAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns null when phone number has fewer than 11 digits", async () => {
    const result = await lookupPosCustomerByPhoneAction("01712");
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });

  test("resolves customer profile, computes VIP Gold tier and loyalty points correctly", async () => {
    const mockUser = {
      id: "usr-vip-1",
      name: "Tahmid Rahman",
      email: "tahmid@example.com",
      phone: "01799887766",
      createdAt: new Date("2026-01-15T00:00:00Z"),
    };

    const mockOrders = [
      {
        id: "ord-1",
        orderNumber: "VL-POS-101",
        customerName: "Tahmid Rahman",
        customerPhone: "01799887766",
        total: 12500,
        salesChannel: "POS",
        createdAt: new Date("2026-10-25T14:20:00Z"),
        items: [{ quantity: 2 }, { quantity: 1 }],
      },
      {
        id: "ord-2",
        orderNumber: "VL-WEB-102",
        customerName: "Tahmid Rahman",
        customerPhone: "01799887766",
        total: 8500,
        salesChannel: "WEBSITE",
        createdAt: new Date("2026-10-10T11:00:00Z"),
        items: [{ quantity: 1 }],
      },
    ];

    vi.mocked(prisma.user.findFirst).mockResolvedValue(
      mockUser as unknown as Awaited<ReturnType<typeof prisma.user.findFirst>>
    );
    vi.mocked(prisma.order.findMany).mockResolvedValue(
      mockOrders as unknown as Awaited<ReturnType<typeof prisma.order.findMany>>
    );

    const result = await lookupPosCustomerByPhoneAction("+880 1799-887766");

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    const profile = result.data!;
    expect(profile.name).toBe("Tahmid Rahman");
    expect(profile.phone).toBe("01799887766");
    expect(profile.ordersCount).toBe(2);
    expect(profile.totalSpent).toBe(21000); // 12500 + 8500
    expect(profile.tier).toBe("GOLD"); // 21000 >= 20000 -> GOLD
    expect(profile.loyaltyPoints).toBe(210); // Math.floor(21000 / 100)
    expect(profile.pointsDiscountValue).toBe(210);
    expect(profile.recentOrders).toHaveLength(2);
  });

  test("resolves customer profile from guest orders when user record is absent", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.order.findMany).mockResolvedValue([
      {
        id: "ord-3",
        orderNumber: "VL-POS-103",
        customerName: "Sadia Islam",
        customerPhone: "01811223344",
        total: 3500,
        salesChannel: "POS",
        createdAt: new Date("2026-10-28T16:00:00Z"),
        items: [{ quantity: 1 }],
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.order.findMany>>);

    const result = await lookupPosCustomerByPhoneAction("01811223344");

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    const profile = result.data!;
    expect(profile.name).toBe("Sadia Islam");
    expect(profile.ordersCount).toBe(1);
    expect(profile.totalSpent).toBe(3500);
    expect(profile.tier).toBe("BRONZE"); // < 5000 -> BRONZE
    expect(profile.loyaltyPoints).toBe(35);
  });

  test("handles authorization failure securely", async () => {
    vi.mocked(requireRole).mockRejectedValueOnce(new Error("Unauthorized"));

    const result = await lookupPosCustomerByPhoneAction("01711223344");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });
});

