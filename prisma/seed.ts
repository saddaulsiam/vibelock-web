import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding development database...");

  // Create minimal required development data here.
  // DO NOT use production credentials or customer data.

  // 1. Categories
  const categoryShirts = await prisma.category.upsert({
    where: { slug: "shirts" },
    update: {},
    create: {
      name: "Shirts",
      slug: "shirts",
      description: "Cool t-shirts",
    },
  });

  // 2. Shipping Zone & Method
  const bdZone = await prisma.shippingZone.create({
    data: {
      name: "Bangladesh",
      countries: ["BD"],
      methods: {
        create: [
          {
            name: "Standard Delivery",
            cost: 60.0,
            isActive: true,
          },
        ],
      },
    },
  });

  // 3. Admin User (Development only)
  const admin = await prisma.user.upsert({
    where: { email: "admin@dev.local" },
    update: {},
    create: {
      email: "admin@dev.local",
      name: "Dev Admin",
      role: "ADMIN",
    },
  });

  // 4. Sample Product
  const product = await prisma.product.upsert({
    where: { slug: "dev-cool-shirt" },
    update: {},
    create: {
      name: "Dev Cool Shirt",
      slug: "dev-cool-shirt",
      description: "A nice shirt for development",
      status: "PUBLISHED",
      categories: {
        connect: [{ id: categoryShirts.id }],
      },
      variants: {
        create: [
          {
            sku: "DEV-SHIRT-M-BLK",
            size: "M",
            color: "Black",
            costPrice: 250.0,
            sellingPrice: 500.0,
          },
        ],
      },
    },
  });

  console.log("Created category:", categoryShirts.name);
  console.log("Created shipping zone:", bdZone.name);
  console.log("Created admin:", admin.email);
  console.log("Created product:", product.slug);

  console.log("Development database seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
