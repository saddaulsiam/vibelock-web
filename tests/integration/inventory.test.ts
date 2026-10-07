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
  });
});
