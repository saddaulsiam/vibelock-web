/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test, vi, beforeEach } from "vitest";
import { Role } from "@prisma/client";
import { AuthRequiredError, ForbiddenError } from "@/lib/auth/authorization";

// ---------------------------------------------------------------------------
// Hoisted mock state and test fixtures
// ---------------------------------------------------------------------------
const {
  mockState,
  mockPrisma,
  mockTx,
  mockRedirect,
} = vi.hoisted(() => {
  const mockState = {
    currentUser: null as { id: string; name?: string; email?: string; role: Role } | null,
  };

  const mockTx = {
    $queryRaw: vi.fn<any>(async () => []),
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    address: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    returnRequest: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(async () => ({ count: 1 })),
      count: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    cart: {
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    review: {
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    account: {
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    passwordResetToken: {
      create: vi.fn(),
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    paymentMethodSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    inventoryTransaction: {
      aggregate: vi.fn(async () => ({ _sum: { quantity: 10 } })),
      create: vi.fn(),
    },
    inventoryReservation: {
      aggregate: vi.fn(async () => ({ _sum: { quantity: 0 } })),
    },
    productVariant: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };

  const mockPrisma = {
    $transaction: vi.fn(async (cb: any) => {
      if (typeof cb === "function") return cb(mockTx);
      if (Array.isArray(cb)) return Promise.all(cb);
      return cb;
    }),
    $queryRaw: vi.fn(async () => []),
    order: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    address: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    returnRequest: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    review: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    session: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    cart: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    cartItem: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    paymentMethodSetting: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    productVariant: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    inventoryTransaction: {
      groupBy: vi.fn(async () => []),
    },
    inventoryReservation: {
      groupBy: vi.fn(async () => []),
    },
    category: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    coupon: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    emailVerificationToken: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  };

  const mockRedirect = vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  });

  return { mockState, mockPrisma, mockTx, mockRedirect };
});

// ---------------------------------------------------------------------------
// Module Mocks
// ---------------------------------------------------------------------------
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
  usePathname: vi.fn(() => "/"),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => {
    if (!mockState.currentUser) return null;
    return {
      user: mockState.currentUser,
      expires: "2099-01-01T00:00:00.000Z",
      currentSessionId: "sess-curr-123",
    };
  }),
}));

vi.mock("@/lib/auth/get-current-user", () => ({
  getCurrentUser: vi.fn(async () => mockState.currentUser),
}));

vi.mock("@/lib/prisma/client", () => ({
  default: mockPrisma,
}));

vi.mock("@/lib/config/env", () => ({
  env: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
    AUTH_SECRET: "mock-secret-for-testing-at-least-32-chars-long",
    SSLCOMMERZ_STORE_ID: "mock_store",
    SSLCOMMERZ_STORE_PASSWORD: "mock_password",
  },
}));

vi.mock("@/lib/config/app", () => ({
  appConfig: {
    url: "https://vibelock.bd",
  },
}));

vi.mock("@/lib/email/client", () => ({
  sendPasswordResetEmail: vi.fn(async () => true),
  sendEmailVerificationEmail: vi.fn(async () => true),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => undefined),
}));

vi.mock("bcryptjs", () => ({
  hash: vi.fn(async () => "$2a$12$mockedHashedPassword"),
  compare: vi.fn(async (plain: string) => plain === "correct-password"),
}));

// ---------------------------------------------------------------------------
// Imports of subjects under test
// ---------------------------------------------------------------------------
import { cancelOrderAction, reorderItemsAction } from "@/lib/orders/actions";
import { getCustomerOrder, getCustomerOrderConfirmation } from "@/lib/orders/queries";
import { updateAddressAction, deleteAddressAction } from "@/lib/account/actions";
import { getCustomerReturnById } from "@/lib/account/queries";
import { createReturnRequestAction } from "@/lib/returns/actions";
import { deleteReviewAction } from "@/lib/reviews/actions";
import { revokeSessionAction } from "@/app/actions/session";
import { createOrderAction } from "@/lib/checkout/actions";
import {
  createAdminUserAction,
  updateAdminUserRoleAction,
} from "@/lib/admin/users/admin-user-actions";
import { togglePaymentMethodAction } from "@/lib/admin/payments/payment-settings-actions";
import {
  adminGenerateCustomerPasswordResetLinkAction,
  deleteAdminCustomerAction,
} from "@/lib/admin/customers/customer-actions";
import { adjustInventoryAction } from "@/lib/admin/inventory/inventory-actions";
import { saveCategoryAction } from "@/lib/admin/catalog/category-actions";
import { updateOrderStatusAction } from "@/lib/admin/orders/order-actions";
import { initiateReturnRefundAction } from "@/lib/admin/returns/return-actions";
import { adminCreateShipmentAction } from "@/lib/shipping/actions";
import { getAdminReconciliation } from "@/lib/admin/reports/reconciliation-queries";
import { registerAction } from "@/app/actions/auth";

// ---------------------------------------------------------------------------
// Test Users Fixtures (Valid UUIDv4 format)
// ---------------------------------------------------------------------------
const CUSTOMER_A = {
  id: "11111111-1111-4111-a111-111111111111",
  name: "Customer A",
  email: "customer.a@example.com",
  role: "CUSTOMER" as Role,
};

const CUSTOMER_B = {
  id: "22222222-2222-4222-a222-222222222222",
  name: "Customer B",
  email: "customer.b@example.com",
  role: "CUSTOMER" as Role,
};

const STAFF_USER = {
  id: "33333333-3333-4333-a333-333333333333",
  name: "Staff Member",
  email: "staff@vibelock.bd",
  role: "STAFF" as Role,
};

const MANAGER_USER = {
  id: "44444444-4444-4444-a444-444444444444",
  name: "Operations Manager",
  email: "manager@vibelock.bd",
  role: "MANAGER" as Role,
};

const ADMIN_USER = {
  id: "55555555-5555-4555-a555-555555555555",
  name: "Super Admin",
  email: "admin@vibelock.bd",
  role: "ADMIN" as Role,
};

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------
describe("Phase 5C: Authorization & Access Control Hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.currentUser = null;
  });

  // =========================================================================
  // 1. Customer Ownership & IDOR Protection (Customer A vs Customer B)
  // =========================================================================
  describe("1. Customer Ownership & IDOR Protection", () => {
    test("Customer A cannot view Customer B's order details", async () => {
      mockState.currentUser = CUSTOMER_A;

      mockPrisma.order.findUnique.mockImplementation(async (args: any) => {
        if (args.where.orderNumber === "ORD-B" && args.where.userId === CUSTOMER_A.id) {
          return null; // Not found for Customer A
        }
        return null;
      });

      const order = await getCustomerOrder("ORD-B");
      expect(order).toBeNull();
      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            orderNumber: "ORD-B",
            userId: CUSTOMER_A.id,
          }),
        })
      );
    });

    test("Customer A cannot view Customer B's order confirmation", async () => {
      mockState.currentUser = CUSTOMER_A;

      mockPrisma.order.findFirst.mockImplementation(async (args: any) => {
        if (args.where.orderNumber === "ORD-B" && args.where.userId === CUSTOMER_A.id) {
          return null;
        }
        return null;
      });

      const confirmation = await getCustomerOrderConfirmation("ORD-B");
      expect(confirmation).toBeNull();
      expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            orderNumber: "ORD-B",
            userId: CUSTOMER_A.id,
          }),
        })
      );
    });

    test("Customer A cannot cancel Customer B's order", async () => {
      mockState.currentUser = CUSTOMER_A;

      mockTx.order.findUnique.mockImplementation(async (args: any) => {
        if (args.where.orderNumber === "ORD-B" && args.where.userId === CUSTOMER_A.id) {
          return null; // Customer A does not own this order
        }
        return null;
      });

      const result = await cancelOrderAction("ORD-B");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Order not found or access denied.");
      expect(mockTx.order.update).not.toHaveBeenCalled();
    });

    test("Customer A cannot reorder items from Customer B's order", async () => {
      mockState.currentUser = CUSTOMER_A;

      mockPrisma.order.findUnique.mockImplementation(async (args: any) => {
        if (args.where.orderNumber === "ORD-B" && args.where.userId === CUSTOMER_A.id) {
          return null;
        }
        return null;
      });

      const result = await reorderItemsAction("ORD-B");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Order not found or has no items.");
    });

    test("Customer A cannot create a return request for Customer B's order", async () => {
      mockState.currentUser = CUSTOMER_A;

      mockTx.order.findUnique.mockImplementation(async (args: any) => {
        if (args.where.orderNumber === "ORD-B" && args.where.userId === CUSTOMER_A.id) {
          return null;
        }
        return null;
      });

      const result = await createReturnRequestAction({
        orderNumber: "ORD-B",
        reason: "DEFECTIVE",
        items: [{ orderItemId: "item-b-1", quantity: 1 }],
      });

      expect(result.success).toBe(false);
      expect((result as any).error).toBe("Order not found or access denied.");
    });

    test("Customer A cannot view Customer B's return request by ID", async () => {
      mockState.currentUser = CUSTOMER_A;

      mockPrisma.returnRequest.findFirst.mockImplementation(async (args: any) => {
        if (args.where.id === "RET-B" && args.where.order?.userId === CUSTOMER_A.id) {
          return null;
        }
        return null;
      });

      const returnReq = await getCustomerReturnById("RET-B");
      expect(returnReq).toBeNull();
      expect(mockPrisma.returnRequest.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: "RET-B",
            order: expect.objectContaining({ userId: CUSTOMER_A.id }),
          }),
        })
      );
    });

    test("Customer A cannot update Customer B's address", async () => {
      mockState.currentUser = CUSTOMER_A;

      mockTx.address.findFirst.mockImplementation(async (args: any) => {
        // Enforces: where: { id: "addr-b-1", userId: user.id }
        if (args.where.id === "addr-b-1" && args.where.userId === CUSTOMER_A.id) {
          return null;
        }
        return null;
      });

      const result = await updateAddressAction("addr-b-1", {
        street: "123 Malicious St",
        city: "Dhaka",
        country: "Bangladesh",
        isDefault: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unable to update this address.");
      expect(mockTx.address.update).not.toHaveBeenCalled();
    });

    test("Customer A cannot delete Customer B's address", async () => {
      mockState.currentUser = CUSTOMER_A;

      mockPrisma.address.deleteMany.mockImplementation(async (args: any) => {
        if (args.where.id === "addr-b-1" && args.where.userId === CUSTOMER_A.id) {
          return { count: 0 };
        }
        return { count: 0 };
      });

      const result = await deleteAddressAction("addr-b-1");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Address not found.");
    });

    test("Customer A cannot delete Customer B's product review", async () => {
      mockState.currentUser = CUSTOMER_A;

      mockPrisma.review.findUnique.mockResolvedValue({
        id: "rev-b-1",
        userId: CUSTOMER_B.id,
        productId: "prod-1",
        rating: 5,
        comment: "Excellent shirt",
        product: { slug: "cotton-shirt" },
      } as any);

      const result = await deleteReviewAction("rev-b-1");
      expect(result.success).toBe(false);
      expect(result.error).toBe("You do not have permission to delete this review.");
      expect(mockPrisma.review.delete).not.toHaveBeenCalled();
    });

    test("Customer A cannot revoke Customer B's session", async () => {
      mockState.currentUser = CUSTOMER_A;

      mockPrisma.session.deleteMany.mockImplementation(async (args: any) => {
        if (args.where.id === "sess-b-1" && args.where.userId === CUSTOMER_A.id) {
          return { count: 0 };
        }
        return { count: 0 };
      });

      const result = await revokeSessionAction("sess-b-1");
      expect(result.error).toBe("Session not found or already revoked.");
    });
  });

  // =========================================================================
  // 2. Unauthenticated Access Protection (Anonymous Rejection)
  // =========================================================================
  describe("2. Unauthenticated Access Protection", () => {
    test("unauthenticated cancelOrderAction returns Unauthorized", async () => {
      mockState.currentUser = null;

      const result = await cancelOrderAction("ORD-123");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    test("unauthenticated createReturnRequestAction returns Unauthorized", async () => {
      mockState.currentUser = null;

      const result = await createReturnRequestAction({
        orderNumber: "ORD-123",
        reason: "DEFECTIVE",
        items: [{ orderItemId: "item-1", quantity: 1 }],
      });
      expect(result.success).toBe(false);
      expect((result as any).error).toBe("Unauthorized");
    });

    test("unauthenticated deleteReviewAction returns Unauthorized", async () => {
      mockState.currentUser = null;

      const result = await deleteReviewAction("rev-1");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    test("unauthenticated createOrderAction returns Unauthorized", async () => {
      mockState.currentUser = null;

      const result = await createOrderAction(
        {
          customerName: "Anonymous",
          customerEmail: "anon@example.com",
          customerPhone: "01700000000",
          shippingStreet: "Road 1",
          shippingCity: "Dhaka",
          shippingMethodId: "sm-1",
          paymentMethod: "COD",
        } as any,
        "idem-anon-123"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    test("unauthenticated createAddressAction throws AuthRequiredError", async () => {
      mockState.currentUser = null;

      await expect(
        updateAddressAction("addr-1", {
          street: "Road 10",
          city: "Dhaka",
          country: "Bangladesh",
        })
      ).rejects.toThrow(AuthRequiredError);
    });

    test("unauthenticated adminCreateShipmentAction redirects to /login", async () => {
      mockState.currentUser = null;

      await expect(adminCreateShipmentAction("order-1")).rejects.toThrow(
        "NEXT_REDIRECT:/login"
      );
    });

    test("unauthenticated createAdminUserAction redirects to /login", async () => {
      mockState.currentUser = null;

      await expect(
        createAdminUserAction({
          name: "Admin Attacker",
          email: "attacker@vibelock.bd",
          role: "ADMIN",
          password: "password123",
        })
      ).rejects.toThrow("NEXT_REDIRECT:/login");
    });
  });

  // =========================================================================
  // 3. Role Hierarchy: Customer Role (Level 1) Rejection for Admin/Staff Actions
  // =========================================================================
  describe("3. Role Enforcement: Customer Role Blocked from Staff/Manager/Admin Actions", () => {
    beforeEach(() => {
      mockState.currentUser = CUSTOMER_A;
    });

    test("CUSTOMER cannot update order status (STAFF minimum)", async () => {
      const formData = new FormData();
      formData.set("id", "ord-1");
      formData.set("status", "CONFIRMED");

      await expect(
        updateOrderStatusAction({ error: null }, formData)
      ).rejects.toThrow(ForbiddenError);
    });

    test("CUSTOMER cannot create shipment (STAFF minimum)", async () => {
      await expect(adminCreateShipmentAction("ord-1")).rejects.toThrow(
        "NEXT_REDIRECT:/unauthorized"
      );
    });

    test("CUSTOMER cannot manage catalog categories (MANAGER minimum)", async () => {
      const formData = new FormData();
      formData.set("name", "Test Category");
      formData.set("slug", "test-category");

      await expect(
        saveCategoryAction({ error: null }, formData)
      ).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });

    test("CUSTOMER cannot initiate return refund (MANAGER minimum)", async () => {
      const formData = new FormData();
      formData.set("returnId", "ret-1");
      formData.set("amount", "1500");
      formData.set("reason", "Customer dissatisfaction");

      await expect(
        initiateReturnRefundAction({ error: null }, formData)
      ).rejects.toThrow(ForbiddenError);
    });

    test("CUSTOMER cannot create admin user (ADMIN minimum)", async () => {
      await expect(
        createAdminUserAction({
          name: "Fake Admin",
          email: "fakeadmin@vibelock.bd",
          role: "ADMIN",
          password: "password123",
        })
      ).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });

    test("CUSTOMER cannot update admin user role (ADMIN minimum)", async () => {
      await expect(
        updateAdminUserRoleAction({
          userId: CUSTOMER_A.id,
          newRole: "ADMIN",
        })
      ).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });

    test("CUSTOMER cannot adjust raw inventory (ADMIN minimum)", async () => {
      const formData = new FormData();
      formData.set("variantId", "var-1");
      formData.set("quantity", "100");
      formData.set("reason", "Malicious inventory addition");

      await expect(
        adjustInventoryAction({ error: null }, formData)
      ).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });

    test("CUSTOMER cannot toggle payment gateway method (ADMIN minimum)", async () => {
      const formData = new FormData();
      formData.set("code", "BKASH");
      formData.set("enabled", "true");

      await expect(
        togglePaymentMethodAction({ error: null }, formData)
      ).rejects.toThrow(ForbiddenError);
    });

    test("CUSTOMER cannot generate raw password reset links (ADMIN minimum)", async () => {
      await expect(
        adminGenerateCustomerPasswordResetLinkAction(CUSTOMER_B.id)
      ).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });

    test("CUSTOMER cannot delete customer accounts (ADMIN minimum)", async () => {
      await expect(deleteAdminCustomerAction(CUSTOMER_B.id)).rejects.toThrow(
        "NEXT_REDIRECT:/unauthorized"
      );
    });
  });

  // =========================================================================
  // 4. Role Hierarchy: Staff Role (Level 2) Rejection for Manager/Admin Actions
  // =========================================================================
  describe("4. Role Enforcement: Staff Role Blocked from Manager/Admin Operations", () => {
    beforeEach(() => {
      mockState.currentUser = STAFF_USER;
    });

    test("STAFF cannot manage catalog categories (MANAGER minimum)", async () => {
      const formData = new FormData();
      formData.set("name", "Test Category");
      formData.set("slug", "test-category");

      await expect(
        saveCategoryAction({ error: null }, formData)
      ).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });

    test("STAFF cannot initiate return refunds (MANAGER minimum)", async () => {
      const formData = new FormData();
      formData.set("returnId", "ret-1");
      formData.set("amount", "1500");
      formData.set("reason", "Damaged item returned");

      await expect(
        initiateReturnRefundAction({ error: null }, formData)
      ).rejects.toThrow(ForbiddenError);
    });

    test("STAFF cannot create admin user accounts (ADMIN minimum)", async () => {
      await expect(
        createAdminUserAction({
          name: "Escalated User",
          email: "escalated@vibelock.bd",
          role: "ADMIN",
          password: "password123",
        })
      ).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });

    test("STAFF cannot update user roles (ADMIN minimum)", async () => {
      await expect(
        updateAdminUserRoleAction({
          userId: STAFF_USER.id,
          newRole: "ADMIN",
        })
      ).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });

    test("STAFF cannot adjust inventory manually (ADMIN minimum)", async () => {
      const formData = new FormData();
      formData.set("variantId", "var-1");
      formData.set("quantity", "50");
      formData.set("reason", "Unauthorized staff adjustment");

      await expect(
        adjustInventoryAction({ error: null }, formData)
      ).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });

    test("STAFF cannot toggle payment methods (ADMIN minimum)", async () => {
      const formData = new FormData();
      formData.set("code", "COD");
      formData.set("enabled", "false");

      await expect(
        togglePaymentMethodAction({ error: null }, formData)
      ).rejects.toThrow(ForbiddenError);
    });

    test("STAFF cannot generate customer password reset link (ADMIN minimum)", async () => {
      await expect(
        adminGenerateCustomerPasswordResetLinkAction(CUSTOMER_A.id)
      ).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });

    test("STAFF cannot delete customer accounts (ADMIN minimum)", async () => {
      await expect(deleteAdminCustomerAction(CUSTOMER_A.id)).rejects.toThrow(
        "NEXT_REDIRECT:/unauthorized"
      );
    });
  });

  // =========================================================================
  // 5. Role Hierarchy: Manager Role (Level 3) Rejection for Admin-Only Operations
  // =========================================================================
  describe("5. Role Enforcement: Manager Role Blocked from Admin-Only Operations", () => {
    beforeEach(() => {
      mockState.currentUser = MANAGER_USER;
    });

    test("MANAGER cannot create admin user accounts (ADMIN minimum)", async () => {
      await expect(
        createAdminUserAction({
          name: "New Admin",
          email: "newadmin@vibelock.bd",
          role: "ADMIN",
          password: "password123",
        })
      ).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });

    test("MANAGER cannot update user roles (ADMIN minimum)", async () => {
      await expect(
        updateAdminUserRoleAction({
          userId: MANAGER_USER.id,
          newRole: "ADMIN",
        })
      ).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });

    test("MANAGER cannot perform manual inventory adjustments (ADMIN minimum)", async () => {
      const formData = new FormData();
      formData.set("variantId", "var-1");
      formData.set("quantity", "20");
      formData.set("reason", "Manager stock adjustment");

      await expect(
        adjustInventoryAction({ error: null }, formData)
      ).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });

    test("MANAGER cannot toggle payment gateway configuration (ADMIN minimum)", async () => {
      const formData = new FormData();
      formData.set("code", "SSLCOMMERZ");
      formData.set("enabled", "true");

      await expect(
        togglePaymentMethodAction({ error: null }, formData)
      ).rejects.toThrow(ForbiddenError);
    });

    test("MANAGER cannot generate raw customer password reset link (ADMIN minimum)", async () => {
      await expect(
        adminGenerateCustomerPasswordResetLinkAction(CUSTOMER_A.id)
      ).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });

    test("MANAGER cannot permanently delete customer accounts (ADMIN minimum)", async () => {
      await expect(deleteAdminCustomerAction(CUSTOMER_A.id)).rejects.toThrow(
        "NEXT_REDIRECT:/unauthorized"
      );
    });

    test("MANAGER cannot access admin reconciliation queries (ADMIN minimum)", async () => {
      await expect(
        getAdminReconciliation({ range: "30d" })
      ).rejects.toThrow("NEXT_REDIRECT:/unauthorized");
    });
  });

  // =========================================================================
  // 6. Admin Role (Level 4) Authorization
  // =========================================================================
  describe("6. Admin Role Allowed for Admin-Only Operations", () => {
    beforeEach(() => {
      mockState.currentUser = ADMIN_USER;
    });

    test("ADMIN can create admin/manager/staff accounts", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: "new-staff-1",
        name: "New Staff",
        email: "newstaff@vibelock.bd",
        role: "STAFF",
      } as any);

      const result = await createAdminUserAction({
        name: "New Staff",
        email: "newstaff@vibelock.bd",
        role: "STAFF",
        password: "securePassword123",
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: "newstaff@vibelock.bd",
            role: "STAFF",
          }),
        })
      );
    });

    test("ADMIN can toggle payment method persistence setting", async () => {
      mockTx.paymentMethodSetting.findUnique.mockResolvedValue({
        id: "pms-1",
        code: "COD",
        name: "Cash on Delivery",
        isEnabled: false,
      } as any);

      mockTx.paymentMethodSetting.upsert.mockResolvedValue({
        id: "pms-1",
        code: "COD",
        isEnabled: true,
      } as any);

      const formData = new FormData();
      formData.set("code", "COD");
      formData.set("enabled", "true");

      const result = await togglePaymentMethodAction({ error: null }, formData);

      expect(result.error).toBeNull();
      expect(result.message).toContain("COD is now enabled");
    });

    test("ADMIN can generate customer password reset link", async () => {
      mockTx.$queryRaw.mockResolvedValue([
        {
          id: CUSTOMER_A.id,
          email: CUSTOMER_A.email,
          name: CUSTOMER_A.name,
        },
      ]);
      mockTx.passwordResetToken.create.mockResolvedValue({ id: "tok-1" } as any);

      const result = await adminGenerateCustomerPasswordResetLinkAction(CUSTOMER_A.id);
      expect(result.success).toBe(true);
      expect(result.resetLink).toBeDefined();
      expect(result.resetLink).toContain("https://vibelock.bd/reset-password?token=");
    });

    test("ADMIN can permanently delete customer with zero orders", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: CUSTOMER_A.id,
        email: CUSTOMER_A.email,
        name: CUSTOMER_A.name,
        role: "CUSTOMER",
        _count: { orders: 0 },
      } as any);

      mockTx.$queryRaw.mockResolvedValue([{ id: CUSTOMER_A.id }]);
      mockTx.user.deleteMany.mockResolvedValue({ count: 1 });
      mockTx.session.deleteMany.mockResolvedValue({ count: 0 });
      mockTx.cart.deleteMany.mockResolvedValue({ count: 0 });
      mockTx.review.deleteMany.mockResolvedValue({ count: 0 });
      mockTx.account.deleteMany.mockResolvedValue({ count: 0 });
      mockTx.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
      mockTx.auditLog.create.mockResolvedValue({ id: "audit-1" } as any);

      const result = await deleteAdminCustomerAction(CUSTOMER_A.id);
      expect(result.success).toBe(true);
      expect(mockTx.user.deleteMany).toHaveBeenCalledWith({
        where: { id: CUSTOMER_A.id, role: "CUSTOMER" },
      });
    });
  });

  // =========================================================================
  // 7. Anti-Self-Demotion & Sole Admin Protection
  // =========================================================================
  describe("7. Anti-Self-Demotion & Sole Admin Protection", () => {
    test("Sole administrator cannot demote themselves to a lower role", async () => {
      mockState.currentUser = ADMIN_USER;

      // Mock only 1 ADMIN in the database
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await updateAdminUserRoleAction({
        userId: ADMIN_USER.id, // self
        newRole: "CUSTOMER",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cannot demote yourself when you are the sole administrator.");
      expect(mockTx.user.update).not.toHaveBeenCalled();
    });

    test("Admin can demote self when other administrators exist", async () => {
      mockState.currentUser = ADMIN_USER;

      // Mock 2 ADMINs in the database
      mockPrisma.user.count.mockResolvedValue(2);

      mockTx.$queryRaw.mockResolvedValue([
        { id: ADMIN_USER.id, role: "ADMIN" },
      ]);
      mockTx.user.update.mockResolvedValue({ id: ADMIN_USER.id, role: "MANAGER" });
      mockTx.session.deleteMany.mockResolvedValue({ count: 1 });
      mockTx.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });

      const result = await updateAdminUserRoleAction({
        userId: ADMIN_USER.id,
        newRole: "MANAGER",
      });

      expect(result.success).toBe(true);
      expect(mockTx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ADMIN_USER.id },
          data: { role: "MANAGER" },
        })
      );
      // Ensures sessions are terminated on role change
      expect(mockTx.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: ADMIN_USER.id },
      });
    });
  });

  // =========================================================================
  // 8. User Registration Role Hardening
  // =========================================================================
  describe("8. User Registration Role Hardening", () => {
    test("registerAction strictly forces role CUSTOMER, ignoring any supplied role", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockImplementation(async (args: any) => ({
        id: "new-user-1",
        email: args.data.email,
        role: args.data.role,
      }));
      mockPrisma.emailVerificationToken.create.mockResolvedValue({ id: "tok-1" } as any);

      // Attempting to register with role ADMIN injected into payload
      const maliciousPayload: any = {
        name: "Attacker",
        email: "attacker@example.com",
        password: "Password123!",
        confirmPassword: "Password123!",
        role: "ADMIN",
      };

      const result = await registerAction(maliciousPayload);

      expect(result).toHaveProperty("success", true);
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: "attacker@example.com",
            role: "CUSTOMER", // Authoritative: forced CUSTOMER
          }),
        })
      );
    });
  });
});
