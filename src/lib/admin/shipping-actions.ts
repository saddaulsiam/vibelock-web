"use server";

import { Prisma, ShipmentStatus } from "@prisma/client";
import { updateTag } from "next/cache";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import { ShippingService } from "@/lib/shipping/service";
import { adminCreateShipmentAction } from "@/lib/shipping/actions";

export type ShippingActionState = { error: string | null; message?: string };

const name = z.string().trim().min(1, "Name is required.").max(120);
const cost = z.string().regex(/^\d{1,10}(?:\.\d{1,2})?$/, "Cost must be a non-negative amount with up to two decimals.");
const id = z.string().uuid();

function refreshShipping() {
  updateTag("admin-shipping");
  revalidatePath("/admin/shipping");
  revalidatePath("/admin/shipping/zones");
  revalidatePath("/admin/shipping/methods");
  revalidatePath("/admin/shipping/zones/[id]/edit", "page");
  revalidatePath("/admin/shipping/methods/[id]/edit", "page");
}

function parseCountries(value: FormDataEntryValue | null) {
  const countries = String(value ?? "")
    .split(",")
    .map((country) => country.trim().toUpperCase())
    .filter(Boolean);
  return [...new Set(countries)];
}

export async function saveShippingZoneAction(
  _previous: ShippingActionState,
  formData: FormData
): Promise<ShippingActionState> {
  await requireRole("ADMIN");
  const parsed = z.object({ id: id.optional(), name, countries: z.array(z.string().min(2).max(3)).min(1) }).safeParse({
    id: String(formData.get("id") ?? "") || undefined,
    name: formData.get("name"),
    countries: parseCountries(formData.get("countries")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    if (parsed.data.id) {
      await prisma.shippingZone.update({
        where: { id: parsed.data.id },
        data: { name: parsed.data.name, countries: parsed.data.countries },
      });
    } else {
      await prisma.shippingZone.create({
        data: { name: parsed.data.name, countries: parsed.data.countries },
      });
    }
  } catch {
    return { error: "The shipping zone could not be saved. Please try again." };
  }
  refreshShipping();
  return { error: null, message: parsed.data.id ? "Shipping zone updated." : "Shipping zone created." };
}

export async function saveShippingMethodAction(
  _previous: ShippingActionState,
  formData: FormData
): Promise<ShippingActionState> {
  await requireRole("ADMIN");
  const parsed = z.object({
    id: id.optional(),
    zoneId: id,
    name,
    cost,
    isActive: z.enum(["on", "true", "false"]),
  }).safeParse({
    id: String(formData.get("id") ?? "") || undefined,
    zoneId: formData.get("zoneId"),
    name: formData.get("name"),
    cost: String(formData.get("cost") ?? "").trim(),
    isActive: formData.get("isActive") ? "on" : "false",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const data = {
      zoneId: parsed.data.zoneId,
      name: parsed.data.name,
      cost: new Prisma.Decimal(parsed.data.cost),
      isActive: parsed.data.isActive !== "false",
    };
    if (parsed.data.id) {
      await prisma.shippingMethod.update({ where: { id: parsed.data.id }, data });
    } else {
      await prisma.shippingMethod.create({ data });
    }
  } catch {
    return { error: "The shipping method could not be saved. Please try again." };
  }
  refreshShipping();
  return { error: null, message: parsed.data.id ? "Shipping method updated." : "Shipping method created." };
}

export async function toggleShippingMethodAction(
  _previous: ShippingActionState,
  formData: FormData
): Promise<ShippingActionState> {
  await requireRole("ADMIN");
  const parsed = id.safeParse(formData.get("id"));
  if (!parsed.success) return { error: "Choose a valid shipping method." };
  try {
    const method = await prisma.shippingMethod.findUnique({ where: { id: parsed.data }, select: { isActive: true } });
    if (!method) return { error: "Shipping method not found." };
    await prisma.shippingMethod.update({ where: { id: parsed.data }, data: { isActive: !method.isActive } });
  } catch {
    return { error: "The shipping method status could not be changed." };
  }
  refreshShipping();
  return { error: null, message: "Shipping method status updated." };
}

export async function updateShipmentStatusAction(
  _previous: ShippingActionState,
  formData: FormData
): Promise<ShippingActionState> {
  await requireRole("ADMIN");
  const parsed = z.object({ id, status: z.nativeEnum(ShipmentStatus) }).safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const updated = await new ShippingService({
      createShipment: async () => ({ success: false }),
      getShipmentStatus: async () => ({ success: false }),
    }).updateShipmentStatus(parsed.data.id, parsed.data.status);
    if (updated.status !== parsed.data.status) {
      return { error: "That shipment status transition is not allowed." };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Shipment status could not be updated." };
  }
  refreshShipping();
  revalidatePath("/admin/orders");
  return { error: null, message: "Shipment status updated." };
}

export async function createShipmentAction(
  _previous: ShippingActionState,
  formData: FormData
): Promise<ShippingActionState> {
  await requireRole("ADMIN");
  const parsed = id.safeParse(formData.get("id"));
  if (!parsed.success) return { error: "Choose a valid order." };

  const result = await adminCreateShipmentAction(parsed.data);
  if (!result.success) return { error: result.error ?? "Shipment creation failed." };

  refreshShipping();
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${parsed.data}`);
  return { error: null, message: "Shipment created successfully." };
}
