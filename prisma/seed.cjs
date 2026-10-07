/* eslint @typescript-eslint/no-require-imports: "off" */
const { PrismaClient, ProductStatus } = require("@prisma/client");

const prisma = new PrismaClient();

const categories = [
  { name: "T-Shirts", slug: "t-shirts", description: "Everyday VibeLock tees." },
  { name: "Shirts", slug: "shirts", description: "Casual and smart VibeLock shirts." },
  { name: "Pants", slug: "pants", description: "Comfortable bottoms for daily wear." },
  { name: "Shorts", slug: "shorts", description: "Easy shorts for warm days." },
];

const products = [
  {
    name: "Essential Oversized Tee",
    slug: "essential-oversized-tee",
    category: "t-shirts",
    description:
      "A relaxed, heavyweight cotton tee with a dropped shoulder and an easy everyday fit.",
    status: ProductStatus.PUBLISHED,
    sellingPrice: "990.00",
    discountPrice: "850.00",
    variants: [
      { size: "M", color: "Black", stock: 20 },
      { size: "L", color: "Black", stock: 15 },
      { size: "XL", color: "White", stock: 10 },
    ],
  },
  {
    name: "Urban Heavyweight Tee",
    slug: "urban-heavyweight-tee",
    category: "t-shirts",
    description: "A substantial cotton jersey tee made for a structured streetwear silhouette.",
    status: ProductStatus.PUBLISHED,
    sellingPrice: "1290.00",
    discountPrice: null,
    variants: [
      { size: "S", color: "Charcoal", stock: 10 },
      { size: "L", color: "Charcoal", stock: 25 },
      { size: "XL", color: "Navy", stock: 15 },
    ],
  },
  {
    name: "Core Relaxed Tee",
    slug: "core-relaxed-tee",
    category: "t-shirts",
    description:
      "A soft, breathable relaxed-fit tee with a clean neckline and minimal VibeLock detailing.",
    status: ProductStatus.PUBLISHED,
    sellingPrice: "790.00",
    discountPrice: "690.00",
    variants: [
      { size: "M", color: "White", stock: 2 },
      { size: "L", color: "Olive", stock: 15 },
      { size: "XXL", color: "Black", stock: 5 },
    ],
  },
  {
    name: "Minimal Oxford Shirt",
    slug: "minimal-oxford-shirt",
    category: "shirts",
    description:
      "A versatile cotton Oxford with a button front, neat collar, and comfortable regular fit.",
    status: ProductStatus.PUBLISHED,
    sellingPrice: "1790.00",
    discountPrice: "1590.00",
    variants: [
      { size: "M", color: "White", stock: 10 },
      { size: "L", color: "Navy", stock: 10 },
      { size: "XL", color: "Beige", stock: 5 },
    ],
  },
  {
    name: "Dhaka Casual Shirt",
    slug: "dhaka-casual-shirt",
    category: "shirts",
    description: "A lightweight casual shirt with an airy feel, made for long days in the city.",
    status: ProductStatus.PUBLISHED,
    sellingPrice: "1490.00",
    discountPrice: null,
    variants: [
      { size: "S", color: "Beige", stock: 10 },
      { size: "M", color: "Navy", stock: 20 },
      { size: "L", color: "Olive", stock: 10 },
    ],
  },
  {
    name: "Utility Overshirt",
    slug: "utility-overshirt",
    category: "shirts",
    description:
      "A versatile midweight layer with practical chest pockets and room for easy layering.",
    status: ProductStatus.PUBLISHED,
    sellingPrice: "1990.00",
    discountPrice: "1790.00",
    variants: [
      { size: "M", color: "Olive", stock: 5 },
      { size: "L", color: "Olive", stock: 10 },
      { size: "XL", color: "Charcoal", stock: 5 },
    ],
  },
  {
    name: "Dhaka Utility Pants",
    slug: "dhaka-utility-pants",
    category: "pants",
    description: "Everyday straight-leg pants with useful pockets and a comfortable cotton blend.",
    status: ProductStatus.PUBLISHED,
    sellingPrice: "1890.00",
    discountPrice: null,
    variants: [
      { size: "S", color: "Black", stock: 10 },
      { size: "M", color: "Olive", stock: 15 },
      { size: "L", color: "Black", stock: 10 },
    ],
  },
  {
    name: "Everyday Cargo Pants",
    slug: "everyday-cargo-pants",
    category: "pants",
    description: "Relaxed cargo pants with practical side pockets and an adjustable everyday fit.",
    status: ProductStatus.PUBLISHED,
    sellingPrice: "1990.00",
    discountPrice: "1850.00",
    variants: [
      { size: "M", color: "Charcoal", stock: 15 },
      { size: "L", color: "Olive", stock: 20 },
      { size: "XL", color: "Beige", stock: 10 },
    ],
  },
  {
    name: "Street Fit Shorts",
    slug: "street-fit-shorts",
    category: "shorts",
    description: "Easygoing cotton shorts with a clean streetwear fit and practical pockets.",
    status: ProductStatus.PUBLISHED,
    sellingPrice: "990.00",
    discountPrice: "890.00",
    variants: [
      { size: "M", color: "Black", stock: 15 },
      { size: "L", color: "Beige", stock: 10 },
      { size: "XL", color: "Navy", stock: 5 },
    ],
  },
  {
    name: "Essential Relaxed Shorts",
    slug: "essential-relaxed-shorts",
    category: "shorts",
    description: "Light, relaxed shorts designed for everyday comfort through warmer weather.",
    status: ProductStatus.PUBLISHED,
    sellingPrice: "890.00",
    discountPrice: null,
    variants: [
      { size: "S", color: "Charcoal", stock: 10 },
      { size: "M", color: "Black", stock: 0 },
      { size: "L", color: "Olive", stock: 10 },
    ],
  },
  {
    name: "Studio Sample Tee",
    slug: "studio-sample-tee",
    category: "t-shirts",
    description: "An unpublished catalog sample reserved for checking draft-product visibility.",
    status: ProductStatus.DRAFT,
    sellingPrice: "990.00",
    discountPrice: null,
    variants: [{ size: "M", color: "Charcoal", stock: 10 }],
  },
];

function assertDevelopmentDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required to seed the development catalog.");

  const databaseName = decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\//, ""));
  if (databaseName !== "vibelock") {
    throw new Error(
      `Refusing to seed database '${databaseName}'. Only the normal 'vibelock' database is allowed.`
    );
  }
}

async function main() {
  assertDevelopmentDatabase();
  console.log("Seeding VibeLock catalog in the verified vibelock development database...");

  const categoryBySlug = new Map();
  for (const category of categories) {
    const saved = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description },
      create: category,
    });
    categoryBySlug.set(category.slug, saved.id);
  }

  for (let productIndex = 0; productIndex < products.length; productIndex++) {
    const productData = products[productIndex];
    const categoryId = categoryBySlug.get(productData.category);
    if (!categoryId) throw new Error(`Missing seeded category ${productData.category}.`);

    const product = await prisma.product.upsert({
      where: { slug: productData.slug },
      update: {
        name: productData.name,
        description: productData.description,
        status: productData.status,
        categories: { set: [{ id: categoryId }] },
      },
      create: {
        name: productData.name,
        slug: productData.slug,
        description: productData.description,
        status: productData.status,
        categories: { connect: [{ id: categoryId }] },
      },
    });

    const imageIds = [
      "cld-sample",
      "cld-sample-2",
      "cld-sample-3",
      "cld-sample-4",
      "cld-sample-5",
      "cld-sample-6",
      "cld-sample-7",
      "cld-sample-8",
    ];
    const imageId = imageIds[productIndex % imageIds.length];
    const imageUrl = `https://res.cloudinary.com/demo/image/upload/c_fill,w_900,h_1100,q_auto,f_auto/${imageId}.jpg`;
    const image = await prisma.productImage.findFirst({
      where: { productId: product.id, isPrimary: true },
    });
    if (image) {
      await prisma.productImage.update({
        where: { id: image.id },
        data: { url: imageUrl, alt: `${productData.name} by VibeLock`, isPrimary: true },
      });
    } else {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: imageUrl,
          alt: `${productData.name} by VibeLock`,
          isPrimary: true,
        },
      });
    }

    for (const variantData of productData.variants) {
      const sku = `VBL-${productData.slug.toUpperCase().replace(/-/g, "-")}-${variantData.size}-${variantData.color.toUpperCase()}`;
      const variant = await prisma.productVariant.upsert({
        where: { sku },
        update: {
          productId: product.id,
          size: variantData.size,
          color: variantData.color,
          costPrice: "450.00",
          sellingPrice: productData.sellingPrice,
          discountPrice: productData.discountPrice,
        },
        create: {
          productId: product.id,
          sku,
          size: variantData.size,
          color: variantData.color,
          costPrice: "450.00",
          sellingPrice: productData.sellingPrice,
          discountPrice: productData.discountPrice,
        },
      });

      const referenceId = `vibelock-dev-catalog-${productData.slug}-${variantData.size.toLowerCase()}-${variantData.color.toLowerCase()}`;
      const existingRestock = await prisma.inventoryTransaction.findFirst({
        where: { type: "RESTOCK", referenceId, variantId: variant.id },
      });
      if (existingRestock) {
        await prisma.inventoryTransaction.update({
          where: { id: existingRestock.id },
          data: { quantity: variantData.stock, notes: "Idempotent development catalog stock." },
        });
      } else {
        await prisma.inventoryTransaction.create({
          data: {
            variantId: variant.id,
            type: "RESTOCK",
            quantity: variantData.stock,
            referenceId,
            notes: "Idempotent development catalog stock.",
          },
        });
      }
    }
  }

  console.log(
    `Seeded ${categories.length} categories and ${products.length} products (${products.filter((p) => p.status === ProductStatus.PUBLISHED).length} published).`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
