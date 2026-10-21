/* eslint @typescript-eslint/no-require-imports: "off" */
/**
 * Idempotent Staging-Only Shipping Configuration Setup
 *
 * Configures default active shipping zones and methods for Bangladesh delivery:
 * - Inside Dhaka: Standard Delivery (configurable default: 60.00 BDT)
 * - Outside Dhaka: Standard Delivery (configurable default: 120.00 BDT)
 *
 * Safety:
 * - Does NOT modify production databases automatically.
 * - Idempotent: safe to run multiple times without creating duplicate zones or methods.
 */

const { PrismaClient, Prisma } = require("@prisma/client");

const prisma = new PrismaClient();

const INSIDE_DHAKA_COST = process.env.STAGING_INSIDE_DHAKA_COST || "60.00";
const OUTSIDE_DHAKA_COST = process.env.STAGING_OUTSIDE_DHAKA_COST || "120.00";

async function main() {
  const databaseUrl = process.env.DATABASE_URL || "";
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required.");
  }

  // Safety guard: prevent accidental execution against production
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_STAGING_SHIPPING_SEED) {
    throw new Error(
      "Safety guard: Refusing to seed shipping configuration in production environment without explicit ALLOW_STAGING_SHIPPING_SEED=true."
    );
  }

  console.log("Configuring staging shipping zones and methods...");

  // 1. Zone: Inside Dhaka
  let insideDhakaZone = await prisma.shippingZone.findFirst({
    where: { name: "Inside Dhaka" },
  });

  if (!insideDhakaZone) {
    insideDhakaZone = await prisma.shippingZone.create({
      data: {
        name: "Inside Dhaka",
        countries: ["BD"],
      },
    });
    console.log(`Created ShippingZone: Inside Dhaka (${insideDhakaZone.id})`);
  } else {
    // Ensure country list includes BD
    if (!insideDhakaZone.countries.includes("BD")) {
      insideDhakaZone = await prisma.shippingZone.update({
        where: { id: insideDhakaZone.id },
        data: { countries: ["BD"] },
      });
    }
    console.log(`Found existing ShippingZone: Inside Dhaka (${insideDhakaZone.id})`);
  }

  // Method for Inside Dhaka
  const insideDhakaMethod = await prisma.shippingMethod.findFirst({
    where: { zoneId: insideDhakaZone.id, name: "Standard Delivery" },
  });

  if (!insideDhakaMethod) {
    const created = await prisma.shippingMethod.create({
      data: {
        zoneId: insideDhakaZone.id,
        name: "Standard Delivery",
        cost: new Prisma.Decimal(INSIDE_DHAKA_COST),
        isActive: true,
      },
    });
    console.log(`Created ShippingMethod: Standard Delivery (${created.cost} BDT) for Inside Dhaka`);
  } else {
    const updated = await prisma.shippingMethod.update({
      where: { id: insideDhakaMethod.id },
      data: {
        cost: new Prisma.Decimal(INSIDE_DHAKA_COST),
        isActive: true,
      },
    });
    console.log(`Updated ShippingMethod: Standard Delivery (${updated.cost} BDT) for Inside Dhaka`);
  }

  // 2. Zone: Outside Dhaka
  let outsideDhakaZone = await prisma.shippingZone.findFirst({
    where: { name: "Outside Dhaka" },
  });

  if (!outsideDhakaZone) {
    outsideDhakaZone = await prisma.shippingZone.create({
      data: {
        name: "Outside Dhaka",
        countries: ["BD"],
      },
    });
    console.log(`Created ShippingZone: Outside Dhaka (${outsideDhakaZone.id})`);
  } else {
    if (!outsideDhakaZone.countries.includes("BD")) {
      outsideDhakaZone = await prisma.shippingZone.update({
        where: { id: outsideDhakaZone.id },
        data: { countries: ["BD"] },
      });
    }
    console.log(`Found existing ShippingZone: Outside Dhaka (${outsideDhakaZone.id})`);
  }

  // Method for Outside Dhaka
  const outsideDhakaMethod = await prisma.shippingMethod.findFirst({
    where: { zoneId: outsideDhakaZone.id, name: "Standard Delivery" },
  });

  if (!outsideDhakaMethod) {
    const created = await prisma.shippingMethod.create({
      data: {
        zoneId: outsideDhakaZone.id,
        name: "Standard Delivery",
        cost: new Prisma.Decimal(OUTSIDE_DHAKA_COST),
        isActive: true,
      },
    });
    console.log(
      `Created ShippingMethod: Standard Delivery (${created.cost} BDT) for Outside Dhaka`
    );
  } else {
    const updated = await prisma.shippingMethod.update({
      where: { id: outsideDhakaMethod.id },
      data: {
        cost: new Prisma.Decimal(OUTSIDE_DHAKA_COST),
        isActive: true,
      },
    });
    console.log(
      `Updated ShippingMethod: Standard Delivery (${updated.cost} BDT) for Outside Dhaka`
    );
  }

  console.log("Staging shipping configuration completed successfully.");
}

main()
  .catch((error) => {
    console.error("Error configuring staging shipping:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
