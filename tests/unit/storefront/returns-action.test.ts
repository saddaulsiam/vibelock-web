import { describe, expect, it, vi, beforeEach } from "vitest";
import { createReturnRequestAction } from "@/lib/returns/actions";
import prisma from "@/lib/prisma/client";

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "user-123", email: "user@example.com" },
  }),
}));

vi.mock("@/lib/prisma/client", () => ({
  default: {
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/returns/service", () => ({
  ReturnService: class {
    async getReturnableQuantities() {
      return new Proxy({}, { get: () => 10 });
    }
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Customer Returns Action Validation", () => {
  const mockTx = {
    $queryRaw: vi.fn().mockResolvedValue([{ id: "order-123" }]),
    order: {
      findUnique: vi.fn().mockResolvedValue({
        id: "order-123",
        orderNumber: "ORD-12345",
        userId: "user-123",
        status: "DELIVERED",
        updatedAt: new Date(),
      }),
    },
    orderHistory: {
      findFirst: vi.fn().mockResolvedValue({
        createdAt: new Date(),
      }),
    },
    shipment: {
      findUnique: vi.fn().mockResolvedValue({
        deliveredAt: new Date(),
      }),
    },
    returnRequest: {
      create: vi.fn().mockResolvedValue({ id: "return-req-1" }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) => {
      return callback(mockTx);
    });
  });

  it("rejects empty items array", async () => {
    const res = await createReturnRequestAction({
      orderNumber: "ORD-12345",
      items: [],
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toMatch(/must select at least one item/i);
    }
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("accepts 1 item within bounds", async () => {
    const res = await createReturnRequestAction({
      orderNumber: "ORD-12345",
      items: [{ orderItemId: "item-1", quantity: 1 }],
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.returnRequestId).toBe("return-req-1");
    }
  });

  it("accepts 20 items (maximum bound)", async () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      orderItemId: `item-${i + 1}`,
      quantity: 1,
    }));

    const res = await createReturnRequestAction({
      orderNumber: "ORD-12345",
      items,
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.returnRequestId).toBe("return-req-1");
    }
  });

  it("rejects 21 items (exceeding maximum bound)", async () => {
    const items = Array.from({ length: 21 }, (_, i) => ({
      orderItemId: `item-${i + 1}`,
      quantity: 1,
    }));

    const res = await createReturnRequestAction({
      orderNumber: "ORD-12345",
      items,
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toMatch(/cannot return more than 20 items/i);
    }
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
