import { deleteAccountAction } from "@/app/actions/account-deletion";
import { lockCustomerUser } from "@/lib/checkout/actions";
import { RefundService } from "@/lib/refunds/service";
import { createReturnRequestAction } from "@/lib/returns/actions";
import { Prisma, PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

let mockSessionUser: { id: string; email: string; name?: string; role: Role } | null = null;

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => {
    if (!mockSessionUser) return null;
    return { user: mockSessionUser };
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}));

// Resolve and validate dedicated isolated test database URL
let testDbUrl = process.env.DATABASE_URL || "";

if (!testDbUrl) {
  const envPath = path.join(process.cwd(), ".env.test");
  if (!fs.existsSync(envPath)) {
    throw new Error("SAFETY HALT: .env.test not found and DATABASE_URL not set");
  }
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("DATABASE_URL=")) {
      testDbUrl = trimmed
        .slice("DATABASE_URL=".length)
        .trim()
        .replace(/^['"]|['"]$/g, "");
      break;
    }
  }
}

if (!testDbUrl) {
  throw new Error("SAFETY HALT: Missing DATABASE_URL in environment and .env.test");
}

let parsedUrl: URL;
try {
  parsedUrl = new URL(testDbUrl);
} catch {
  throw new Error("SAFETY HALT: Failed to parse test database URL. Invalid format.");
}

const rawHost = parsedUrl.hostname.toLowerCase().replace(/^\[|\]$/g, "");
const isLocalHost =
  rawHost === "localhost" ||
  rawHost === "127.0.0.1" ||
  rawHost === "::1" ||
  rawHost === "0:0:0:0:0:0:0:1";
if (!isLocalHost) {
  throw new Error(`SAFETY HALT: Non-local database host '${parsedUrl.hostname}' rejected.`);
}

if (parsedUrl.pathname === "/vibelock_test") {
  parsedUrl.pathname = "/vibelock_concurrency_test";
}
if (parsedUrl.pathname !== "/vibelock_concurrency_test") {
  throw new Error(
    `SAFETY HALT: Dedicated concurrency test database must be 'vibelock_concurrency_test'. Received '${parsedUrl.pathname}'.`
  );
}

const concurrencyDbUrl = parsedUrl.toString();
process.env.DATABASE_URL = concurrencyDbUrl;
process.env.DIRECT_URL = concurrencyDbUrl;

// Independent PrismaClient instances with separate connection pools to PostgreSQL
const prismaConn1 = new PrismaClient({ datasources: { db: { url: concurrencyDbUrl } } });
const prismaConn2 = new PrismaClient({ datasources: { db: { url: concurrencyDbUrl } } });
const isolatedPrisma = new PrismaClient({ datasources: { db: { url: concurrencyDbUrl } } });

describe("Phase 9 Real PostgreSQL Concurrency Verification", () => {
  let pid1: number;
  let pid2: number;
  const createdUserIds: string[] = [];
  const createdOrderIds: string[] = [];

  beforeAll(async () => {
    // 1. Strict Runtime Database-Name & Local Server Address Guard
    const dbInfo = await isolatedPrisma.$queryRaw<
      Array<{ current_database: string; inet_server_addr: string; version: string }>
    >`SELECT current_database(), inet_server_addr()::text, version()`;

    const currentDb = dbInfo[0].current_database;
    if (currentDb !== "vibelock_concurrency_test") {
      throw new Error(
        `SAFETY HALT: Attempted to run concurrency test against non-test database: '${currentDb}'. Aborting immediately.`
      );
    }

    const rawServerAddr = dbInfo[0].inet_server_addr;
    const cleanAddr = rawServerAddr ? rawServerAddr.split("/")[0] : "";
    const isLocalServer = !cleanAddr || cleanAddr === "127.0.0.1" || cleanAddr === "::1";
    if (!isLocalServer) {
      throw new Error(
        `SAFETY HALT: Attempted to run concurrency test against non-local PostgreSQL server: '${rawServerAddr}'.`
      );
    }

    // 2. Verify independent PostgreSQL connection backend PIDs
    const q1 = await prismaConn1.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() as pid`;
    const q2 = await prismaConn2.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() as pid`;
    pid1 = q1[0].pid;
    pid2 = q2[0].pid;

    console.log(`[Phase 9 Concurrency Suite] Isolated DB: ${dbInfo[0].current_database}`);
    console.log(
      `[Phase 9 Concurrency Suite] PostgreSQL Version: ${dbInfo[0].version.split(",")[0]}`
    );
    console.log(
      `[Phase 9 Concurrency Suite] Independent Backend PIDs: Conn1=${pid1}, Conn2=${pid2}`
    );

    expect(pid1).toBeGreaterThan(0);
    expect(pid2).toBeGreaterThan(0);
    expect(pid1).not.toBe(pid2);
  });

  afterAll(async () => {
    try {
      if (createdOrderIds.length > 0) {
        await isolatedPrisma.orderItem
          .deleteMany({ where: { orderId: { in: createdOrderIds } } })
          .catch(() => {});
        await isolatedPrisma.order
          .deleteMany({ where: { id: { in: createdOrderIds } } })
          .catch(() => {});
      }
      if (createdUserIds.length > 0) {
        await isolatedPrisma.user
          .deleteMany({ where: { id: { in: createdUserIds } } })
          .catch(() => {});
      }
    } finally {
      await prismaConn1.$disconnect();
      await prismaConn2.$disconnect();
      await isolatedPrisma.$disconnect();
    }
  });

  test("1. Online checkout locks User row with FOR UPDATE, blocking concurrent account deletion in PostgreSQL until commit", async () => {
    const ts = Date.now();
    const testUser = await isolatedPrisma.user.create({
      data: {
        email: `p9-checkout-lock-${ts}@example.com`,
        name: "Phase 9 Online Checkout User",
        role: "CUSTOMER",
      },
    });
    createdUserIds.push(testUser.id);

    let conn1LockAcquired = false;
    let conn2LockAcquired = false;
    let conn1Committed = false;
    let conn2BlockedDurationMs = 0;

    // Transaction 1: Online checkout transaction locking customer User row
    const checkoutTxPromise = prismaConn1.$transaction(async (tx1) => {
      // Execute lockCustomerUser (used by ALL checkout methods: ONLINE, COD, BKASH, NAGAD)
      const locked = await lockCustomerUser(testUser.id, tx1);
      expect(locked.id).toBe(testUser.id);
      conn1LockAcquired = true;

      // Hold User row lock for 150ms to force Conn2 to wait in PostgreSQL
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Create new order while holding the User lock
      const newOrder = await tx1.order.create({
        data: {
          checkoutIdempotencyKey: `p9-idem-${ts}`,
          orderNumber: `VL-P9-${ts}`,
          userId: testUser.id,
          status: "PENDING",
          paymentStatus: "PENDING",
          paymentMethod: "ONLINE",
          customerName: "P9 Customer",
          customerEmail: testUser.email,
          shippingStreet: "123 Test St",
          shippingCity: "Dhaka",
          shippingCountry: "BD",
          shippingMethodName: "Standard",
          shippingCost: 60,
          subtotal: 1000,
          discount: 0,
          taxAmount: 0,
          taxRate: 0,
          total: 1060,
        },
      });
      createdOrderIds.push(newOrder.id);
      conn1Committed = true;
    });

    // Wait until Conn1 has definitely acquired the User row lock
    while (!conn1LockAcquired) {
      await new Promise((r) => setTimeout(r, 10));
    }

    // Transaction 2: Account deletion transaction attempting to acquire User row lock
    const deleteTxPromise = prismaConn2.$transaction(async (tx2) => {
      const startTime = Date.now();
      // Conn2 reaches SELECT ... FOR UPDATE on User and must block in PostgreSQL
      const lockedRows = await tx2.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "User" WHERE "id" = ${testUser.id} FOR UPDATE
      `;
      conn2BlockedDurationMs = Date.now() - startTime;
      conn2LockAcquired = true;

      // Conn2 must NOT acquire lock while Conn1 was holding it
      expect(conn1Committed).toBe(true);

      // Conn2 evaluates active orders guard
      const activeOrders = await tx2.order.count({
        where: {
          userId: testUser.id,
          status: { in: ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED"] },
        },
      });

      // Crucial verification: The order created by checkout is detected, blocking account deletion!
      expect(activeOrders).toBe(1);

      return { activeOrders, lockedRows };
    });

    await Promise.all([checkoutTxPromise, deleteTxPromise]);

    expect(conn1LockAcquired).toBe(true);
    expect(conn2LockAcquired).toBe(true);
    // Real PostgreSQL mutual exclusion verification: Conn2 was blocked until Conn1 committed
    expect(conn2BlockedDurationMs).toBeGreaterThanOrEqual(100);
  });

  test("2. Account deletion locks User row, blocking concurrent online checkout; once deleted, checkout throws CUSTOMER_NOT_FOUND", async () => {
    const ts = Date.now() + 1;
    const testUser = await isolatedPrisma.user.create({
      data: {
        email: `p9-deletion-first-${ts}@example.com`,
        name: "Phase 9 Deletion First User",
        role: "CUSTOMER",
      },
    });
    createdUserIds.push(testUser.id);

    let conn1DeletionLockAcquired = false;
    let conn1DeletionCommitted = false;
    let conn2CheckoutBlockedDurationMs = 0;

    // Transaction 1: Account deletion acquires User lock first
    const deleteTxPromise = prismaConn1.$transaction(async (tx1) => {
      await tx1.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${testUser.id} FOR UPDATE`;
      conn1DeletionLockAcquired = true;

      // Hold lock for 150ms while Conn2 attempts online checkout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Delete user
      await tx1.user.delete({ where: { id: testUser.id } });
      conn1DeletionCommitted = true;
    });

    while (!conn1DeletionLockAcquired) {
      await new Promise((r) => setTimeout(r, 10));
    }

    // Transaction 2: Online checkout attempts to lock customer User row
    let checkoutError: Error | null = null;
    const checkoutTxPromise = prismaConn2
      .$transaction(async (tx2) => {
        const startTime = Date.now();
        try {
          await lockCustomerUser(testUser.id, tx2);
        } catch (err) {
          checkoutError = err as Error;
          conn2CheckoutBlockedDurationMs = Date.now() - startTime;
          throw err;
        }
      })
      .catch(() => {});

    await Promise.all([deleteTxPromise, checkoutTxPromise]);

    expect(conn1DeletionCommitted).toBe(true);
    expect(conn2CheckoutBlockedDurationMs).toBeGreaterThanOrEqual(100);
    expect(checkoutError).not.toBeNull();
    expect(checkoutError!.message).toBe("CUSTOMER_NOT_FOUND");
  });

  // =========================================================================
  // SEC-9 Return/Refund Concurrency Tests (Phase 9 fix)
  // =========================================================================

  test("3. Account deletion starts first; return creation is blocked on User lock and sees user gone after deletion commits", async () => {
    const ts = Date.now() + 2;
    const testUser = await isolatedPrisma.user.create({
      data: {
        email: `p9-del-return-${ts}@example.com`,
        name: "Phase 9 Deletion vs Return",
        role: "CUSTOMER",
      },
    });
    createdUserIds.push(testUser.id);

    // Create a DELIVERED order for this user so a return could theoretically be attempted
    const deliveredOrder = await isolatedPrisma.order.create({
      data: {
        orderNumber: `VL-P9-DR-${ts}`,
        userId: testUser.id,
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
        paymentMethod: "COD",
        customerName: "P9 Return Customer",
        customerEmail: testUser.email,
        shippingStreet: "1 Test St",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
        shippingCost: 60,
        subtotal: 1000,
        discount: 0,
        taxAmount: 0,
        taxRate: 0,
        total: 1060,
      },
    });
    createdOrderIds.push(deliveredOrder.id);

    let deletionLockAcquired = false;
    let deletionCommitted = false;
    let returnBlockedDurationMs = 0;

    // Transaction 1: Account deletion acquires User lock first (mirrors account-deletion.ts)
    const deleteTxPromise = prismaConn1.$transaction(async (tx1) => {
      await tx1.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${testUser.id} FOR UPDATE`;
      deletionLockAcquired = true;
      // Check active returns guard (finds none — none were created yet)
      const activeReturns = await tx1.returnRequest.count({
        where: {
          order: { userId: testUser.id },
          status: { in: ["PENDING", "APPROVED", "RECEIVED"] },
        },
      });
      expect(activeReturns).toBe(0); // Guard passes correctly
      // Hold lock 150ms to let return creation attempt to run concurrently
      await new Promise((r) => setTimeout(r, 150));
      await tx1.user.delete({ where: { id: testUser.id } });
      deletionCommitted = true;
    });

    while (!deletionLockAcquired) {
      await new Promise((r) => setTimeout(r, 10));
    }

    // Transaction 2: Return creation now also acquires User lock FIRST (the fix).
    // It must block in PostgreSQL until deletion commits, then find the user is gone.
    let returnError: Error | null = null;
    const returnTxPromise = prismaConn2
      .$transaction(async (tx2) => {
        const startTime = Date.now();
        // This SELECT FOR UPDATE on User must block until Conn1 releases the lock
        await tx2.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${testUser.id} FOR UPDATE`;
        returnBlockedDurationMs = Date.now() - startTime;

        // After deletion commits, User row is gone — return creation must abort
        const userStillExists = await tx2.user.findUnique({
          where: { id: testUser.id },
          select: { id: true },
        });
        if (!userStillExists) throw new Error("Order not found or access denied.");
      })
      .catch((err: Error) => {
        returnError = err;
      });

    await Promise.all([deleteTxPromise, returnTxPromise]);

    expect(deletionCommitted).toBe(true);
    // Conn2 was blocked in PostgreSQL by Conn1's User lock (real mutual exclusion)
    expect(returnBlockedDurationMs).toBeGreaterThanOrEqual(100);
    // Return creation correctly aborted because the user was deleted
    expect(returnError).not.toBeNull();
    expect(returnError!.message).toBe("Order not found or access denied.");
  });

  test("4. Return creation starts first; account deletion blocks on User lock and correctly sees the new return after return commits", async () => {
    const ts = Date.now() + 3;
    const testUser = await isolatedPrisma.user.create({
      data: {
        email: `p9-return-del-${ts}@example.com`,
        name: "Phase 9 Return First Then Delete",
        role: "CUSTOMER",
      },
    });
    createdUserIds.push(testUser.id);

    const deliveredOrder = await isolatedPrisma.order.create({
      data: {
        orderNumber: `VL-P9-RD-${ts}`,
        userId: testUser.id,
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
        paymentMethod: "COD",
        customerName: "P9 Return First Customer",
        customerEmail: testUser.email,
        shippingStreet: "2 Test St",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
        shippingCost: 60,
        subtotal: 1000,
        discount: 0,
        taxAmount: 0,
        taxRate: 0,
        total: 1060,
      },
    });
    createdOrderIds.push(deliveredOrder.id);

    let returnLockAcquired = false;
    let returnCommitted = false;
    let deletionBlockedDurationMs = 0;
    let createdReturnId: string | null = null;

    // Transaction 1: Return creation acquires User lock first (the fix)
    const returnTxPromise = prismaConn1.$transaction(async (tx1) => {
      await tx1.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${testUser.id} FOR UPDATE`;
      returnLockAcquired = true;
      // Hold for 150ms while deletion tries concurrently
      await new Promise((r) => setTimeout(r, 150));
      // Lock Order, then create return (mirrors the fixed createReturnRequestAction)
      await tx1.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${deliveredOrder.id} FOR UPDATE`;
      const returnReq = await tx1.returnRequest.create({
        data: { orderId: deliveredOrder.id, status: "PENDING" },
      });
      createdReturnId = returnReq.id;
      returnCommitted = true;
    });

    while (!returnLockAcquired) {
      await new Promise((r) => setTimeout(r, 10));
    }

    // Transaction 2: Account deletion also acquires User lock first — must block
    let deleteSeenActiveReturns = 0;
    const deleteTxPromise = prismaConn2
      .$transaction(async (tx2) => {
        const startTime = Date.now();
        // Blocks here until Conn1 commits
        await tx2.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${testUser.id} FOR UPDATE`;
        deletionBlockedDurationMs = Date.now() - startTime;

        // After return commits, the guard must see the new PENDING return
        deleteSeenActiveReturns = await tx2.returnRequest.count({
          where: {
            order: { userId: testUser.id },
            status: { in: ["PENDING", "APPROVED", "RECEIVED"] },
          },
        });
        // Deletion must NOT proceed — rollback by throwing
        throw new Error("DELETION_BLOCKED_BY_ACTIVE_RETURN");
      })
      .catch(() => {});

    await Promise.all([returnTxPromise, deleteTxPromise]);

    expect(returnCommitted).toBe(true);
    expect(createdReturnId).not.toBeNull();
    // Deletion was genuinely blocked in PostgreSQL
    expect(deletionBlockedDurationMs).toBeGreaterThanOrEqual(100);
    // Guard correctly detected the return created by the concurrent transaction
    expect(deleteSeenActiveReturns).toBe(1);

    // Cleanup created return
    await isolatedPrisma.returnRequest.delete({ where: { id: createdReturnId! } }).catch(() => {});
  });

  test("5. Account deletion starts first; refund initiation blocks on User lock and aborts when user is gone", async () => {
    const ts = Date.now() + 4;
    const testUser = await isolatedPrisma.user.create({
      data: {
        email: `p9-del-refund-${ts}@example.com`,
        name: "Phase 9 Deletion vs Refund",
        role: "CUSTOMER",
      },
    });
    createdUserIds.push(testUser.id);

    const deliveredOrder = await isolatedPrisma.order.create({
      data: {
        orderNumber: `VL-P9-DRF-${ts}`,
        userId: testUser.id,
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
        paymentMethod: "ONLINE",
        customerName: "P9 Refund Customer",
        customerEmail: testUser.email,
        shippingStreet: "3 Test St",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
        shippingCost: 60,
        subtotal: 1000,
        discount: 0,
        taxAmount: 0,
        taxRate: 0,
        total: 1060,
      },
    });
    createdOrderIds.push(deliveredOrder.id);

    const payment = await isolatedPrisma.payment.create({
      data: {
        orderId: deliveredOrder.id,
        amount: new (await import("@prisma/client")).Prisma.Decimal("1060"),
        status: "SUCCESS",
        gateway: "sslcommerz",
      },
    });

    let deletionLockAcquired = false;
    let deletionCommitted = false;
    let refundBlockedDurationMs = 0;

    // Transaction 1: Account deletion acquires User → Order → Payment locks
    const deleteTxPromise = prismaConn1.$transaction(async (tx1) => {
      await tx1.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${testUser.id} FOR UPDATE`;
      deletionLockAcquired = true;
      await tx1.$queryRaw`SELECT "id" FROM "Order" WHERE "userId" = ${testUser.id} FOR UPDATE`;
      await tx1.$queryRaw`
        SELECT p."id" FROM "Payment" p
        JOIN "Order" o ON p."orderId" = o."id"
        WHERE o."userId" = ${testUser.id}
        FOR UPDATE
      `;
      // Guard: 0 active refunds — passes
      await new Promise((r) => setTimeout(r, 150));
      await tx1.user.delete({ where: { id: testUser.id } });
      deletionCommitted = true;
    });

    while (!deletionLockAcquired) {
      await new Promise((r) => setTimeout(r, 10));
    }

    // Transaction 2: Refund initiation now acquires User lock first (the fix),
    // then Order, then Payment — must block until deletion commits.
    let refundError: Error | null = null;
    const refundTxPromise = prismaConn2
      .$transaction(async (tx2) => {
        const startTime = Date.now();
        // The fix: resolve userId from Payment → Order, then lock User first
        const p = await tx2.payment.findUnique({
          where: { id: payment.id },
          select: { orderId: true, order: { select: { userId: true } } },
        });
        if (!p) throw new Error("Payment not found");
        const uid = p.order.userId;
        if (uid) {
          // Blocks here until Conn1 releases the User lock
          await tx2.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${uid} FOR UPDATE`;
          refundBlockedDurationMs = Date.now() - startTime;
          // After deletion commits, User no longer exists — guard against ghost refund
          const userStillExists = await tx2.user.findUnique({
            where: { id: uid },
            select: { id: true },
          });
          if (!userStillExists) throw new Error("Payment not found");
        }
        await tx2.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${p.orderId} FOR UPDATE`;
        await tx2.$queryRaw`SELECT id FROM "Payment" WHERE id = ${payment.id} FOR UPDATE`;
        // If we reached here (no exception), the refund creation would proceed — which should NOT happen
        throw new Error("UNEXPECTED_REFUND_ALLOWED");
      })
      .catch((err: Error) => {
        refundError = err;
      });

    await Promise.all([deleteTxPromise, refundTxPromise]);

    expect(deletionCommitted).toBe(true);
    expect(refundBlockedDurationMs).toBeGreaterThanOrEqual(100);
    expect(refundError).not.toBeNull();
    // The refund was aborted because the user was deleted, not because it slipped through
    expect(refundError!.message).not.toBe("UNEXPECTED_REFUND_ALLOWED");

    // Cleanup payment (order/user were deleted by the deletion tx)
    await isolatedPrisma.payment.delete({ where: { id: payment.id } }).catch(() => {});
  });

  test("6. Refund initiation starts first; account deletion blocks on User lock and correctly sees pending refund after refund commits", async () => {
    const ts = Date.now() + 5;
    const testUser = await isolatedPrisma.user.create({
      data: {
        email: `p9-refund-del-${ts}@example.com`,
        name: "Phase 9 Refund First Then Delete",
        role: "CUSTOMER",
      },
    });
    createdUserIds.push(testUser.id);

    const deliveredOrder = await isolatedPrisma.order.create({
      data: {
        orderNumber: `VL-P9-RFD-${ts}`,
        userId: testUser.id,
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
        paymentMethod: "ONLINE",
        customerName: "P9 Refund First Customer",
        customerEmail: testUser.email,
        shippingStreet: "4 Test St",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingMethodName: "Standard",
        shippingCost: 60,
        subtotal: 1000,
        discount: 0,
        taxAmount: 0,
        taxRate: 0,
        total: 1060,
      },
    });
    createdOrderIds.push(deliveredOrder.id);

    const payment = await isolatedPrisma.payment.create({
      data: {
        orderId: deliveredOrder.id,
        amount: new (await import("@prisma/client")).Prisma.Decimal("1060"),
        status: "SUCCESS",
        gateway: "sslcommerz",
      },
    });

    let refundLockAcquired = false;
    let refundCommitted = false;
    let deletionBlockedDurationMs = 0;
    let createdRefundId: string | null = null;
    let deletionSeenActiveRefunds = 0;

    // Transaction 1: Refund acquires User → Order → Payment locks (the fix)
    const refundTxPromise = prismaConn1.$transaction(async (tx1) => {
      await tx1.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${testUser.id} FOR UPDATE`;
      refundLockAcquired = true;
      await new Promise((r) => setTimeout(r, 150));
      await tx1.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${deliveredOrder.id} FOR UPDATE`;
      await tx1.$queryRaw`SELECT id FROM "Payment" WHERE id = ${payment.id} FOR UPDATE`;
      const { Prisma: P } = await import("@prisma/client");
      const refund = await tx1.refund.create({
        data: { paymentId: payment.id, amount: new P.Decimal("100"), status: "PENDING" },
      });
      createdRefundId = refund.id;
      refundCommitted = true;
    });

    while (!refundLockAcquired) {
      await new Promise((r) => setTimeout(r, 10));
    }

    // Transaction 2: Account deletion blocks on User lock, then sees the committed refund
    const deleteTxPromise = prismaConn2
      .$transaction(async (tx2) => {
        const startTime = Date.now();
        // Blocks until Conn1 (refund tx) releases User lock
        await tx2.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${testUser.id} FOR UPDATE`;
        deletionBlockedDurationMs = Date.now() - startTime;

        await tx2.$queryRaw`SELECT "id" FROM "Order" WHERE "userId" = ${testUser.id} FOR UPDATE`;
        await tx2.$queryRaw`
          SELECT p."id" FROM "Payment" p
          JOIN "Order" o ON p."orderId" = o."id"
          WHERE o."userId" = ${testUser.id}
          FOR UPDATE
        `;

        // Guard: must detect the PENDING refund created by the concurrent refund tx
        deletionSeenActiveRefunds = await tx2.refund.count({
          where: {
            payment: { order: { userId: testUser.id } },
            status: { in: ["PENDING", "PROCESSING"] },
          },
        });
        // Deletion must NOT proceed
        throw new Error("DELETION_BLOCKED_BY_ACTIVE_REFUND");
      })
      .catch(() => {});

    await Promise.all([refundTxPromise, deleteTxPromise]);

    expect(refundCommitted).toBe(true);
    expect(createdRefundId).not.toBeNull();
    expect(deletionBlockedDurationMs).toBeGreaterThanOrEqual(100);
    // Critical: deletion saw 1 active refund (created by the concurrent tx) — guard fires
    expect(deletionSeenActiveRefunds).toBe(1);

    // Cleanup
    await isolatedPrisma.refund.delete({ where: { id: createdRefundId! } }).catch(() => {});
    await isolatedPrisma.payment.delete({ where: { id: payment.id } }).catch(() => {});
  });

  test("7. Two concurrent deletion requests: second is blocked by first and sees consistent state after first commits", async () => {
    const ts = Date.now() + 6;
    const testUser = await isolatedPrisma.user.create({
      data: {
        email: `p9-double-del-${ts}@example.com`,
        name: "Phase 9 Double Deletion",
        role: "CUSTOMER",
      },
    });
    createdUserIds.push(testUser.id);

    let conn1LockAcquired = false;
    let conn1Committed = false;
    let conn2BlockedDurationMs = 0;
    let conn2Error: Error | null = null;

    // Transaction 1: First deletion acquires User lock and deletes
    const deleteTx1 = prismaConn1.$transaction(async (tx1) => {
      await tx1.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${testUser.id} FOR UPDATE`;
      conn1LockAcquired = true;
      await new Promise((r) => setTimeout(r, 150));
      await tx1.user.delete({ where: { id: testUser.id } });
      conn1Committed = true;
    });

    while (!conn1LockAcquired) {
      await new Promise((r) => setTimeout(r, 10));
    }

    // Transaction 2: Second deletion attempt blocks on User lock, finds no user after Conn1 commits
    const deleteTx2 = prismaConn2
      .$transaction(async (tx2) => {
        const startTime = Date.now();
        // Blocks until Conn1 releases
        const rows = await tx2.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "User" WHERE "id" = ${testUser.id} FOR UPDATE
        `;
        conn2BlockedDurationMs = Date.now() - startTime;
        // After Conn1 deleted the user, this returns empty — no user found
        if (rows.length === 0) {
          throw new Error("Account not found.");
        }
      })
      .catch((err: Error) => {
        conn2Error = err;
      });

    await Promise.all([deleteTx1, deleteTx2]);

    expect(conn1Committed).toBe(true);
    expect(conn2BlockedDurationMs).toBeGreaterThanOrEqual(100);
    expect(conn2Error).not.toBeNull();
    expect(conn2Error!.message).toBe("Account not found.");
  });

  // =========================================================================
  // Real Application-Level Concurrency & Lifecycle Verification
  // Invokes actual server actions / services:
  // - deleteAccountAction
  // - createReturnRequestAction
  // - RefundService.initiateRefund
  // =========================================================================
  describe("Real Application-Level Concurrency & Lifecycle Verification", () => {
    test("App-1: Account deletion wins; concurrent refund must not create a refund", async () => {
      const ts = Date.now() + 10;
      const testPassword = "ValidPassword123!";
      const passwordHash = bcrypt.hashSync(testPassword, 10);
      const testUser = await isolatedPrisma.user.create({
        data: {
          email: `app-del-refund-${ts}@example.com`,
          name: "App Deletion vs Refund User",
          role: "CUSTOMER",
          passwordHash,
        },
      });
      createdUserIds.push(testUser.id);

      const deliveredOrder = await isolatedPrisma.order.create({
        data: {
          orderNumber: `VL-APP-DRF-${ts}`,
          userId: testUser.id,
          status: "DELIVERED",
          paymentStatus: "SUCCESS",
          paymentMethod: "ONLINE",
          customerName: "App Refund Customer",
          customerEmail: testUser.email,
          shippingStreet: "10 App St",
          shippingCity: "Dhaka",
          shippingCountry: "BD",
          shippingMethodName: "Standard",
          shippingCost: 60,
          subtotal: 1000,
          discount: 0,
          taxAmount: 0,
          taxRate: 0,
          total: 1060,
        },
      });
      createdOrderIds.push(deliveredOrder.id);

      const payment = await isolatedPrisma.payment.create({
        data: {
          orderId: deliveredOrder.id,
          amount: new Prisma.Decimal("1060"),
          status: "SUCCESS",
          gateway: "sslcommerz",
        },
      });

      mockSessionUser = { id: testUser.id, email: testUser.email, role: "CUSTOMER" };

      let deletionLockAcquired = false;
      let refundBlockedDurationMs = 0;
      let refundError: Error | null = null;

      // Transaction 1: Connection 1 simulates deletion winning by holding User lock
      // while calling the REAL RefundService.initiateRefund method concurrently on Conn2
      const deleteTxPromise = prismaConn1.$transaction(async (tx1) => {
        await tx1.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${testUser.id} FOR UPDATE`;
        deletionLockAcquired = true;
        // Hold lock for 150ms to force initiateRefund to block in PostgreSQL
        await new Promise((r) => setTimeout(r, 150));
        // Delete user
        await tx1.user.delete({ where: { id: testUser.id } });
      });

      while (!deletionLockAcquired) {
        await new Promise((r) => setTimeout(r, 10));
      }

      // Call actual RefundService.initiateRefund method
      const refundService = new RefundService();
      const refundPromise = (async () => {
        const startTime = Date.now();
        try {
          await refundService.initiateRefund(
            payment.id,
            new Prisma.Decimal("500"),
            "App Concurrency Refund"
          );
        } catch (err) {
          refundBlockedDurationMs = Date.now() - startTime;
          refundError = err as Error;
        }
      })();

      await Promise.all([deleteTxPromise, refundPromise]);

      // Verify initiateRefund blocked in PostgreSQL on User lock
      expect(refundBlockedDurationMs).toBeGreaterThanOrEqual(100);
      // Verify initiateRefund threw because user was deleted while blocked
      expect(refundError).not.toBeNull();
      expect(refundError!.message).toContain("customer account deleted");

      // Verify NO refund record was created in PostgreSQL
      const refunds = await isolatedPrisma.refund.findMany({ where: { paymentId: payment.id } });
      expect(refunds).toHaveLength(0);

      // Clean up payment
      await isolatedPrisma.payment.delete({ where: { id: payment.id } }).catch(() => {});
    });

    test("App-2: Refund wins; deletion must correctly observe the pending refund", async () => {
      const ts = Date.now() + 20;
      const testPassword = "ValidPassword123!";
      const passwordHash = bcrypt.hashSync(testPassword, 10);
      const testUser = await isolatedPrisma.user.create({
        data: {
          email: `app-refund-first-${ts}@example.com`,
          name: "App Refund Wins User",
          role: "CUSTOMER",
          passwordHash,
        },
      });
      createdUserIds.push(testUser.id);

      const deliveredOrder = await isolatedPrisma.order.create({
        data: {
          orderNumber: `VL-APP-RFD-${ts}`,
          userId: testUser.id,
          status: "DELIVERED",
          paymentStatus: "SUCCESS",
          paymentMethod: "ONLINE",
          customerName: "App Refund Wins Customer",
          customerEmail: testUser.email,
          shippingStreet: "20 App St",
          shippingCity: "Dhaka",
          shippingCountry: "BD",
          shippingMethodName: "Standard",
          shippingCost: 60,
          subtotal: 1000,
          discount: 0,
          taxAmount: 0,
          taxRate: 0,
          total: 1060,
        },
      });
      createdOrderIds.push(deliveredOrder.id);

      const payment = await isolatedPrisma.payment.create({
        data: {
          orderId: deliveredOrder.id,
          amount: new Prisma.Decimal("1060"),
          status: "SUCCESS",
          gateway: "sslcommerz",
        },
      });

      mockSessionUser = { id: testUser.id, email: testUser.email, role: "CUSTOMER" };

      // 1. Invoke actual RefundService.initiateRefund method
      const refundService = new RefundService();
      const refund = await refundService.initiateRefund(
        payment.id,
        new Prisma.Decimal("200"),
        "Customer Return Refund"
      );
      expect(refund.id).toBeDefined();
      expect(refund.status).toBe("PENDING");

      // 2. Invoke actual deleteAccountAction server action
      const deleteResult = await deleteAccountAction({ password: testPassword });

      // 3. Verify deleteAccountAction observed the pending refund and rejected
      expect(deleteResult).toEqual({
        error: "Cannot delete account while you have pending or processing refunds.",
      });

      // 4. Verify user was NOT deleted and still exists in PostgreSQL
      const userStillExists = await isolatedPrisma.user.findUnique({ where: { id: testUser.id } });
      expect(userStillExists).not.toBeNull();

      // Clean up
      await isolatedPrisma.refund.delete({ where: { id: refund.id } }).catch(() => {});
      await isolatedPrisma.payment.delete({ where: { id: payment.id } }).catch(() => {});
    });

    test("App-3: Account deletion wins; concurrent return creation must abort", async () => {
      const ts = Date.now() + 30;
      const testPassword = "ValidPassword123!";
      const passwordHash = bcrypt.hashSync(testPassword, 10);
      const testUser = await isolatedPrisma.user.create({
        data: {
          email: `app-del-return-${ts}@example.com`,
          name: "App Deletion vs Return User",
          role: "CUSTOMER",
          passwordHash,
        },
      });
      createdUserIds.push(testUser.id);

      const product = await isolatedPrisma.product.create({
        data: { name: `App Return Product ${ts}`, slug: `app-ret-${ts}`, status: "PUBLISHED" },
      });
      const variant = await isolatedPrisma.productVariant.create({
        data: { productId: product.id, sku: `SKU-RET-${ts}`, costPrice: 100, sellingPrice: 300 },
      });

      const deliveredOrder = await isolatedPrisma.order.create({
        data: {
          orderNumber: `VL-APP-RET-${ts}`,
          userId: testUser.id,
          status: "DELIVERED",
          paymentStatus: "SUCCESS",
          paymentMethod: "COD",
          customerName: "App Return Customer",
          customerEmail: testUser.email,
          shippingStreet: "30 App St",
          shippingCity: "Dhaka",
          shippingCountry: "BD",
          shippingMethodName: "Standard",
          shippingCost: 60,
          subtotal: 600,
          discount: 0,
          taxAmount: 0,
          taxRate: 0,
          total: 660,
          items: {
            create: [
              {
                productName: "Returnable Item",
                sku: variant.sku,
                unitPrice: 300,
                costPrice: 100,
                lineSubtotal: 600,
                lineTotal: 600,
                quantity: 2,
                taxRate: 0,
                taxIncluded: false,
              },
            ],
          },
          shipment: {
            create: {
              trackingNumber: `TRK-RET-${ts}`,
              provider: "STEADFAST",
              status: "DELIVERED",
              shippingAmount: 60,
              deliveredAt: new Date(),
            },
          },
        },
        include: { items: true },
      });
      createdOrderIds.push(deliveredOrder.id);

      mockSessionUser = { id: testUser.id, email: testUser.email, role: "CUSTOMER" };

      let deletionLockAcquired = false;
      let returnBlockedDurationMs = 0;

      // Transaction 1: Connection 1 simulates deletion winning by holding User lock
      const deleteTxPromise = prismaConn1.$transaction(async (tx1) => {
        await tx1.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${testUser.id} FOR UPDATE`;
        deletionLockAcquired = true;
        // Hold lock 150ms while createReturnRequestAction runs concurrently
        await new Promise((r) => setTimeout(r, 150));
        // Delete user
        await tx1.user.delete({ where: { id: testUser.id } });
      });

      while (!deletionLockAcquired) {
        await new Promise((r) => setTimeout(r, 10));
      }

      // Call actual createReturnRequestAction server action
      let returnResult: { success: boolean; error?: string } | null = null;
      const returnPromise = (async () => {
        const startTime = Date.now();
        returnResult = await createReturnRequestAction({
          orderNumber: deliveredOrder.orderNumber,
          items: [{ orderItemId: deliveredOrder.items[0].id, quantity: 1 }],
        });
        returnBlockedDurationMs = Date.now() - startTime;
      })();

      await Promise.all([deleteTxPromise, returnPromise]);

      expect(returnBlockedDurationMs).toBeGreaterThanOrEqual(100);
      expect(returnResult).toEqual({
        success: false,
        error: "Order not found or access denied.",
      });

      // Verify NO return request was created in PostgreSQL
      const returns = await isolatedPrisma.returnRequest.findMany({
        where: { orderId: deliveredOrder.id },
      });
      expect(returns).toHaveLength(0);

      // Clean up variant & product
      await isolatedPrisma.productVariant.delete({ where: { id: variant.id } }).catch(() => {});
      await isolatedPrisma.product.delete({ where: { id: product.id } }).catch(() => {});
    });

    test("App-4: Return creation wins; deletion must correctly observe the active return", async () => {
      const ts = Date.now() + 40;
      const testPassword = "ValidPassword123!";
      const passwordHash = bcrypt.hashSync(testPassword, 10);
      const testUser = await isolatedPrisma.user.create({
        data: {
          email: `app-ret-first-${ts}@example.com`,
          name: "App Return First User",
          role: "CUSTOMER",
          passwordHash,
        },
      });
      createdUserIds.push(testUser.id);

      const product = await isolatedPrisma.product.create({
        data: { name: `App Ret Product 2 ${ts}`, slug: `app-ret2-${ts}`, status: "PUBLISHED" },
      });
      const variant = await isolatedPrisma.productVariant.create({
        data: { productId: product.id, sku: `SKU-RET2-${ts}`, costPrice: 100, sellingPrice: 300 },
      });

      const deliveredOrder = await isolatedPrisma.order.create({
        data: {
          orderNumber: `VL-APP-RET2-${ts}`,
          userId: testUser.id,
          status: "DELIVERED",
          paymentStatus: "SUCCESS",
          paymentMethod: "COD",
          customerName: "App Return First Customer",
          customerEmail: testUser.email,
          shippingStreet: "40 App St",
          shippingCity: "Dhaka",
          shippingCountry: "BD",
          shippingMethodName: "Standard",
          shippingCost: 60,
          subtotal: 600,
          discount: 0,
          taxAmount: 0,
          taxRate: 0,
          total: 660,
          items: {
            create: [
              {
                productName: "Return Item 2",
                sku: variant.sku,
                unitPrice: 300,
                costPrice: 100,
                lineSubtotal: 600,
                lineTotal: 600,
                quantity: 2,
                taxRate: 0,
                taxIncluded: false,
              },
            ],
          },
          shipment: {
            create: {
              trackingNumber: `TRK-RET2-${ts}`,
              provider: "STEADFAST",
              status: "DELIVERED",
              shippingAmount: 60,
              deliveredAt: new Date(),
            },
          },
        },
        include: { items: true },
      });
      createdOrderIds.push(deliveredOrder.id);

      mockSessionUser = { id: testUser.id, email: testUser.email, role: "CUSTOMER" };

      // 1. Invoke actual createReturnRequestAction server action
      const returnResult = await createReturnRequestAction({
        orderNumber: deliveredOrder.orderNumber,
        items: [{ orderItemId: deliveredOrder.items[0].id, quantity: 1 }],
      });
      expect(returnResult.success).toBe(true);

      // 2. Invoke actual deleteAccountAction server action
      const deleteResult = await deleteAccountAction({ password: testPassword });

      // 3. Verify deleteAccountAction observed the active return and rejected
      expect(deleteResult).toEqual({
        error: "Cannot delete account while you have active return requests in progress.",
      });

      // 4. Verify user was NOT deleted
      const userStillExists = await isolatedPrisma.user.findUnique({ where: { id: testUser.id } });
      expect(userStillExists).not.toBeNull();

      // Clean up return, variant, product
      if (returnResult.success && "returnRequestId" in returnResult) {
        await isolatedPrisma.returnItem
          .deleteMany({ where: { returnRequestId: returnResult.returnRequestId } })
          .catch(() => {});
        await isolatedPrisma.returnRequest
          .delete({ where: { id: returnResult.returnRequestId } })
          .catch(() => {});
      }
      await isolatedPrisma.productVariant.delete({ where: { id: variant.id } }).catch(() => {});
      await isolatedPrisma.product.delete({ where: { id: product.id } }).catch(() => {});
    });

    test("App-5: Guest-order refund remains functional", async () => {
      const ts = Date.now() + 50;
      // Guest order: userId is null
      const guestOrder = await isolatedPrisma.order.create({
        data: {
          orderNumber: `VL-GUEST-${ts}`,
          userId: null,
          status: "DELIVERED",
          paymentStatus: "SUCCESS",
          paymentMethod: "ONLINE",
          customerName: "Guest Customer",
          customerEmail: `guest-${ts}@example.com`,
          shippingStreet: "50 Guest St",
          shippingCity: "Dhaka",
          shippingCountry: "BD",
          shippingMethodName: "Standard",
          shippingCost: 60,
          subtotal: 800,
          discount: 0,
          taxAmount: 0,
          taxRate: 0,
          total: 860,
        },
      });
      createdOrderIds.push(guestOrder.id);

      const payment = await isolatedPrisma.payment.create({
        data: {
          orderId: guestOrder.id,
          amount: new Prisma.Decimal("860"),
          status: "SUCCESS",
          gateway: "sslcommerz",
        },
      });

      // Call actual RefundService.initiateRefund method on guest order
      const refundService = new RefundService();
      const refund = await refundService.initiateRefund(
        payment.id,
        new Prisma.Decimal("300"),
        "Guest Order Refund"
      );

      expect(refund.id).toBeDefined();
      expect(refund.status).toBe("PENDING");
      expect(refund.amount.toString()).toBe("300");

      // Verify refund persisted correctly in PostgreSQL
      const savedRefund = await isolatedPrisma.refund.findUnique({ where: { id: refund.id } });
      expect(savedRefund).not.toBeNull();
      expect(savedRefund!.paymentId).toBe(payment.id);

      // Clean up
      await isolatedPrisma.refund.delete({ where: { id: refund.id } }).catch(() => {});
      await isolatedPrisma.payment.delete({ where: { id: payment.id } }).catch(() => {});
    });

    test("App-6: Transaction rollback leaves no partial deletion or refund", async () => {
      const ts = Date.now() + 60;
      const testPassword = "ValidPassword123!";
      const passwordHash = bcrypt.hashSync(testPassword, 10);
      const testUser = await isolatedPrisma.user.create({
        data: {
          email: `app-rollback-${ts}@example.com`,
          name: "App Rollback User",
          role: "CUSTOMER",
          passwordHash,
        },
      });
      createdUserIds.push(testUser.id);

      // Create session and cart for user
      const session = await isolatedPrisma.session.create({
        data: {
          sessionToken: `token-rollback-${ts}`,
          userId: testUser.id,
          expires: new Date(Date.now() + 3600000),
        },
      });
      const cart = await isolatedPrisma.cart.create({
        data: {
          userId: testUser.id,
        },
      });

      // Create an active (PROCESSING) order which triggers deletion guard
      const activeOrder = await isolatedPrisma.order.create({
        data: {
          orderNumber: `VL-ROLLBACK-${ts}`,
          userId: testUser.id,
          status: "PROCESSING", // Active status
          paymentStatus: "SUCCESS",
          paymentMethod: "ONLINE",
          customerName: "Rollback User",
          customerEmail: testUser.email,
          shippingStreet: "60 Rollback St",
          shippingCity: "Dhaka",
          shippingCountry: "BD",
          shippingMethodName: "Standard",
          shippingCost: 60,
          subtotal: 500,
          discount: 0,
          taxAmount: 0,
          taxRate: 0,
          total: 560,
        },
      });
      createdOrderIds.push(activeOrder.id);

      const payment = await isolatedPrisma.payment.create({
        data: {
          orderId: activeOrder.id,
          amount: new Prisma.Decimal("560"),
          status: "SUCCESS",
          gateway: "sslcommerz",
        },
      });

      mockSessionUser = { id: testUser.id, email: testUser.email, role: "CUSTOMER" };

      // Sub-test A: Deletion rollback preserves user, cart, sessions, and creates no audit log
      const delResult = await deleteAccountAction({ password: testPassword });
      expect(delResult).toEqual({
        error: "Cannot delete account while you have active, processing, or in-transit orders.",
      });

      // Verify atomic rollback in PostgreSQL:
      const userAfterRollback = await isolatedPrisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(userAfterRollback).not.toBeNull();
      const cartAfterRollback = await isolatedPrisma.cart.findUnique({
        where: { userId: testUser.id },
      });
      expect(cartAfterRollback).not.toBeNull();
      const sessionsAfterRollback = await isolatedPrisma.session.findMany({
        where: { userId: testUser.id },
      });
      expect(sessionsAfterRollback).toHaveLength(1);
      const auditLogsAfterRollback = await isolatedPrisma.auditLog.count({
        where: { actorId: testUser.id, action: "CUSTOMER_SELF_DELETED" },
      });
      expect(auditLogsAfterRollback).toBe(0);

      // Sub-test B: Refund rollback on invalid amount leaves no partial refund
      const refundService = new RefundService();
      // Amount 2000 exceeds payment amount 560
      await expect(
        refundService.initiateRefund(payment.id, new Prisma.Decimal("2000"), "Excessive Refund")
      ).rejects.toThrow("Refund amount exceeds remaining refundable amount");

      // Verify no refund record was created
      const refundCount = await isolatedPrisma.refund.count({ where: { paymentId: payment.id } });
      expect(refundCount).toBe(0);

      // Clean up
      await isolatedPrisma.payment.delete({ where: { id: payment.id } }).catch(() => {});
      await isolatedPrisma.session.delete({ where: { id: session.id } }).catch(() => {});
      await isolatedPrisma.cart.delete({ where: { id: cart.id } }).catch(() => {});
    });
  });
});
