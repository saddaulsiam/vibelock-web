import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma/client";

export class ShippingPricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShippingPricingError";
  }
}

export interface AddressInfo {
  country: string;
  city: string;
  state?: string | null;
}

export interface ResolvedShippingMethod {
  id: string;
  name: string;
  cost: Prisma.Decimal;
  zoneId: string;
  zoneName: string;
}

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

export function normalizeCountry(country: string): string {
  const trimmed = country.trim().toUpperCase();
  if (trimmed === "BANGLADESH") return "BD";
  return trimmed;
}

export function isDhakaCity(city?: string | null, state?: string | null): boolean {
  const c = city?.trim().toLowerCase() ?? "";
  const s = state?.trim().toLowerCase() ?? "";
  return c.includes("dhaka") || s.includes("dhaka");
}

export function matchesShippingZone(
  zone: { name: string; countries: string[] },
  address: AddressInfo
): boolean {
  if (!address.country || !address.country.trim()) return false;
  const normAddressCountry = normalizeCountry(address.country);

  const countryMatches = zone.countries.some((c) => {
    return normalizeCountry(c) === normAddressCountry;
  });

  if (!countryMatches) {
    return false;
  }

  // If country matches, check if zone is scoped to a specific city/region by its name
  const zoneName = zone.name.trim().toLowerCase();

  // Zone specific to Dhaka (e.g. "Inside Dhaka", "Dhaka City", "Dhaka Metro")
  if (
    zoneName.includes("inside dhaka") ||
    zoneName === "dhaka" ||
    zoneName.includes("dhaka metro")
  ) {
    return isDhakaCity(address.city, address.state);
  }

  // Zone specific to outside Dhaka (e.g. "Outside Dhaka", "Out Side Dhaka", "Rest of Bangladesh")
  if (
    zoneName.includes("outside dhaka") ||
    zoneName.includes("out side dhaka") ||
    zoneName.includes("rest of bangladesh")
  ) {
    return !isDhakaCity(address.city, address.state);
  }

  // If the zone name explicitly names the city (e.g., "Chittagong")
  const normCity = address.city.trim().toLowerCase();
  if (normCity && zoneName === normCity) {
    return true;
  }

  // General country zone (e.g. "Bangladesh", "Domestic", "Nationwide")
  return true;
}

/**
 * Gets all active shipping methods eligible for the given delivery address from the database.
 */
export async function getEligibleShippingMethods(
  address: AddressInfo,
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<ResolvedShippingMethod[]> {
  if (!address.country || !address.country.trim() || !address.city || !address.city.trim()) {
    return [];
  }

  const zones = await db.shippingZone.findMany({
    include: {
      methods: {
        where: { isActive: true },
        orderBy: { cost: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const matchingZones = zones.filter((zone) => matchesShippingZone(zone, address));
  const eligibleMethods: ResolvedShippingMethod[] = [];

  for (const zone of matchingZones) {
    for (const method of zone.methods) {
      eligibleMethods.push({
        id: method.id,
        name: method.name,
        cost: method.cost,
        zoneId: zone.id,
        zoneName: zone.name,
      });
    }
  }

  return eligibleMethods;
}

/**
 * Resolves the shipping method and fee for order creation or checkout.
 * Validates active status and address eligibility.
 */
export async function resolveShippingMethod(
  address: AddressInfo,
  selectedMethodId?: string | null,
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<ResolvedShippingMethod> {
  const eligibleMethods = await getEligibleShippingMethods(address, db);

  if (eligibleMethods.length === 0) {
    throw new ShippingPricingError("No shipping method is available for your delivery address.");
  }

  if (selectedMethodId) {
    const matched = eligibleMethods.find((m) => m.id === selectedMethodId);
    if (!matched) {
      // Check if method exists in DB to provide clear feedback
      const existing = await db.shippingMethod.findUnique({
        where: { id: selectedMethodId },
        include: { zone: true },
      });

      if (!existing) {
        throw new ShippingPricingError("Selected shipping method does not exist.");
      }
      if (!existing.isActive) {
        throw new ShippingPricingError("Selected shipping method is no longer active.");
      }
      throw new ShippingPricingError(
        "The selected shipping method is not available for your delivery address."
      );
    }
    return matched;
  }

  // Default to the first eligible method (lowest cost or primary)
  return eligibleMethods[0];
}

/**
 * Legacy city-based calculation helper, kept for compatibility.
 */
export function calculateShippingCharge(city: string): Prisma.Decimal {
  const normalizedCity = city.trim().toLowerCase();
  if (normalizedCity === "dhaka") {
    return SHIPPING_ZONES.INSIDE_DHAKA.cost;
  }
  return SHIPPING_ZONES.OUTSIDE_DHAKA.cost;
}
