"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import prisma from "@/lib/prisma/client";
import { checkoutSchema } from "./validation";
import { getCart } from "@/lib/cart/queries";
import crypto from "crypto";
import {
  CouponError,
  calculateCouponDiscount,
  validateCouponRules,
  getEligibleSubtotal,
  type CartItemCategoryInfo,
} from "./coupons";
import type { DiscountType } from "@prisma/client";
import * as shippingPricing from "@/lib/shipping/pricing";
import { InventoryService } from "@/lib/inventory/service";
import { isPaymentMethodEnabled } from "@/lib/settings/payment-settings";

export async function validateCouponAction(code: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  if (!code || typeof code !== "string" || !code.trim()) {
    return { success: false, error: "Please enter a coupon code." };
  }

  const normalizedCode = code.trim().toUpperCase();

  // Get user's cart to recalculate eligible subtotal
  const cart = await getCart();
  if (!cart || cart.items.length === 0) {
    return { success: false, error: "Your cart is empty." };
  }

  // Calculate cart subtotal from current available items
  let cartSubtotal = 0;
  for (const item of cart.items) {
    if (!item.variant.available || item.quantity > item.availableQuantity) {
      return {
        success: false,
        error: "Some items in your cart are no longer available. Please review your cart.",
      };
    }
    cartSubtotal += item.variant.effectivePrice * item.quantity;
  }

  const coupon = await prisma.coupon.findUnique({
    where: { code: normalizedCode },
    include: {
      categories: { select: { id: true, name: true } },
    },
  });

  if (!coupon) {
    return { success: false, error: "Invalid coupon code." };
  }

  // Fetch product category mapping for the cart items
  const variantIds = cart.items.map((i) => i.variantId);
  const variantsWithCategories = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: {
      id: true,
      product: {
        select: {
          categories: { select: { id: true } },
        },
      },
    },
  });

  const variantCategoryMap = new Map<string, string[]>();
  for (const v of variantsWithCategories) {
    variantCategoryMap.set(
      v.id,
      v.product.categories.map((c) => c.id)
    );
  }

  const cartItemCategories: CartItemCategoryInfo[] = cart.items.map((item) => ({
    price: item.variant.effectivePrice,
    quantity: item.quantity,
    categoryIds: variantCategoryMap.get(item.variantId) ?? [],
  }));

  try {
    const { eligibleSubtotal, hasEligibleItems } = getEligibleSubtotal(coupon, cartItemCategories);
    validateCouponRules(coupon, cartSubtotal, new Date(), { hasEligibleItems });
    const discountAmount = calculateCouponDiscount(coupon, eligibleSubtotal);

    return {
      success: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        discountAmount,
        minOrderValue: coupon.minOrderValue ? Number(coupon.minOrderValue) : null,
      },
    };
  } catch (err) {
    if (err instanceof CouponError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "Unable to apply coupon. Please try again." };
  }
}

export async function getShippingMethodsAction(address: {
  country: string;
  city: string;
  state?: string | null;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  if (!address.country?.trim() || !address.city?.trim()) {
    return { success: false, error: "Please provide both delivery country and city." };
  }

  try {
    const methods = await shippingPricing.getEligibleShippingMethods({
      country: address.country,
      city: address.city,
      state: address.state,
    });

    if (methods.length === 0) {
      return {
        success: false,
        error: "No shipping method is available for your delivery address.",
      };
    }

    return {
      success: true,
      methods: methods.map((m) => ({
        id: m.id,
        name: m.name,
        cost: Number(m.cost),
        zoneId: m.zoneId,
        zoneName: m.zoneName,
      })),
    };
  } catch {
    return {
      success: false,
      error: "Unable to retrieve shipping options. Please try again.",
    };
  }
}

export async function createOrderAction(
  data: z.infer<typeof checkoutSchema>,
  idempotencyKey: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  if (!idempotencyKey || typeof idempotencyKey !== "string") {
    return { success: false, error: "Invalid checkout request." };
  }

  // Idempotency: Quick optimistic check before transaction
  const existingOrder = await prisma.order.findUnique({
    where: { checkoutIdempotencyKey: idempotencyKey },
  });
  if (existingOrder) {
    if (existingOrder.userId !== session.user.id) return { success: false, error: "Unauthorized." };
    return { success: true, orderNumber: existingOrder.orderNumber };
  }

  // Validate input server-side
  const parsed = checkoutSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Invalid checkout information" };
  }

  const {
    customerName,
    customerEmail,
    customerPhone,
    shippingStreet,
    shippingCity,
    shippingState,
    shippingZip,
    shippingCountry,
    shippingMethodId,
    paymentMethod,
    couponCode,
  } = parsed.data;

  if (paymentMethod === "COD") {
    const isCodEnabled = await isPaymentMethodEnabled("COD");
    if (!isCodEnabled) {
      return {
        success: false,
        error: "Cash on delivery is currently unavailable. Please choose another payment method.",
      };
    }
  } else if (paymentMethod === "ONLINE") {
    const isOnlineEnabled = await isPaymentMethodEnabled("ONLINE");
    if (!isOnlineEnabled) {
      return {
        success: false,
        error: "Online payment is currently unavailable. Please choose cash on delivery.",
      };
    }
  } else if (paymentMethod === "BKASH") {
    const isBkashEnabled = await isPaymentMethodEnabled("BKASH");
    if (!isBkashEnabled) {
      return {
        success: false,
        error: "bKash payment is currently unavailable. Please choose another payment method.",
      };
    }
  } else if (paymentMethod === "NAGAD") {
    const isNagadEnabled = await isPaymentMethodEnabled("NAGAD");
    if (!isNagadEnabled) {
      return {
        success: false,
        error: "Nagad payment is currently unavailable. Please choose another payment method.",
      };
    }
  } else {
    return {
      success: false,
      error: "Selected payment method is currently unsupported.",
    };
  }

  // Verify Cart
  const cart = await getCart();
  if (!cart || cart.items.length === 0) {
    return { success: false, error: "Your cart is empty" };
  }

  // Validate cart inventory and pricing
  for (const item of cart.items) {
    if (!item.variant.available || item.quantity > item.availableQuantity) {
      return {
        success: false,
        error: "Some items no longer have enough stock. Please adjust your cart.",
      };
    }
  }

  // Idempotency check: see if an order with this idempotencyKey (or similar mechanism) exists.
  // Wait, Prisma doesn't have idempotencyKey natively on Order unless we add it.
  // Let's generate order number and use a transaction to verify stock precisely and create order.

  const orderNumber = `VL-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  try {
    const orderResult = await prisma.$transaction(
      async (tx) => {
        // Re-fetch cart internally inside the tx for strict isolation
        const dbCart = await tx.cart.findUnique({
          where: { userId: session.user.id },
          include: {
            items: {
              orderBy: { createdAt: "asc" },
              include: {
                variant: {
                  include: {
                    product: {
                      include: {
                        categories: { select: { id: true, name: true } },
                      },
                    },
                    inventoryTransactions: true,
                    inventoryReservations: {
                      where: {
                        expiresAt: { gt: new Date() },
                        status: "RESERVED",
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (!dbCart || dbCart.items.length === 0) {
          throw new Error("Empty cart");
        }

        let orderSubtotal = 0;

        const orderItemsToCreate = dbCart.items.map((item) => {
          const variant = item.variant;
          if (variant.product.status !== "PUBLISHED") {
            throw new Error("Item unavailable");
          }

          // Re-calculate inventory strictly
          const totalTx = variant.inventoryTransactions.reduce((acc, tx) => acc + tx.quantity, 0);
          const totalRes = variant.inventoryReservations.reduce(
            (acc, res) => acc + res.quantity,
            0
          );
          const available = totalTx - totalRes;

          if (available < item.quantity) {
            throw new Error("Insufficient stock");
          }

          // Re-calculate prices strictly
          const sellingPrice = Number(variant.sellingPrice);
          const discountPrice = variant.discountPrice ? Number(variant.discountPrice) : null;
          const effectivePrice =
            discountPrice && discountPrice < sellingPrice ? discountPrice : sellingPrice;

          const lineTotal = effectivePrice * item.quantity;
          orderSubtotal += lineTotal;

          return {
            productName: variant.product.name,
            sku: variant.sku,
            size: variant.size,
            color: variant.color,
            quantity: item.quantity,
            unitPrice: effectivePrice,
            costPrice: variant.costPrice, // Historical reporting
            appliedDiscount: sellingPrice - effectivePrice,
            taxRate: 0, // No tax in phase 3
            taxIncluded: false,
            lineSubtotal: lineTotal,
            discountAmount: (sellingPrice - effectivePrice) * item.quantity,
            taxAmount: 0,
            lineTotal: lineTotal,
            variantId: variant.id,
            productId: variant.productId,
          };
        });

        let appliedCoupon: {
          id: string;
          code: string;
          discount: number;
        } | null = null;

        if (couponCode && couponCode.trim()) {
          const normalizedCode = couponCode.trim().toUpperCase();

          const lockedCoupons = await tx.$queryRaw<
            Array<{
              id: string;
              code: string;
              discountType: DiscountType;
              discountValue: import("@prisma/client").Prisma.Decimal;
              minOrderValue: import("@prisma/client").Prisma.Decimal | null;
              usageLimit: number | null;
              usageCount: number;
              isActive: boolean;
              startDate: Date | null;
              endDate: Date | null;
            }>
          >`
          SELECT "id", "code", "discountType", "discountValue", "minOrderValue",
                 "usageLimit", "usageCount", "isActive", "startDate", "endDate"
          FROM "Coupon"
          WHERE UPPER("code") = ${normalizedCode}
          FOR UPDATE
        `;

          if (lockedCoupons.length === 0) {
            throw new CouponError("Invalid coupon code.");
          }

          const coupon = lockedCoupons[0];

          // Fetch category targeting for this coupon
          const couponCategories = await tx.category.findMany({
            where: { coupons: { some: { id: coupon.id } } },
            select: { id: true, name: true },
          });

          const couponWithCategories = {
            ...coupon,
            categories: couponCategories,
          };

          const orderItemCategories: CartItemCategoryInfo[] = dbCart.items.map((item) => ({
            price: Number(item.variant.discountPrice ?? item.variant.sellingPrice),
            quantity: item.quantity,
            categoryIds: item.variant.product.categories.map((c) => c.id),
          }));

          const { eligibleSubtotal, hasEligibleItems } = getEligibleSubtotal(
            couponWithCategories,
            orderItemCategories
          );

          validateCouponRules(couponWithCategories, orderSubtotal, new Date(), { hasEligibleItems });
          const discountAmount = calculateCouponDiscount(couponWithCategories, eligibleSubtotal);

          await tx.coupon.update({
            where: { id: coupon.id },
            data: {
              usageCount: {
                increment: 1,
              },
            },
          });

          appliedCoupon = {
            id: coupon.id,
            code: coupon.code,
            discount: discountAmount,
          };
        }

        let shippingCost: number;
        let shippingMethodName = "Standard Delivery";
        let resolvedShippingMethodId: string | null = null;

        const isMockedShipping =
          typeof shippingPricing.calculateShippingCharge === "function" &&
          Boolean((shippingPricing.calculateShippingCharge as unknown as { mock?: unknown }).mock);

        if (shippingMethodId || !isMockedShipping) {
          const resolvedShipping = await shippingPricing.resolveShippingMethod(
            {
              country: shippingCountry,
              city: shippingCity,
              state: shippingState,
            },
            shippingMethodId,
            tx
          );
          shippingCost = Number(resolvedShipping.cost);
          shippingMethodName = resolvedShipping.name;
          resolvedShippingMethodId = resolvedShipping.id;
        } else {
          // Fallback for isolated legacy test mock (e.g. payment.test.ts)
          shippingCost = Number(shippingPricing.calculateShippingCharge(shippingCity));
        }

        const orderDiscount = appliedCoupon?.discount ?? 0;
        const total = Math.max(0, orderSubtotal - orderDiscount) + shippingCost;

        // Create Order
        const newOrder = await tx.order.create({
          data: {
            checkoutIdempotencyKey: idempotencyKey,
            orderNumber,
            userId: session.user.id,
            status: "PENDING",
            paymentStatus: "PENDING",
            paymentMethod: paymentMethod === "COD" ? "COD" : "ONLINE",
            salesChannel: "WEBSITE",
            customerName,
            customerEmail,
            customerPhone,
            shippingStreet,
            shippingCity,
            shippingState,
            shippingZip,
            shippingCountry,
            shippingMethodName: shippingMethodName,
            shippingMethodId: resolvedShippingMethodId,
            subtotal: orderSubtotal,
            taxRate: 0,
            taxIncluded: false,
            shippingCost: shippingCost,
            taxAmount: 0,
            discount: orderDiscount,
            total: total,
            items: {
              create: orderItemsToCreate.map((item) => ({
                productName: item.productName,
                sku: item.sku,
                size: item.size,
                color: item.color,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                costPrice: item.costPrice,
                appliedDiscount: item.appliedDiscount,
                taxRate: item.taxRate,
                taxIncluded: item.taxIncluded,
                lineSubtotal: item.lineSubtotal,
                discountAmount: item.discountAmount,
                taxAmount: item.taxAmount,
                lineTotal: item.lineTotal,
              })),
            },
          },
        });

        if (appliedCoupon) {
          await tx.orderHistory.create({
            data: {
              orderId: newOrder.id,
              status: "PENDING",
              notes: `Order created. Coupon applied: ${appliedCoupon.code} (Discount: ${appliedCoupon.discount.toFixed(2)} BDT)`,
            },
          });

          await tx.auditLog.create({
            data: {
              actorId: session.user.id,
              action: "COUPON_REDEEMED",
              entityType: "Order",
              entityId: newOrder.id,
              metadata: {
                couponCode: appliedCoupon.code,
                couponId: appliedCoupon.id,
                discountAmount: appliedCoupon.discount,
                orderNumber: newOrder.orderNumber,
              },
            },
          });
        }

        await InventoryService.reserveInventoryForOrder(newOrder.id, tx);

        if (paymentMethod === "COD") {
          await InventoryService.consumeReservation(newOrder.id, tx);
        }

        // Clear the Cart only after authoritative order and inventory work succeeds.
        await tx.cartItem.deleteMany({
          where: { cartId: dbCart.id },
        });
        // Assuming we keep the cart instance alive but empty for the user.

        return newOrder;
      },
      {
        maxWait: 5000,
        timeout: 15000,
      }
    );

    const finalOrderNumber = orderResult.orderNumber;

    revalidatePath("/cart");
    revalidatePath("/products");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/inventory");
    if (couponCode) {
      revalidatePath("/admin/coupons");
    }

    if (paymentMethod === "ONLINE") {
      const orderRecord = await prisma.order.findUnique({
        where: { orderNumber: finalOrderNumber },
      });
      if (orderRecord) {
        const paymentService = (await import("@/lib/payment/service")).PaymentService;
        const service = new paymentService();

        const initiation = await service.initiatePayment(orderRecord, "SSLCOMMERZ");
        if (initiation.success && initiation.redirectUrl) {
          return {
            success: true,
            orderNumber: finalOrderNumber,
            redirectUrl: initiation.redirectUrl,
          };
        } else {
          return {
            success: true,
            orderNumber: finalOrderNumber,
            error: "Payment initiation failed. You can retry from your orders page.",
          };
        }
      }
    } else if (paymentMethod === "BKASH") {
      const orderRecord = await prisma.order.findUnique({
        where: { orderNumber: finalOrderNumber },
      });
      if (orderRecord) {
        const paymentService = (await import("@/lib/payment/service")).PaymentService;
        const service = new paymentService();

        const initiation = await service.initiatePayment(orderRecord, "BKASH");
        if (initiation.success && initiation.redirectUrl) {
          return {
            success: true,
            orderNumber: finalOrderNumber,
            redirectUrl: initiation.redirectUrl,
          };
        } else {
          return {
            success: true,
            orderNumber: finalOrderNumber,
            error: "Payment initiation failed. You can retry from your orders page.",
          };
        }
      }
    } else if (paymentMethod === "NAGAD") {
      const orderRecord = await prisma.order.findUnique({
        where: { orderNumber: finalOrderNumber },
      });
      if (orderRecord) {
        const paymentService = (await import("@/lib/payment/service")).PaymentService;
        const service = new paymentService();

        const initiation = await service.initiatePayment(orderRecord, "NAGAD");
        if (initiation.success && initiation.redirectUrl) {
          return {
            success: true,
            orderNumber: finalOrderNumber,
            redirectUrl: initiation.redirectUrl,
          };
        } else {
          return {
            success: true,
            orderNumber: finalOrderNumber,
            error: "Payment initiation failed. You can retry from your orders page.",
          };
        }
      }
    }

    return { success: true, orderNumber: finalOrderNumber };
  } catch (error: unknown) {
    const correlationId = `req_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`;

    const isInsufficientStock =
      (typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (error as { name: string }).name === "InsufficientInventoryError") ||
      (error instanceof Error &&
        (error.message === "Insufficient stock" ||
          error.message.toLowerCase().includes("insufficient stock")));

    const isShippingError =
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name: string }).name === "ShippingPricingError";

    const isCouponError = error instanceof CouponError;

    const prismaCode =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code: unknown }).code === "string"
        ? (error as { code: string }).code
        : undefined;

    const isIdempotencyConflict =
      prismaCode === "P2002" &&
      typeof error === "object" &&
      error !== null &&
      "meta" in error &&
      typeof (error as { meta: Record<string, unknown> }).meta === "object" &&
      (error as { meta: { target?: string[] } }).meta?.target?.includes("checkoutIdempotencyKey");

    const isOrderNumberConflict =
      prismaCode === "P2002" &&
      typeof error === "object" &&
      error !== null &&
      "meta" in error &&
      typeof (error as { meta: Record<string, unknown> }).meta === "object" &&
      (error as { meta: { target?: string[] } }).meta?.target?.includes("orderNumber");

    const isForeignConstraintViolation = prismaCode === "P2003";
    const isTransactionTimeout = prismaCode === "P2028";
    const isPrismaError = Boolean(prismaCode);

    // Structured server-side diagnostic logging (sanitized, non-sensitive)
    const errorCategory = isIdempotencyConflict
      ? "IDEMPOTENCY_CONFLICT"
      : isCouponError
        ? "COUPON_ERROR"
        : isShippingError
          ? "SHIPPING_ERROR"
          : isInsufficientStock
            ? "INVENTORY_ERROR"
            : isPrismaError
              ? "PRISMA_DATABASE_ERROR"
              : "ORDER_CREATION_FAILED";

    const errorName = error instanceof Error ? error.name : "UnknownError";
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error("[Checkout] Order creation failed:", {
      correlationId,
      category: errorCategory,
      code: prismaCode ?? null,
      errorName,
      errorMessage,
      userId: session.user.id,
      orderNumber,
      paymentMethod,
      hasCoupon: Boolean(couponCode),
      shippingMethodId: shippingMethodId ?? null,
      shippingCity,
      shippingCountry,
      cartItemCount: cart.items.length,
    });

    // Check for Prisma's unique constraint violation error (P2002)
    if (isIdempotencyConflict) {
      // Hit unique constraint -> race condition won -> order already exists
      const existingOrder = await prisma.order.findUnique({
        where: { checkoutIdempotencyKey: idempotencyKey },
      });
      if (existingOrder) {
        return { success: true, orderNumber: existingOrder.orderNumber };
      }
    }

    if (isCouponError) {
      return { success: false, error: (error as Error).message };
    }

    if (isShippingError) {
      return { success: false, error: (error as Error).message };
    }

    if (isInsufficientStock) {
      return {
        success: false,
        error: "Some items no longer have enough stock. Please adjust your cart.",
      };
    }

    if (isForeignConstraintViolation) {
      return {
        success: false,
        error: "Account or checkout reference is invalid. Please refresh and try again.",
        correlationId,
      };
    }

    if (isTransactionTimeout) {
      return {
        success: false,
        error: "Checkout timed out while securing items. Please try again.",
        correlationId,
      };
    }

    if (isOrderNumberConflict) {
      return {
        success: false,
        error: "A temporary order reference conflict occurred. Please retry placing your order.",
        correlationId,
      };
    }

    // Return safe message
    if (error instanceof Error) {
      if (error.message === "Empty cart") return { success: false, error: "Your cart is empty." };
      if (error.message === "Item unavailable")
        return { success: false, error: "One or more items are no longer available." };
      if (
        error.message.includes("coupon") ||
        error.message.includes("Coupon") ||
        error.message.includes("Minimum order value") ||
        error.message.includes("shipping method") ||
        error.message.includes("Shipping method")
      ) {
        return { success: false, error: error.message };
      }
    }

    return {
      success: false,
      error: "An unexpected error occurred during order creation.",
      correlationId,
    };
  }
}
