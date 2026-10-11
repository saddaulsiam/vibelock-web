import { expect, test, describe } from "vitest";
import prisma from "../../src/lib/prisma/client";
import { InventoryService } from "../../src/lib/inventory/service";

describe("Inventory Concurrency Tests", () => {
  const ts = Date.now().toString();

  test("InventoryService concurrent reservation with one available unit", async () => {
    // 1. Setup isolated product with exactly 1 unit
    const product = await prisma.product.create({
      data: {
        name: `Race Product ${ts}`,
        slug: `race-${ts}`,
        status: "PUBLISHED",
        variants: {
          create: { sku: `RACE-${ts}`, size: "M", costPrice: 10, sellingPrice: 20 }
        }
      },
      include: { variants: true }
    });
    const variantId = product.variants[0].id;
    const sku = product.variants[0].sku;
    
    // Add exactly 1 unit
    await prisma.inventoryTransaction.create({
      data: { variantId, quantity: 1, type: "RESTOCK", referenceId: `R-${ts}` }
    });

    // 2. Setup user and two separate orders trying to buy the same item
    const user = await prisma.user.create({ data: { email: `racer-${ts}@test.local` } });
    
    const createOrder = async (num: string) => {
      return prisma.order.create({
        data: {
          orderNumber: `ORD-RACE-${ts}-${num}`,
          customerEmail: user.email,
          userId: user.id,
          status: "PENDING",
          taxRate: 0,
          taxIncluded: false,
          shippingCost: 0,
          subtotal: 20,
          taxAmount: 0,
          discount: 0,
          total: 20,
          shippingStreet: "123",
          shippingCity: "City",
          shippingCountry: "Country",
          shippingMethodName: "Standard",
          items: {
            create: {
              productName: product.name,
              sku,
              size: "M",
              unitPrice: 20,
              costPrice: 10,
              appliedDiscount: 0,
              taxRate: 0,
              taxIncluded: false,
              lineSubtotal: 20,
              discountAmount: 0,
              taxAmount: 0,
              lineTotal: 20,
              quantity: 1 // wants the last unit
            }
          }
        }
      });
    };

    const orderA = await createOrder("A");
    const orderB = await createOrder("B");

    // 3. Start two concurrent calls against the REAL inventory reservation service
    const results = await Promise.allSettled([
      InventoryService.reserveInventoryForOrder(orderA.id),
      InventoryService.reserveInventoryForOrder(orderB.id)
    ]);
    
    const successes = results.filter(r => r.status === "fulfilled").length;
    const failures = results.filter(r => r.status === "rejected").length;
    
    // Expected: 1 success, 1 failure
    expect(successes).toBe(1);
    expect(failures).toBe(1);
    
    // Verify available stock is never negative
    const stockAgg = await prisma.inventoryTransaction.aggregate({
      where: { variantId },
      _sum: { quantity: true }
    });
    const reservedAgg = await prisma.inventoryReservation.aggregate({
      where: { variantId, status: "RESERVED", expiresAt: { gt: new Date() } },
      _sum: { quantity: true }
    });
    const available = Number(stockAgg._sum.quantity || 0) - Number(reservedAgg._sum.quantity || 0);
    
    expect(available).toBe(0);
    expect(available).toBeGreaterThanOrEqual(0);
    
    // Verify only one reservation exists
    const resCount = await prisma.inventoryReservation.count({
      where: { variantId, status: "RESERVED" }
    });
    expect(resCount).toBe(1);
  }, 30000);
});

describe("Inventory Cancellation & Double-Restock Prevention Regression Tests", () => {
  async function createVariantWithStock(prefix: string, initialStock: number) {
    const idSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const product = await prisma.product.create({
      data: {
        name: `Inv Prod ${prefix} ${idSuffix}`,
        slug: `inv-${prefix}-${idSuffix}`,
        status: "PUBLISHED",
        variants: {
          create: {
            sku: `SKU-${prefix}-${idSuffix}`,
            size: "Standard",
            costPrice: 10,
            sellingPrice: 25,
          },
        },
      },
      include: { variants: true },
    });
    const variant = product.variants[0];
    if (initialStock > 0) {
      await prisma.inventoryTransaction.create({
        data: {
          variantId: variant.id,
          quantity: initialStock,
          type: "RESTOCK",
          referenceId: `INIT-${idSuffix}`,
          notes: "Initial inventory setup",
        },
      });
    }
    return variant;
  }

  async function createOrderWithSale(
    items: Array<{ variant: { id: string; sku: string }; quantity: number }>,
    orderNumberPrefix: string
  ) {
    const idSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const user = await prisma.user.create({
      data: { email: `inv-user-${idSuffix}@test.local` },
    });

    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-${orderNumberPrefix}-${idSuffix}`,
        customerEmail: user.email,
        userId: user.id,
        status: "DELIVERED",
        paymentStatus: "SUCCESS",
        paymentMethod: "COD",
        taxRate: 0,
        taxIncluded: false,
        shippingCost: 0,
        subtotal: 100,
        taxAmount: 0,
        discount: 0,
        total: 100,
        shippingStreet: "123 Street",
        shippingCity: "City",
        shippingCountry: "Country",
        shippingMethodName: "Standard",
        items: {
          create: items.map((item) => ({
            productName: `Item for ${item.variant.sku}`,
            sku: item.variant.sku,
            unitPrice: 25,
            costPrice: 10,
            appliedDiscount: 0,
            taxRate: 0,
            taxIncluded: false,
            lineSubtotal: 25 * item.quantity,
            discountAmount: 0,
            taxAmount: 0,
            lineTotal: 25 * item.quantity,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true },
    });

    for (const item of items) {
      await prisma.inventoryTransaction.create({
        data: {
          variantId: item.variant.id,
          quantity: -item.quantity,
          type: "SALE",
          referenceId: order.id,
          notes: `Order ${order.id} fulfillment`,
        },
      });
    }

    return { order, user };
  }

  async function completeReturn(
    orderId: string,
    returnItems: Array<{ orderItemId: string; variantId: string; quantity: number }>
  ) {
    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderId,
        status: "COMPLETED",
        reason: "Customer preference",
        items: {
          create: returnItems.map((item) => ({
            orderItemId: item.orderItemId,
            quantity: item.quantity,
          })),
        },
      },
    });

    for (const item of returnItems) {
      await prisma.inventoryTransaction.create({
        data: {
          variantId: item.variantId,
          type: "RETURN",
          quantity: item.quantity,
          referenceId: returnRequest.id,
          notes: `Restock from Return #${returnRequest.id}`,
        },
      });
    }

    return returnRequest;
  }

  async function getVariantStock(variantId: string) {
    const stockAgg = await prisma.inventoryTransaction.aggregate({
      where: { variantId },
      _sum: { quantity: true },
    });
    const reservedAgg = await prisma.inventoryReservation.aggregate({
      where: { variantId, status: "RESERVED", expiresAt: { gt: new Date() } },
      _sum: { quantity: true },
    });
    const physical = Number(stockAgg._sum.quantity || 0);
    const reserved = Number(reservedAgg._sum.quantity || 0);
    return {
      physical,
      reserved,
      available: physical - reserved,
    };
  }

  test("partial return followed by cancellation prevents double-restocking", async () => {
    // 1. Initial stock is 20 units
    const variant = await createVariantWithStock("PARTIAL", 20);
    const initial = await getVariantStock(variant.id);
    expect(initial.physical).toBe(20);

    // 2. Customer buys 5 units -> physical drops to 15
    const { order } = await createOrderWithSale([{ variant, quantity: 5 }], "PARTIAL");
    const afterSale = await getVariantStock(variant.id);
    expect(afterSale.physical).toBe(15);

    // 3. Customer returns 2 units (COMPLETED return) -> physical restored to 17
    await completeReturn(order.id, [
      {
        orderItemId: order.items[0].id,
        variantId: variant.id,
        quantity: 2,
      },
    ]);
    const afterReturn = await getVariantStock(variant.id);
    expect(afterReturn.physical).toBe(17);

    // 4. Order is cancelled -> cancelOrderInventory must restock only 3 units (5 - 2), NOT 5
    await InventoryService.cancelOrderInventory(order.id);

    // 5. Final physical stock must be exactly 20 (NOT 22)
    const afterCancel = await getVariantStock(variant.id);
    expect(afterCancel.physical).toBe(20);
    expect(afterCancel.available).toBe(20);

    // Verify RESTOCK transaction details
    const restocks = await prisma.inventoryTransaction.findMany({
      where: { referenceId: order.id, type: "RESTOCK" },
    });
    expect(restocks).toHaveLength(1);
    expect(restocks[0].quantity).toBe(3);
    expect(restocks[0].variantId).toBe(variant.id);
  }, 30000);

  test("full return followed by cancellation creates no RESTOCK and prevents phantom inventory", async () => {
    // 1. Initial stock is 20 units
    const variant = await createVariantWithStock("FULL", 20);

    // 2. Customer buys 5 units -> stock is 15
    const { order } = await createOrderWithSale([{ variant, quantity: 5 }], "FULL");

    // 3. Customer returns all 5 units -> stock is 20
    await completeReturn(order.id, [
      {
        orderItemId: order.items[0].id,
        variantId: variant.id,
        quantity: 5,
      },
    ]);
    const afterReturn = await getVariantStock(variant.id);
    expect(afterReturn.physical).toBe(20);

    // 4. Order is cancelled -> 0 unreturned units remain
    await InventoryService.cancelOrderInventory(order.id);

    // 5. No RESTOCK transaction created, stock remains 20 (NOT 25)
    const afterCancel = await getVariantStock(variant.id);
    expect(afterCancel.physical).toBe(20);
    expect(afterCancel.available).toBe(20);

    const restocks = await prisma.inventoryTransaction.findMany({
      where: { referenceId: order.id, type: "RESTOCK" },
    });
    expect(restocks).toHaveLength(0);
  }, 30000);

  test("cancellation without returns restocks all sold units accurately", async () => {
    // 1. Initial stock is 20 units
    const variant = await createVariantWithStock("NO-RET", 20);

    // 2. Customer buys 5 units -> stock is 15
    const { order } = await createOrderWithSale([{ variant, quantity: 5 }], "NO-RET");
    const afterSale = await getVariantStock(variant.id);
    expect(afterSale.physical).toBe(15);

    // 3. Cancel order without any returns
    await InventoryService.cancelOrderInventory(order.id);

    // 4. Physical stock fully restored to 20
    const afterCancel = await getVariantStock(variant.id);
    expect(afterCancel.physical).toBe(20);
    expect(afterCancel.available).toBe(20);

    const restocks = await prisma.inventoryTransaction.findMany({
      where: { referenceId: order.id, type: "RESTOCK" },
    });
    expect(restocks).toHaveLength(1);
    expect(restocks[0].quantity).toBe(5);
  }, 30000);

  test("repeated cancellation calls are idempotent and never multiply restocked units", async () => {
    const variant = await createVariantWithStock("IDEMP", 20);
    const { order } = await createOrderWithSale([{ variant, quantity: 5 }], "IDEMP");

    // Return 2 units -> stock is 17
    await completeReturn(order.id, [
      {
        orderItemId: order.items[0].id,
        variantId: variant.id,
        quantity: 2,
      },
    ]);

    // 1st cancellation call -> restocks 3 units -> stock 20
    await InventoryService.cancelOrderInventory(order.id);
    const firstCheck = await getVariantStock(variant.id);
    expect(firstCheck.physical).toBe(20);

    // 2nd cancellation call -> must be a no-op
    await InventoryService.cancelOrderInventory(order.id);
    const secondCheck = await getVariantStock(variant.id);
    expect(secondCheck.physical).toBe(20);

    // 3rd cancellation call -> still a no-op
    await InventoryService.cancelOrderInventory(order.id);
    const thirdCheck = await getVariantStock(variant.id);
    expect(thirdCheck.physical).toBe(20);

    // Verify exactly 1 RESTOCK transaction exists
    const restocks = await prisma.inventoryTransaction.findMany({
      where: { referenceId: order.id, type: "RESTOCK" },
    });
    expect(restocks).toHaveLength(1);
    expect(restocks[0].quantity).toBe(3);
  }, 30000);

  test("multi-item order with mixed return quantities restocks each variant accurately", async () => {
    const variantA = await createVariantWithStock("MULTI-A", 10);
    const variantB = await createVariantWithStock("MULTI-B", 10);
    const variantC = await createVariantWithStock("MULTI-C", 10);

    // Order: A(4 units), B(3 units), C(2 units)
    const { order } = await createOrderWithSale(
      [
        { variant: variantA, quantity: 4 },
        { variant: variantB, quantity: 3 },
        { variant: variantC, quantity: 2 },
      ],
      "MULTI"
    );

    const itemA = order.items.find((i) => i.sku === variantA.sku)!;
    const itemB = order.items.find((i) => i.sku === variantB.sku)!;

    // Return 1 of A, Return all 3 of B, Return 0 of C
    await completeReturn(order.id, [
      { orderItemId: itemA.id, variantId: variantA.id, quantity: 1 },
      { orderItemId: itemB.id, variantId: variantB.id, quantity: 3 },
    ]);

    // Cancel order
    await InventoryService.cancelOrderInventory(order.id);

    // Verify each variant
    // A: 10 initial - 4 sold + 1 returned + 3 cancelled = 10
    const stockA = await getVariantStock(variantA.id);
    expect(stockA.physical).toBe(10);

    // B: 10 initial - 3 sold + 3 returned + 0 cancelled = 10
    const stockB = await getVariantStock(variantB.id);
    expect(stockB.physical).toBe(10);

    // C: 10 initial - 2 sold + 0 returned + 2 cancelled = 10
    const stockC = await getVariantStock(variantC.id);
    expect(stockC.physical).toBe(10);

    // Verify transactions
    const restocks = await prisma.inventoryTransaction.findMany({
      where: { referenceId: order.id, type: "RESTOCK" },
    });
    const restockA = restocks.find((r) => r.variantId === variantA.id);
    const restockB = restocks.find((r) => r.variantId === variantB.id);
    const restockC = restocks.find((r) => r.variantId === variantC.id);

    expect(restockA?.quantity).toBe(3);
    expect(restockB).toBeUndefined(); // Skipped because 0 unreturned
    expect(restockC?.quantity).toBe(2);
  }, 30000);

  test("cancellation of unpaid/reserved order releases reservation without creating RESTOCK", async () => {
    const variant = await createVariantWithStock("UNPAID", 10);

    const user = await prisma.user.create({
      data: { email: `unpaid-${Date.now()}@test.local` },
    });

    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-UNPAID-${Date.now()}`,
        customerEmail: user.email,
        userId: user.id,
        status: "PENDING",
        taxRate: 0,
        taxIncluded: false,
        shippingCost: 0,
        subtotal: 50,
        taxAmount: 0,
        discount: 0,
        total: 50,
        shippingStreet: "123",
        shippingCity: "City",
        shippingCountry: "Country",
        shippingMethodName: "Standard",
        inventoryReservations: {
          create: {
            variantId: variant.id,
            quantity: 3,
            status: "RESERVED",
            expiresAt: new Date(Date.now() + 600000),
          },
        },
      },
      include: { inventoryReservations: true },
    });

    // Before cancel: physical = 10, reserved = 3, available = 7
    const beforeCancel = await getVariantStock(variant.id);
    expect(beforeCancel.physical).toBe(10);
    expect(beforeCancel.reserved).toBe(3);
    expect(beforeCancel.available).toBe(7);

    // Cancel order
    await InventoryService.cancelOrderInventory(order.id);

    // After cancel: reservation RELEASED, physical = 10, reserved = 0, available = 10
    const afterCancel = await getVariantStock(variant.id);
    expect(afterCancel.physical).toBe(10);
    expect(afterCancel.reserved).toBe(0);
    expect(afterCancel.available).toBe(10);

    const restocks = await prisma.inventoryTransaction.findMany({
      where: { referenceId: order.id, type: "RESTOCK" },
    });
    expect(restocks).toHaveLength(0);
  }, 30000);

  test("concurrent cancellation calls on the same order produce exactly one RESTOCK", async () => {
    const variant = await createVariantWithStock("CONCUR", 20);
    const { order } = await createOrderWithSale([{ variant, quantity: 4 }], "CONCUR");

    // Partial return: 1 unit returned -> 3 remain unreturned
    await completeReturn(order.id, [
      {
        orderItemId: order.items[0].id,
        variantId: variant.id,
        quantity: 1,
      },
    ]);

    // Fire 2 concurrent cancellations
    const results = await Promise.allSettled([
      InventoryService.cancelOrderInventory(order.id),
      InventoryService.cancelOrderInventory(order.id),
    ]);

    expect(results.every((r) => r.status === "fulfilled")).toBe(true);

    // Final stock must be exactly 20
    const finalStock = await getVariantStock(variant.id);
    expect(finalStock.physical).toBe(20);
    expect(finalStock.available).toBe(20);

    // Exactly one RESTOCK of 3 units
    const restocks = await prisma.inventoryTransaction.findMany({
      where: { referenceId: order.id, type: "RESTOCK" },
    });
    expect(restocks).toHaveLength(1);
    expect(restocks[0].quantity).toBe(3);
  }, 30000);
});
