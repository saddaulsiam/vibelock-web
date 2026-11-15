import { describe, test, expect, beforeAll, afterAll } from "vitest";
import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";
import { lockCustomerUser } from "@/lib/checkout/actions";

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
      testDbUrl = trimmed.slice("DATABASE_URL=".length).trim().replace(/^['"]|['"]$/g, "");
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
    console.log(`[Phase 9 Concurrency Suite] PostgreSQL Version: ${dbInfo[0].version.split(",")[0]}`);
    console.log(`[Phase 9 Concurrency Suite] Independent Backend PIDs: Conn1=${pid1}, Conn2=${pid2}`);

    expect(pid1).toBeGreaterThan(0);
    expect(pid2).toBeGreaterThan(0);
    expect(pid1).not.toBe(pid2);
  });

  afterAll(async () => {
    try {
      if (createdOrderIds.length > 0) {
        await isolatedPrisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } }).catch(() => {});
        await isolatedPrisma.order.deleteMany({ where: { id: { in: createdOrderIds } } }).catch(() => {});
      }
      if (createdUserIds.length > 0) {
        await isolatedPrisma.user.deleteMany({ where: { id: { in: createdUserIds } } }).catch(() => {});
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
    const checkoutTxPromise = prismaConn2.$transaction(async (tx2) => {
      const startTime = Date.now();
      try {
        await lockCustomerUser(testUser.id, tx2);
      } catch (err) {
        checkoutError = err as Error;
        conn2CheckoutBlockedDurationMs = Date.now() - startTime;
        throw err;
      }
    }).catch(() => {});

    await Promise.all([deleteTxPromise, checkoutTxPromise]);

    expect(conn1DeletionCommitted).toBe(true);
    expect(conn2CheckoutBlockedDurationMs).toBeGreaterThanOrEqual(100);
    expect(checkoutError).not.toBeNull();
    expect(checkoutError!.message).toBe("CUSTOMER_NOT_FOUND");
  });
});
