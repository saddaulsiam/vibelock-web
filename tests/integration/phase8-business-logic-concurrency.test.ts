import { describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import path from "path";
import fs from "fs";
import { PrismaClient, Prisma, User, ProductVariant } from "@prisma/client";
import { releaseOrderCoupon } from "@/lib/checkout/coupons";

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

describe("Phase 8 Real PostgreSQL Concurrency Verification", () => {
  let testUser: User;
  let testVariant: ProductVariant;
  let pid1: number;
  let pid2: number;
  const createdOrderIds: string[] = [];
  const createdCouponIds: string[] = [];

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

    console.log(`[Phase 8 Concurrency Suite] Isolated DB: ${dbInfo[0].current_database}`);
    console.log(`[Phase 8 Concurrency Suite] PostgreSQL Version: ${dbInfo[0].version.split(",")[0]}`);
    console.log(`[Phase 8 Concurrency Suite] Independent Backend PIDs: Conn1=${pid1}, Conn2=${pid2}`);

    expect(pid1).toBeGreaterThan(0);
    expect(pid2).toBeGreaterThan(0);
    expect(pid1).not.toBe(pid2);

    // 3. Create test catalog data
    const ts = Date.now();
    testUser = await isolatedPrisma.user.create({
      data: {
        email: `p8-user-${ts}@example.com`,
        name: "Phase 8 Concurrency User",
        role: "CUSTOMER",
      },
    });

    const product = await isolatedPrisma.product.create({
      data: { name: `P8-Product-${ts}`, slug: `p8-prod-${ts}`, status: "PUBLISHED" },
    });

    testVariant = await isolatedPrisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `SKU-P8-${ts}`,
        size: "M",
        costPrice: new Prisma.Decimal(500),
        sellingPrice: new Prisma.Decimal(1000),
      },
    });

    await isolatedPrisma.inventoryTransaction.create({
      data: {
        variantId: testVariant.id,
        quantity: 100,
        type: "RESTOCK",
        referenceId: `RESTOCK-P8-${ts}`,
      },
    });
  });

  afterAll(async () => {
    try {
      if (createdOrderIds.length > 0) {
        await isolatedPrisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } });
        await isolatedPrisma.orderHistory.deleteMany({ where: { orderId: { in: createdOrderIds } } });
        await isolatedPrisma.auditLog.deleteMany({ where: { entityId: { in: createdOrderIds } } });
        await isolatedPrisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
      }
      if (createdCouponIds.length > 0) {
        await isolatedPrisma.coupon.deleteMany({ where: { id: { in: createdCouponIds } } });
      }
      await isolatedPrisma.cartItem.deleteMany();
      await isolatedPrisma.cart.deleteMany();
      await isolatedPrisma.inventoryTransaction.deleteMany({ where: { variantId: testVariant?.id } });
      await isolatedPrisma.productVariant.deleteMany({ where: { id: testVariant?.id } });
      await isolatedPrisma.product.deleteMany({ where: { name: { startsWith: "P8-Product-" } } });
      if (testUser?.id) {
        await isolatedPrisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
      }
    } finally {
      await prismaConn1.$disconnect();
      await prismaConn2.$disconnect();
      await isolatedPrisma.$disconnect();
    }
  });

  beforeEach(async () => {
    // Clear carts before each test
    await isolatedPrisma.cartItem.deleteMany();
    await isolatedPrisma.cart.deleteMany();
  });

  test("1 & 2. Simultaneous checkout requests for the same cart: exactly one order succeeds, second transaction sees empty cart after acquiring lock", async () => {
    // Set up user's cart with 1 item
    const cart = await isolatedPrisma.cart.create({
      data: {
        userId: testUser.id,
        items: {
          create: {
            variantId: testVariant.id,
            quantity: 1,
          },
        },
      },
      include: { items: true },
    });

    expect(cart.items.length).toBe(1);

    // Two simultaneous checkout transactions executing SEC-8-03 lock-first pattern
    const executeCheckoutTransaction = async (
      prismaClient: PrismaClient,
      idempotencyKey: string,
      holdLockMs: number
    ) => {
      return prismaClient.$transaction(
        async (tx) => {
          // Step 1: Find user's cart ID without loading items
          const cartHeader = await tx.cart.findUnique({
            where: { userId: testUser.id },
            select: { id: true },
          });

          if (!cartHeader) {
            throw new Error("Empty cart");
          }

          // Step 2: Acquire row lock on Cart row first
          await tx.$queryRaw`SELECT id FROM "Cart" WHERE id = ${cartHeader.id} FOR UPDATE`;

          // Simulate concurrent work while holding exclusive row lock
          if (holdLockMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, holdLockMs));
          }

          // Step 3: Fetch fresh cart and items under the acquired lock
          const dbCart = await tx.cart.findUnique({
            where: { id: cartHeader.id },
            include: { items: true },
          });

          // Step 4: Reject missing or empty carts
          if (!dbCart || dbCart.items.length === 0) {
            throw new Error("Empty cart");
          }

          // Step 5: Create order and clear cart
          const orderNumber = `VL-CONC-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
          const newOrder = await tx.order.create({
            data: {
              orderNumber,
              checkoutIdempotencyKey: idempotencyKey,
              userId: testUser.id,
              status: "PENDING",
              paymentStatus: "PENDING",
              paymentMethod: "COD",
              customerEmail: testUser.email,
              shippingStreet: "123 Concurrency Way",
              shippingCity: "Dhaka",
              shippingCountry: "BD",
              shippingCost: 60,
              subtotal: 1000,
              total: 1060,
              taxAmount: 0,
              taxRate: 0,
              discount: 0,
              shippingMethodName: "Standard",
              items: {
                create: {
                  productName: "P8 Test Product",
                  sku: testVariant.sku,
                  quantity: 1,
                  unitPrice: new Prisma.Decimal(1000),
                  costPrice: new Prisma.Decimal(500),
                  taxRate: 0,
                  taxIncluded: false,
                  lineSubtotal: new Prisma.Decimal(1000),
                  lineTotal: new Prisma.Decimal(1000),
                },
              },
            },
          });

          createdOrderIds.push(newOrder.id);

          // Clear cart items
          await tx.cartItem.deleteMany({ where: { cartId: dbCart.id } });

          return newOrder;
        },
        { timeout: 10000 }
      );
    };

    // Run both transactions simultaneously:
    // Conn1 holds lock for 150ms, ensuring Conn2 reaches SELECT ... FOR UPDATE and BLOCKS in PostgreSQL
    const [result1, result2] = await Promise.allSettled([
      executeCheckoutTransaction(prismaConn1, `key-conn1-${Date.now()}`, 150),
      // Slight delay (20ms) so Conn1 enters the transaction first and takes the lock
      new Promise<ReturnType<typeof executeCheckoutTransaction>>((resolve) =>
        setTimeout(
          () => resolve(executeCheckoutTransaction(prismaConn2, `key-conn2-${Date.now()}`, 0)),
          20
        )
      ).then((p) => p),
    ]);

    // Exactly one transaction must succeed
    const successful = [result1, result2].filter((r) => r.status === "fulfilled");
    const rejected = [result1, result2].filter((r) => r.status === "rejected");

    expect(successful.length).toBe(1);
    expect(rejected.length).toBe(1);

    // The rejected transaction must fail with "Empty cart" after unblocking
    if (rejected[0].status === "rejected") {
      expect((rejected[0].reason as Error).message).toBe("Empty cart");
    }

    // Exactly one order must exist in PostgreSQL
    const createdOrders = await isolatedPrisma.order.findMany({
      where: { userId: testUser.id, orderNumber: { startsWith: "VL-CONC-" } },
    });
    expect(createdOrders.length).toBe(1);

    // Cart items must be 0 in the database
    const remainingItems = await isolatedPrisma.cartItem.count({ where: { cartId: cart.id } });
    expect(remainingItems).toBe(0);
  });

  test("3. Concurrent coupon releases decrement usageCount only once (idempotent under real PostgreSQL row lock)", async () => {
    const ts = Date.now();
    const couponCode = `P8CONC-${ts}`;

    // Create exhausted coupon: usageLimit = 10, usageCount = 10, isActive = false
    const coupon = await isolatedPrisma.coupon.create({
      data: {
        code: couponCode,
        discountType: "FIXED",
        discountValue: 100,
        usageLimit: 10,
        usageCount: 10,
        isActive: false, // Exhausted
      },
    });
    createdCouponIds.push(coupon.id);

    // Create an order associated with this coupon
    const order = await isolatedPrisma.order.create({
      data: {
        orderNumber: `VL-REL-${ts}`,
        userId: testUser.id,
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: "COD",
        customerEmail: testUser.email,
        shippingStreet: "123 Concurrency Way",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingCost: 60,
        subtotal: 1000,
        total: 960,
        taxAmount: 0,
        taxRate: 0,
        discount: 100,
        shippingMethodName: "Standard",
        history: {
          create: {
            status: "PENDING",
            notes: `Order created. Coupon applied: ${couponCode} (Discount: 100.00 BDT)`,
          },
        },
      },
    });
    createdOrderIds.push(order.id);

    await isolatedPrisma.auditLog.create({
      data: {
        actorId: testUser.id,
        action: "COUPON_REDEEMED",
        entityType: "Order",
        entityId: order.id,
        metadata: {
          couponCode: coupon.code,
          couponId: coupon.id,
        },
      },
    });

    // Run two concurrent releases from independent connections on the same order
    const releasePromise1 = prismaConn1.$transaction(async (tx) => {
      // Hold lock slightly to guarantee contention
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${order.id} FOR UPDATE`;
      await new Promise((resolve) => setTimeout(resolve, 80));
      return releaseOrderCoupon(order.id, tx);
    });

    const releasePromise2 = new Promise<{ success: boolean; releasedCoupon?: string }>((resolve) =>
      setTimeout(
        () =>
          resolve(
            prismaConn2.$transaction(async (tx) => {
              return releaseOrderCoupon(order.id, tx);
            })
          ),
        15
      )
    ).then((p) => p);

    const [res1, res2] = await Promise.all([releasePromise1, releasePromise2]);

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);

    // Verify in database: usageCount must be decremented ONLY ONCE (from 10 to 9)
    const updatedCoupon = await isolatedPrisma.coupon.findUnique({
      where: { id: coupon.id },
    });

    expect(updatedCoupon?.usageCount).toBe(9);
    // Exhausted coupon was properly reactivated because 10 >= 10 and 9 < 10
    expect(updatedCoupon?.isActive).toBe(true);

    // Audit logs must contain exactly 1 COUPON_RELEASED for this order
    const releaseLogs = await isolatedPrisma.auditLog.findMany({
      where: { entityId: order.id, action: "COUPON_RELEASED" },
    });
    expect(releaseLogs.length).toBe(1);
  });

  test("4. Manual coupon deactivation remains preserved after order cancellation (SEC-8-01 real DB verification)", async () => {
    const ts = Date.now();
    const couponCode = `MANUAL-${ts}`;

    // Admin manually disabled coupon at usageCount = 5, usageLimit = 10 (NOT exhausted)
    const coupon = await isolatedPrisma.coupon.create({
      data: {
        code: couponCode,
        discountType: "FIXED",
        discountValue: 50,
        usageLimit: 10,
        usageCount: 5,
        isActive: false, // Manually disabled by admin
      },
    });
    createdCouponIds.push(coupon.id);

    const order = await isolatedPrisma.order.create({
      data: {
        orderNumber: `VL-MANUAL-${ts}`,
        userId: testUser.id,
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: "COD",
        customerEmail: testUser.email,
        shippingStreet: "123 Concurrency Way",
        shippingCity: "Dhaka",
        shippingCountry: "BD",
        shippingCost: 60,
        subtotal: 1000,
        total: 1010,
        taxAmount: 0,
        taxRate: 0,
        discount: 50,
        shippingMethodName: "Standard",
        history: {
          create: {
            status: "PENDING",
            notes: `Order created. Coupon applied: ${couponCode} (Discount: 50.00 BDT)`,
          },
        },
      },
    });
    createdOrderIds.push(order.id);

    await isolatedPrisma.auditLog.create({
      data: {
        actorId: testUser.id,
        action: "COUPON_REDEEMED",
        entityType: "Order",
        entityId: order.id,
        metadata: {
          couponCode: coupon.code,
          couponId: coupon.id,
        },
      },
    });

    // Execute release in transaction
    const releaseResult = await isolatedPrisma.$transaction(async (tx) => {
      return releaseOrderCoupon(order.id, tx);
    });

    expect(releaseResult.success).toBe(true);

    // Verify in database:
    // usageCount must be decremented from 5 to 4
    // BUT isActive must REMAIN FALSE (preserving admin deactivation)
    const updatedCoupon = await isolatedPrisma.coupon.findUnique({
      where: { id: coupon.id },
    });

    expect(updatedCoupon?.usageCount).toBe(4);
    expect(updatedCoupon?.isActive).toBe(false); // Preserved!
  });
});

