import { describe, expect, test, vi, beforeEach } from "vitest";
import { saveShippingZoneAction } from "@/lib/admin/shipping/shipping-actions";
import prisma from "@/lib/prisma/client";

vi.mock("@/lib/auth/authorization", () => ({
  requireRole: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/prisma/client", () => ({
  default: {
    shippingZone: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}));

describe("Admin Shipping Zone Actions & Request Boundary Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createZoneFormData(name = "Express Zone", countries = "BD,US,CA") {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("countries", countries);
    return formData;
  }

  test("creates shipping zone with valid countries within bounds", async () => {
    (prisma.shippingZone.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "zone-1" });
    const formData = createZoneFormData("Standard Zone", "BD,IN,PK");
    const result = await saveShippingZoneAction({ error: null }, formData);

    expect(result.error).toBeNull();
    expect(result.message).toBe("Shipping zone created.");
    expect(prisma.shippingZone.create).toHaveBeenCalledWith({
      data: {
        name: "Standard Zone",
        countries: ["BD", "IN", "PK"],
      },
    });
  });

  test("accepts boundary maximum of 250 countries", async () => {
    (prisma.shippingZone.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "zone-250" });
    // Generate 250 distinct 2-character country codes (AA, AB, AC, ...)
    const countryCodes: string[] = [];
    for (let i = 0; i < 250; i++) {
      const c1 = String.fromCharCode(65 + Math.floor(i / 26));
      const c2 = String.fromCharCode(65 + (i % 26));
      countryCodes.push(`${c1}${c2}`);
    }
    const formData = createZoneFormData("Global Zone", countryCodes.join(","));
    const result = await saveShippingZoneAction({ error: null }, formData);

    expect(result.error).toBeNull();
    expect(result.message).toBe("Shipping zone created.");
    expect(prisma.shippingZone.create).toHaveBeenCalled();
  });

  test("rejects more than 250 countries via early guard", async () => {
    const countryCodes: string[] = [];
    for (let i = 0; i < 251; i++) {
      const c1 = String.fromCharCode(65 + Math.floor(i / 26));
      const c2 = String.fromCharCode(65 + (i % 26));
      countryCodes.push(`${c1}${c2}`);
    }
    const formData = createZoneFormData("Oversized Zone", countryCodes.join(","));
    const result = await saveShippingZoneAction({ error: null }, formData);

    expect(result.error).toMatch(/cannot assign more than 250 countries/i);
    expect(prisma.shippingZone.create).not.toHaveBeenCalled();
  });

  test("rejects raw countries input string exceeding 2000 characters", async () => {
    const longString = "BD,".repeat(700); // 2100 chars
    const formData = createZoneFormData("Too Long String Zone", longString);
    const result = await saveShippingZoneAction({ error: null }, formData);

    expect(result.error).toMatch(/countries input exceeds maximum allowed length/i);
    expect(prisma.shippingZone.create).not.toHaveBeenCalled();
  });

  test("rejects empty countries string", async () => {
    const formData = createZoneFormData("Empty Countries Zone", "");
    const result = await saveShippingZoneAction({ error: null }, formData);

    expect(result.error).toMatch(/specify at least one country code/i);
    expect(prisma.shippingZone.create).not.toHaveBeenCalled();
  });

  test("rejects invalid country code format", async () => {
    const formData = createZoneFormData("Invalid Code Zone", "B,TOOLONG");
    const result = await saveShippingZoneAction({ error: null }, formData);

    expect(result.error).toBeDefined();
    expect(prisma.shippingZone.create).not.toHaveBeenCalled();
  });
});
