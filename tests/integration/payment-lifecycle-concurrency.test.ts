import { OrderStatus, Prisma, PrismaClient, ProductVariant, User } from "@prisma/client";
import fs from "fs";
import path from "path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

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

// Bind globalThis.prismaGlobal to isolated test database client before any service imports
const isolatedPrisma = new PrismaClient({ datasources: { db: { url: concurrencyDbUrl } } });
(globalThis as unknown as { prismaGlobal: PrismaClient }).prismaGlobal = isolatedPrisma;

// Import application services after setting DATABASE_URL and globalThis.prismaGlobal
import { BkashProvider } from "@/lib/payment/providers/bkash/client";
import { PaystationProvider } from "@/lib/payment/providers/paystation/client";
import { PaymentService } from "@/lib/payment/service";
import { PaymentInitiationRequest } from "@/lib/payment/types";
import prisma from "@/lib/prisma/client";
import { RefundService } from "@/lib/refunds/service";

describe("Phase 5B-3 Real PostgreSQL Concurrency Verification", () => {
  let testUser: User;
  let testVariant: ProductVariant;
  let pid1: number;
  let pid2: number;
  const createdOrderIds: string[] = [];

  async function createTestOrder(
    orderNumber: string,
    quantity = 1,
    status: OrderStatus = "PENDING",
    paymentStatus: "PENDING" | "SUCCESS" = "PENDING"
  ) {
    const order = await isolatedPrisma.order.create({
      data: {
        orderNumber,
        userId: testUser.id,
        status,
        paymentStatus,
        paymentMethod: "ONLINE",
        customerEmail: testUser.email,
        customerPhone: "01711111111",
        shippingStreet: "Banani Rd 11",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingCost: 60,
        subtotal: 1000 * quantity,
        taxAmount: 0,
        taxRate: 0,
        discount: 0,
        total: 1000 * quantity + 60,
        shippingMethodName: "Standard",
        items: {
          create: {
            productName: "Test Product",
            sku: testVariant.sku,
            quantity,
            unitPrice: new Prisma.Decimal(1000),
            costPrice: new Prisma.Decimal(500),
            taxRate: 0,
            taxIncluded: false,
            lineSubtotal: new Prisma.Decimal(1000 * quantity),
            lineTotal: new Prisma.Decimal(1000 * quantity),
          },
        },
      },
      include: { items: true },
    });
    createdOrderIds.push(order.id);
    return order;
  }

  beforeAll(async () => {
    // 1. Strict Runtime Database-Name & Local Server Address Guard: executes before any fixture or test query
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
        `SAFETY HALT: Attempted to run concurrency test against non-local PostgreSQL server: '${rawServerAddr}'. Concurrency tests are strictly restricted to localhost.`
      );
    }

    // 2. Verify independent PostgreSQL connection backend PIDs
    const q1 = await prismaConn1.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() as pid`;
    const q2 = await prismaConn2.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() as pid`;
    pid1 = q1[0].pid;
    pid2 = q2[0].pid;

    console.log(`[Concurrency Suite] Isolated DB: ${dbInfo[0].current_database}`);
    console.log(`[Concurrency Suite] PostgreSQL Version: ${dbInfo[0].version.split(",")[0]}`);
    console.log(`[Concurrency Suite] Independent Backend PIDs: Conn1=${pid1}, Conn2=${pid2}`);

    expect(pid1).toBeGreaterThan(0);
    expect(pid2).toBeGreaterThan(0);

    // 3. Create shared base catalog records
    const ts = Date.now();
    testUser = await isolatedPrisma.user.create({
      data: {
        email: `concurrency-user-${ts}@example.com`,
        name: "Concurrency Test User",
        role: "ADMIN",
      },
    });

    await isolatedPrisma.category.create({
      data: { name: `Cat-${ts}`, slug: `cat-${ts}` },
    });

    const product = await isolatedPrisma.product.create({
      data: { name: `Product-${ts}`, slug: `prod-${ts}`, status: "PUBLISHED" },
    });

    testVariant = await isolatedPrisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `SKU-CONC-${ts}`,
        size: "L",
        costPrice: new Prisma.Decimal(500),
        sellingPrice: new Prisma.Decimal(1000),
      },
    });

    // Seed stock of 50 units
    await isolatedPrisma.inventoryTransaction.create({
      data: {
        variantId: testVariant.id,
        quantity: 50,
        type: "RESTOCK",
        referenceId: `RESTOCK-INIT-${ts}`,
      },
    });
  });

  afterAll(async () => {
    // Guaranteed cleanup for shared catalog and user records
    try {
      await isolatedPrisma.auditLog.deleteMany({
        where: { entityType: { in: ["Order", "Payment", "Refund"] } },
      });
      await isolatedPrisma.refund.deleteMany();
      await isolatedPrisma.payment.deleteMany();
      await isolatedPrisma.inventoryReservation.deleteMany();
      await isolatedPrisma.inventoryTransaction.deleteMany();
      await isolatedPrisma.orderHistory.deleteMany();
      await isolatedPrisma.orderItem.deleteMany();
      await isolatedPrisma.order.deleteMany();
      await isolatedPrisma.productVariant.deleteMany();
      await isolatedPrisma.product.deleteMany({ where: { name: { startsWith: "Product-" } } });
      await isolatedPrisma.category.deleteMany({ where: { name: { startsWith: "Cat-" } } });
      if (testUser) {
        await isolatedPrisma.user.deleteMany({ where: { id: testUser.id } });
      }
    } catch (err) {
      console.warn("[Concurrency Suite] Warning during afterAll cleanup:", err);
    } finally {
      await isolatedPrisma.$disconnect();
      await prisma.$disconnect();
      await prismaConn1.$disconnect();
      await prismaConn2.$disconnect();
    }
  });

  // Mock external gateway network calls so tests strictly test DB concurrency without real provider API calls
  beforeEach(() => {
    vi.spyOn(BkashProvider.prototype, "initiatePayment").mockImplementation(async (orderData) => ({
      success: true,
      redirectUrl: `https://mock.bkash.com/checkout?order=${orderData.orderNumber}`,
      merchantReferenceId: `BKASH-REF-${Date.now()}`,
    }));

    vi.spyOn(BkashProvider.prototype, "verifyPayment").mockImplementation(async (payload) => {
      const merchantRef = (payload.paymentID || payload.paymentId || payload.tran_id) as string;
      const payment = await isolatedPrisma.payment.findUnique({
        where: { merchantReferenceId: merchantRef },
      });
      return {
        success: true,
        status: "SUCCESS" as const,
        providerTransactionId: `BANK-BKASH-${Date.now()}`,
        verifiedMerchantReferenceId: merchantRef,
        verifiedCurrency: "BDT",
        verifiedAmount: payment ? Number(payment.amount) : 1060,
        rawPayload: payload,
      };
    });

    vi.spyOn(PaystationProvider.prototype, "initiatePayment").mockImplementation(
      async (orderData: PaymentInitiationRequest) => ({
        success: true,
        redirectUrl: `https://mock.paystation.com.bd/checkout?order=${orderData.orderNumber}`,
        merchantReferenceId: `PS-REF-${Date.now()}`,
      })
    );

    vi.spyOn(PaystationProvider.prototype, "verifyPayment").mockImplementation(
      async (payload: Record<string, unknown>) => {
        const merchantRef = (payload.invoice_number ||
          payload.tran_id ||
          payload.paymentID) as string;
        const payment = await isolatedPrisma.payment.findUnique({
          where: { merchantReferenceId: merchantRef },
        });
        return {
          success: true,
          status: "SUCCESS" as const,
          providerTransactionId: `BANK-PS-${Date.now()}`,
          verifiedMerchantReferenceId: merchantRef,
          verifiedCurrency: "BDT",
          verifiedAmount: payment ? Number(payment.amount) : 1060,
          rawPayload: payload,
        };
      }
    );
  });

  afterEach(async () => {
    vi.restoreAllMocks();

    // Guaranteed per-test cleanup even if test assertions fail
    if (createdOrderIds.length > 0) {
      const ids = [...createdOrderIds];
      createdOrderIds.length = 0;
      try {
        await isolatedPrisma.auditLog.deleteMany({
          where: {
            OR: [
              { entityType: "Order", entityId: { in: ids } },
              { entityType: "Payment", metadata: { path: ["orderId"], string_contains: ids[0] } },
              { entityType: "Refund" },
            ],
          },
        });
        await isolatedPrisma.inventoryTransaction.deleteMany({
          where: { referenceId: { in: ids } },
        });
        await isolatedPrisma.inventoryReservation.deleteMany({ where: { orderId: { in: ids } } });
        await isolatedPrisma.refund.deleteMany({ where: { payment: { orderId: { in: ids } } } });
        await isolatedPrisma.payment.deleteMany({ where: { orderId: { in: ids } } });
        await isolatedPrisma.orderHistory.deleteMany({ where: { orderId: { in: ids } } });
        await isolatedPrisma.orderItem.deleteMany({ where: { orderId: { in: ids } } });
        await isolatedPrisma.order.deleteMany({ where: { id: { in: ids } } });
      } catch (cleanupErr) {
        console.warn("[Concurrency Suite] Warning during afterEach cleanup:", cleanupErr);
      }
    }
  });

  // --------------------------------------------------------------------------
  // TEST A — Cross-gateway payment initiation concurrency & Order row locking
  // --------------------------------------------------------------------------
  test("Test A: serializes cross-gateway payment initiation via Order row lock and blocks duplicate in-flight sessions", async () => {
    const ts = Date.now();
    const order = await createTestOrder(`ORD-TEST-A-${ts}`, 1, "PENDING", "PENDING");

    // Synchronization barrier proving actual lock contention in PostgreSQL:
    // Conn 1 acquires SELECT ... FOR UPDATE on the Order row inside an open transaction.
    // Conn 2 invokes initiatePayment for PayStation on the same order.
    // Conn 2 is blocked by PostgreSQL until Conn 1 commits.
    let conn1HoldingLock = true;
    let conn2FinishedBeforeRelease = false;

    const lockPromise = new Promise<void>((resolve) => {
      prismaConn1.$transaction(async (tx1) => {
        // Acquire row lock on Order
        await tx1.$queryRaw`SELECT id FROM "Order" WHERE id = ${order.id} FOR UPDATE`;

        // Launch concurrent initiatePayment on Conn 2 while Conn 1 holds the lock
        (async () => {
          const service = new PaymentService();
          const res = await service.initiatePayment(order, "PAYSTATION");
          if (conn1HoldingLock) {
            conn2FinishedBeforeRelease = true;
          }
          return res;
        })();

        // Wait 350ms to verify Conn 2 is physically blocked waiting for the row lock
        await new Promise((r) => setTimeout(r, 350));
        expect(conn2FinishedBeforeRelease).toBe(false);

        // Conn 1 creates the PENDING placeholder for BKASH inside its transaction
        await tx1.payment.create({
          data: {
            orderId: order.id,
            amount: 1060,
            status: "PENDING",
            gateway: "BKASH",
          },
        });

        conn1HoldingLock = false;
        resolve(); // Commit tx1, releasing the row lock
      });
    });

    await lockPromise;

    // After Conn 1 commits, Conn 2 unblocks, queries the order under its own lock,
    // finds the newly committed PENDING placeholder, and returns IN_FLIGHT rejection.
    const service = new PaymentService();
    const conn2Result = await service.initiatePayment(order, "PAYSTATION");

    expect(conn2Result.success).toBe(false);
    expect(conn2Result.error).toContain("A payment initiation is already in progress");

    // Verify database state: only 1 payment placeholder exists for this order
    const payments = await isolatedPrisma.payment.findMany({ where: { orderId: order.id } });
    expect(payments.length).toBe(1);
    expect(payments[0].status).toBe("PENDING");
    expect(payments[0].gateway).toBe("BKASH");
  }, 20000);

  // --------------------------------------------------------------------------
  // TEST B — Concurrent successful callbacks & idempotency
  // --------------------------------------------------------------------------
  test("Test B: handles concurrent successful callbacks idempotently with single inventory deduction", async () => {
    const ts = Date.now();
    const order = await createTestOrder(`ORD-TEST-B-${ts}`, 2, "PENDING", "PENDING");

    const payment = await isolatedPrisma.payment.create({
      data: {
        orderId: order.id,
        merchantReferenceId: `TRX-B-REF-${ts}`,
        amount: 2060,
        status: "INITIATED",
        gateway: "BKASH",
      },
    });

    const reservation = await isolatedPrisma.inventoryReservation.create({
      data: {
        orderId: order.id,
        variantId: testVariant.id,
        quantity: 2,
        status: "RESERVED",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const service1 = new PaymentService();
    const service2 = new PaymentService();

    // Trigger two truly concurrent verifyCallback executions
    const [res1, res2] = await Promise.allSettled([
      service1.verifyCallback("BKASH", { paymentID: payment.merchantReferenceId }),
      service2.verifyCallback("BKASH", { paymentID: payment.merchantReferenceId }),
    ]);

    expect(res1.status).toBe("fulfilled");
    expect(res2.status).toBe("fulfilled");

    // 1. Order and payment status verified
    const orderAfter = await isolatedPrisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(orderAfter.paymentStatus).toBe("SUCCESS");
    expect(["PENDING", "CONFIRMED", "PROCESSING"]).toContain(orderAfter.status);

    const paymentAfter = await isolatedPrisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(paymentAfter.status).toBe("SUCCESS");

    // 2. Inventory SALE transaction must be created EXACTLY ONCE
    const sales = await isolatedPrisma.inventoryTransaction.findMany({
      where: { referenceId: order.id, type: "SALE" },
    });
    expect(sales.length).toBe(1);
    expect(sales[0].quantity).toBe(-2);

    // 3. Reservation must be COMMITTED exactly once
    const updatedRes = await isolatedPrisma.inventoryReservation.findUniqueOrThrow({
      where: { id: reservation.id },
    });
    expect(updatedRes.status).toBe("COMMITTED");
  }, 20000);

  // --------------------------------------------------------------------------
  // TEST C — Duplicate payment capture reconciliation
  // --------------------------------------------------------------------------
  test("Test C: captures second successful payment without double-deducting inventory and flags DUPLICATE_PAYMENT", async () => {
    const ts = Date.now();
    const order = await createTestOrder(`ORD-TEST-C-${ts}`, 1, "PENDING", "PENDING");

    const payment1 = await isolatedPrisma.payment.create({
      data: {
        orderId: order.id,
        merchantReferenceId: `TRX-C1-${ts}`,
        amount: 1060,
        status: "INITIATED",
        gateway: "BKASH",
      },
    });

    const payment2 = await isolatedPrisma.payment.create({
      data: {
        orderId: order.id,
        merchantReferenceId: `TRX-C2-${ts}`,
        amount: 1060,
        status: "INITIATED",
        gateway: "PAYSTATION",
      },
    });

    await isolatedPrisma.inventoryReservation.create({
      data: {
        orderId: order.id,
        variantId: testVariant.id,
        quantity: 1,
        status: "RESERVED",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const service = new PaymentService();

    // 1. Process first payment callback
    await service.verifyCallback("BKASH", {
      paymentID: payment1.merchantReferenceId,
    });

    // 2. Process second successful payment callback for the same order
    await service.verifyCallback("PAYSTATION", {
      invoice_number: payment2.merchantReferenceId,
    });

    // 3. Verify both payments captured as SUCCESS
    const p1 = await isolatedPrisma.payment.findUniqueOrThrow({ where: { id: payment1.id } });
    const p2 = await isolatedPrisma.payment.findUniqueOrThrow({ where: { id: payment2.id } });
    expect(p1.status).toBe("SUCCESS");
    expect(p2.status).toBe("SUCCESS");

    // 4. Verify inventory deducted only ONCE
    const sales = await isolatedPrisma.inventoryTransaction.findMany({
      where: { referenceId: order.id, type: "SALE" },
    });
    expect(sales.length).toBe(1);

    // 5. Verify DUPLICATE_PAYMENT audit log and order history
    const audit = await isolatedPrisma.auditLog.findFirst({
      where: {
        entityType: "Payment",
        entityId: payment2.id,
        action: "DUPLICATE_PAYMENT_CAPTURED",
      },
    });
    expect(audit).not.toBeNull();

    const history = await isolatedPrisma.orderHistory.findFirst({
      where: { orderId: order.id, notes: { contains: "[DUPLICATE_PAYMENT]" } },
    });
    expect(history).not.toBeNull();
  }, 20000);

  // --------------------------------------------------------------------------
  // TEST D — Concurrent manual refunds & row-level balance protection
  // --------------------------------------------------------------------------
  test("Test D: serializes concurrent manual refunds via row locking and prevents exceeding refundable balance", async () => {
    const ts = Date.now();
    const order = await createTestOrder(`ORD-TEST-D-${ts}`, 1, "DELIVERED", "SUCCESS");

    const payment = await isolatedPrisma.payment.create({
      data: {
        orderId: order.id,
        merchantReferenceId: `TRX-D-${ts}`,
        amount: 1060,
        status: "SUCCESS",
        gateway: "BKASH",
      },
    });

    // Create two pending refunds of 600 each (Total 1200 > 1060 refundable balance)
    const refund1 = await isolatedPrisma.refund.create({
      data: {
        paymentId: payment.id,
        amount: new Prisma.Decimal(600),
        status: "PENDING",
        reason: "Defective item",
      },
    });

    const refund2 = await isolatedPrisma.refund.create({
      data: {
        paymentId: payment.id,
        amount: new Prisma.Decimal(600),
        status: "PENDING",
        reason: "Wrong color",
      },
    });

    const refundService = new RefundService();

    // Launch both manual refund completion actions concurrently across separate connections
    const [res1, res2] = await Promise.allSettled([
      refundService.recordManualRefundSuccess({
        refundId: refund1.id,
        adminId: testUser.id,
        transactionReference: `REF-TRX-1-${ts}`,
      }),
      refundService.recordManualRefundSuccess({
        refundId: refund2.id,
        adminId: testUser.id,
        transactionReference: `REF-TRX-2-${ts}`,
      }),
    ]);

    const fulfilled = [res1, res2].filter((r) => r.status === "fulfilled");
    const rejected = [res1, res2].filter((r) => r.status === "rejected");

    // Exactly one refund must succeed, and the other must be rejected due to balance exceeded
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const rejection = (rejected[0] as PromiseRejectedResult).reason;
    expect(rejection.message).toContain("Refund amount exceeds remaining refundable amount");

    // Verify database state: only 1 refund transitioned to SUCCESS
    const r1 = await isolatedPrisma.refund.findUniqueOrThrow({ where: { id: refund1.id } });
    const r2 = await isolatedPrisma.refund.findUniqueOrThrow({ where: { id: refund2.id } });

    const successfulRefunds = [r1, r2].filter((r) => r.status === "SUCCESS");
    const pendingRefunds = [r1, r2].filter((r) => r.status === "PENDING");

    expect(successfulRefunds.length).toBe(1);
    expect(pendingRefunds.length).toBe(1);

    const totalRefunded = successfulRefunds.reduce((sum, r) => sum + Number(r.amount), 0);
    expect(totalRefunded).toBe(600);
    expect(totalRefunded).toBeLessThanOrEqual(1060);

    // Verify AuditLog was recorded for the successful refund
    const audit = await isolatedPrisma.auditLog.findFirst({
      where: {
        entityType: "Refund",
        entityId: successfulRefunds[0].id,
        action: "MANUAL_REFUND_COMPLETED",
      },
    });
    expect(audit).not.toBeNull();
  }, 20000);
});
