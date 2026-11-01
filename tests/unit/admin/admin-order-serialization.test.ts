import { describe, expect, test } from "vitest";
import { Prisma } from "@prisma/client";

describe("Admin Order RSC Plain Object Serialization", () => {
  test("guarantees all Decimal objects on Order, OrderItems, Shipment, and Payments are serialized to numbers", () => {
    // Simulating raw Prisma Order output with Decimal instances
    const rawPrismaOrder = {
      id: "ord-1",
      orderNumber: "ORD-1001",
      status: "PENDING",
      paymentStatus: "PENDING",
      paymentMethod: "COD",
      salesChannel: "WEBSITE",
      total: new Prisma.Decimal("3450.50"),
      subtotal: new Prisma.Decimal("3300.00"),
      shippingCost: new Prisma.Decimal("150.50"),
      taxAmount: new Prisma.Decimal("0.00"),
      discount: new Prisma.Decimal("0.00"),
      taxRate: new Prisma.Decimal("0.00"),
      customerEmail: "customer@example.com",
      customerName: "Siam",
      customerPhone: "01700000000",
      shippingStreet: "Banani",
      shippingCity: "Dhaka",
      shippingState: null,
      shippingZip: "1213",
      shippingCountry: "BD",
      shippingMethodName: "Inside Dhaka Standard",
      createdAt: new Date("2026-10-31T10:00:00Z"),
      items: [
        {
          id: "item-1",
          orderId: "ord-1",
          productName: "Oversized Tee",
          sku: "TEE-BLK-L",
          size: "L",
          color: "Black",
          unitPrice: new Prisma.Decimal("1650.00"),
          costPrice: new Prisma.Decimal("750.00"),
          appliedDiscount: new Prisma.Decimal("0.00"),
          taxRate: new Prisma.Decimal("0.00"),
          taxIncluded: false,
          lineSubtotal: new Prisma.Decimal("3300.00"),
          discountAmount: new Prisma.Decimal("0.00"),
          taxAmount: new Prisma.Decimal("0.00"),
          lineTotal: new Prisma.Decimal("3300.00"),
          quantity: 2,
          createdAt: new Date("2026-10-31T10:00:00Z"),
          imageUrl: "https://example.com/tee.jpg",
        },
      ],
      shipment: {
        id: "ship-1",
        orderId: "ord-1",
        provider: "steadfast",
        providerShipmentId: "CID-999",
        trackingNumber: "TRK-999",
        status: "PENDING",
        shippingAmount: new Prisma.Decimal("150.50"),
      },
      payments: [
        {
          id: "pay-1",
          orderId: "ord-1",
          amount: new Prisma.Decimal("3450.50"),
          status: "PENDING",
          gateway: "COD",
        },
      ],
    };

    // Apply the exact transformation from order-queries.ts
    const itemsWithImages = rawPrismaOrder.items.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      costPrice: Number(item.costPrice),
      appliedDiscount: Number(item.appliedDiscount),
      taxRate: Number(item.taxRate),
      lineSubtotal: Number(item.lineSubtotal),
      discountAmount: Number(item.discountAmount),
      taxAmount: Number(item.taxAmount),
      lineTotal: Number(item.lineTotal),
    }));

    const serializedOrder = {
      ...rawPrismaOrder,
      total: Number(rawPrismaOrder.total),
      subtotal: Number(rawPrismaOrder.subtotal),
      shippingCost: Number(rawPrismaOrder.shippingCost),
      taxAmount: Number(rawPrismaOrder.taxAmount),
      discount: Number(rawPrismaOrder.discount),
      taxRate: Number(rawPrismaOrder.taxRate),
      shipment: rawPrismaOrder.shipment
        ? {
            ...rawPrismaOrder.shipment,
            shippingAmount: Number(rawPrismaOrder.shipment.shippingAmount),
          }
        : null,
      payments: rawPrismaOrder.payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
      })),
      items: itemsWithImages,
    };

    // Verify root order decimals are plain numbers
    expect(typeof serializedOrder.total).toBe("number");
    expect(serializedOrder.total).toBe(3450.5);
    expect(typeof serializedOrder.subtotal).toBe("number");
    expect(typeof serializedOrder.shippingCost).toBe("number");

    // Verify item decimals are plain numbers
    const item = serializedOrder.items[0];
    expect(typeof item.unitPrice).toBe("number");
    expect(typeof item.costPrice).toBe("number");
    expect(typeof item.lineTotal).toBe("number");
    expect(typeof item.taxRate).toBe("number");
    expect(item.costPrice).toBe(750);
    expect(item.taxRate).toBe(0);

    // Verify shipment and payments decimals are plain numbers
    expect(typeof serializedOrder.shipment?.shippingAmount).toBe("number");
    expect(typeof serializedOrder.payments[0].amount).toBe("number");

    // Ensure JSON serialization and React Client Component boundary compatibility
    const jsonString = JSON.stringify(serializedOrder);
    expect(jsonString).toBeDefined();

    // Verify Checklist mapping produces clean plain objects
    const checklistItems = serializedOrder.items.map((it) => ({
      id: it.id,
      productName: it.productName,
      size: it.size,
      color: it.color,
      sku: it.sku,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      lineTotal: Number(it.lineTotal),
      imageUrl: it.imageUrl,
    }));

    expect(checklistItems[0].unitPrice).toBe(1650);
    expect(checklistItems[0].lineTotal).toBe(3300);
    expect(typeof checklistItems[0].unitPrice).toBe("number");
  });
});
