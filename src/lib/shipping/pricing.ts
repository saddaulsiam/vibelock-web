import { Prisma } from "@prisma/client";

export const SHIPPING_ZONES = {
  INSIDE_DHAKA: {
    id: "inside_dhaka",
    name: "Inside Dhaka",
    cost: new Prisma.Decimal(60.0),
  },
  OUTSIDE_DHAKA: {
    id: "outside_dhaka",
    name: "Outside Dhaka",
    cost: new Prisma.Decimal(120.0),
  },
} as const;

export function calculateShippingCharge(city: string): Prisma.Decimal {
  const normalizedCity = city.trim().toLowerCase();
  if (normalizedCity === "dhaka") {
    return SHIPPING_ZONES.INSIDE_DHAKA.cost;
  }
  return SHIPPING_ZONES.OUTSIDE_DHAKA.cost;
}
