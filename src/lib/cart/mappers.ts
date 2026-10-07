import { Cart, CartItem, ProductVariant, Product, ProductImage } from "@prisma/client";
import { CartDTO, CartItemDTO } from "./types";
import { mapVariant } from "@/lib/catalog/mappers";

// The full Prisma return type needed to map a cart
export type PrismaCartWithIncludes = Cart & {
  items: (CartItem & {
    variant: ProductVariant & {
      product: Product & {
        images: ProductImage[];
      };
      inventoryTransactions?: { quantity: number }[];
      inventoryReservations?: { quantity: number; expiresAt: Date }[];
    };
  })[];
};

export function mapCart(cart: PrismaCartWithIncludes): CartDTO {
  const items: CartItemDTO[] = cart.items.map((item) => {
    // Cast explicitly to whatever mapVariant accepts, since Prisma matches our schema
    const variantSummary = mapVariant(
      item.variant as unknown as PrismaCartWithIncludes["items"][number]["variant"]
    );
    const primaryImage =
      item.variant.product.images.find((img) => img.isPrimary) ||
      item.variant.product.images[0] ||
      null;

    // Check if the requested quantity exceeds the currently available quantity
    // But mapVariant doesn't return exact quantity, it returns boolean available.
    // Wait, the prompt states we should evaluate exact quantity if needed, but we can just use the bool for now or recalculate.
    // Let's recalculate the exact available stock safely.
    let availableQuantity = 0;
    if (item.variant.inventoryTransactions && item.variant.inventoryReservations) {
      const totalStock = item.variant.inventoryTransactions.reduce(
        (sum, tx) => sum + tx.quantity,
        0
      );
      const now = new Date();
      const reserved = item.variant.inventoryReservations.reduce((sum, r) => {
        if (r.expiresAt > now) {
          return sum + r.quantity;
        }
        return sum;
      }, 0);
      availableQuantity = totalStock - reserved;
    }

    // Force clamp the quantity for the DTO if it exceeds physical availability
    // Or we expose exactly what they have in cart, and let the UI show "Unavailable/Insufficient"
    // The prompt says: "Prefer returning deterministic state... UI can ask the user to adjust."
    // Actually, we'll just map the existing quantity, and the UI will evaluate it against `variantSummary.available` (boolean for now, but really needs exact stock if quantity > 1).
    // Let's add availableQuantity to the DTO locally.

    return {
      id: item.id,
      variantId: item.variant.id,
      quantity: item.quantity,
      variant: {
        ...variantSummary,
        // Hack: append availableQuantity to the variant summary just for cart, or add it to CartItemDTO
      },
      productSlug: item.variant.product.slug,
      productName: item.variant.product.name,
      productImage: primaryImage ? primaryImage.url : null,
      lineTotal: variantSummary.effectivePrice * item.quantity,
      availableQuantity: availableQuantity > 0 ? availableQuantity : 0,
    } as CartItemDTO & { availableQuantity: number };
  });

  // Calculate subtotal
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    id: cart.id,
    items,
    subtotal,
    totalQuantity,
  };
}
