"use server";

import { Prisma, ShipmentStatus } from "@prisma/client";
import { updateTag } from "next/cache";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import { recordAuditLog } from "@/lib/audit";
import { ShippingService } from "@/lib/shipping/service";
import { adminCreateShipmentAction } from "@/lib/shipping/actions";
import { getShippingProvider } from "@/lib/shipping/provider";
import { getAdminShipments } from "./shipping-queries";
import { type ShipmentFilter } from "./shipping-shared";

export type ShippingActionState = { error: string | null; message?: string };

const name = z.string().trim().min(1, "Name is required.").max(120);
const cost = z
  .string()
  .regex(/^\d{1,10}(?:\.\d{1,2})?$/, "Cost must be a non-negative amount with up to two decimals.");
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
  const admin = await requireRole("MANAGER");

  // Pre-validation guards: reject oversized input before splitting and Zod parsing
  const rawCountriesStr = String(formData.get("countries") ?? "");
  if (rawCountriesStr.length > 2000) {
    return { error: "Countries input exceeds maximum allowed length." };
  }
  const countries = parseCountries(formData.get("countries"));
  if (countries.length > 250) {
    return { error: "Cannot assign more than 250 countries to a shipping zone." };
  }

  const parsed = z
    .object({
      id: id.optional(),
      name,
      countries: z
        .array(z.string().min(2).max(3))
        .min(1, "Specify at least one country code.")
        .max(250, "Cannot assign more than 250 countries to a shipping zone."),
    })
    .safeParse({
      id: String(formData.get("id") ?? "") || undefined,
      name: formData.get("name"),
      countries,
    });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    if (parsed.data.id) {
      await prisma.$transaction(async (tx) => {
        const updated = await tx.shippingZone.update({
          where: { id: parsed.data.id },
          data: { name: parsed.data.name, countries: parsed.data.countries },
        });
        await recordAuditLog({
          actorId: admin?.id,
          action: "SHIPPING_ZONE_UPDATED",
          entityType: "ShippingZone",
          entityId: updated.id,
          metadata: { name: updated.name, countries: updated.countries },
          tx,
        });
      });
    } else {
      await prisma.$transaction(async (tx) => {
        const created = await tx.shippingZone.create({
          data: { name: parsed.data.name, countries: parsed.data.countries },
        });
        await recordAuditLog({
          actorId: admin?.id,
          action: "SHIPPING_ZONE_CREATED",
          entityType: "ShippingZone",
          entityId: created.id,
          metadata: { name: created.name, countries: created.countries },
          tx,
        });
      });
    }
  } catch {
    return { error: "The shipping zone could not be saved. Please try again." };
  }
  refreshShipping();
  return {
    error: null,
    message: parsed.data.id ? "Shipping zone updated." : "Shipping zone created.",
  };
}

export async function saveShippingMethodAction(
  _previous: ShippingActionState,
  formData: FormData
): Promise<ShippingActionState> {
  const admin = await requireRole("MANAGER");
  const parsed = z
    .object({
      id: id.optional(),
      zoneId: id,
      name,
      cost,
      isActive: z.enum(["on", "true", "false"]),
    })
    .safeParse({
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
      await prisma.$transaction(async (tx) => {
        const updated = await tx.shippingMethod.update({ where: { id: parsed.data.id }, data });
        await recordAuditLog({
          actorId: admin?.id,
          action: "SHIPPING_METHOD_UPDATED",
          entityType: "ShippingMethod",
          entityId: updated.id,
          metadata: {
            zoneId: updated.zoneId,
            name: updated.name,
            cost: Number(updated.cost),
            isActive: updated.isActive,
          },
          tx,
        });
      });
    } else {
      await prisma.$transaction(async (tx) => {
        const created = await tx.shippingMethod.create({ data });
        await recordAuditLog({
          actorId: admin?.id,
          action: "SHIPPING_METHOD_CREATED",
          entityType: "ShippingMethod",
          entityId: created.id,
          metadata: {
            zoneId: created.zoneId,
            name: created.name,
            cost: Number(created.cost),
            isActive: created.isActive,
          },
          tx,
        });
      });
    }
  } catch {
    return { error: "The shipping method could not be saved. Please try again." };
  }
  refreshShipping();
  return {
    error: null,
    message: parsed.data.id ? "Shipping method updated." : "Shipping method created.",
  };
}

export async function toggleShippingMethodAction(
  _previous: ShippingActionState,
  formData: FormData
): Promise<ShippingActionState> {
  const admin = await requireRole("MANAGER");
  const parsed = id.safeParse(formData.get("id"));
  if (!parsed.success) return { error: "Choose a valid shipping method." };
  try {
    await prisma.$transaction(async (tx) => {
      const method = await tx.shippingMethod.findUnique({
        where: { id: parsed.data },
        select: { isActive: true },
      });
      if (!method) throw new Error("METHOD_NOT_FOUND");
      const updated = await tx.shippingMethod.update({
        where: { id: parsed.data },
        data: { isActive: !method.isActive },
      });
      await recordAuditLog({
        actorId: admin?.id,
        action: "SHIPPING_METHOD_TOGGLED",
        entityType: "ShippingMethod",
        entityId: updated.id,
        metadata: { previousActive: method.isActive, isActive: updated.isActive },
        tx,
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "METHOD_NOT_FOUND") {
      return { error: "Shipping method not found." };
    }
    return { error: "The shipping method status could not be changed." };
  }
  refreshShipping();
  return { error: null, message: "Shipping method status updated." };
}

export async function updateShipmentStatusAction(
  _previous: ShippingActionState,
  formData: FormData
): Promise<ShippingActionState> {
  const admin = await requireRole("STAFF");
  const parsed = z.object({ id, status: z.nativeEnum(ShipmentStatus) }).safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const updated = await new ShippingService({
      name: "internal",
      createShipment: async () => ({ success: false }),
      getShipmentStatus: async () => ({ success: false }),
    }).updateShipmentStatus(parsed.data.id, parsed.data.status, admin?.id);
    if (updated.status !== parsed.data.status) {
      return { error: "That shipment status transition is not allowed." };
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Shipment status could not be updated.",
    };
  }
  refreshShipping();
  revalidatePath("/admin/orders");
  return { error: null, message: "Shipment status updated." };
}

export async function refreshShipmentStatusAction(
  _previous: ShippingActionState,
  formData: FormData
): Promise<ShippingActionState> {
  const admin = await requireRole("STAFF");
  const parsed = id.safeParse(formData.get("id"));
  if (!parsed.success) return { error: "Choose a valid shipment." };

  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: parsed.data },
      select: { provider: true, providerShipmentId: true },
    });
    if (!shipment) return { error: "Shipment not found." };
    if (!shipment.providerShipmentId) return { error: "This shipment has no provider reference." };

    const provider = getShippingProvider();
    if (shipment.provider !== provider.name) {
      return { error: "The configured shipping provider does not match this shipment." };
    }
    // External courier API synchronization cannot be rolled back atomically via database transaction;
    // if audit logging fails after external status sync, the provider sync remains recorded in shipment history.
    const synced = await new ShippingService(provider).syncShipmentStatus(shipment.providerShipmentId);
    await recordAuditLog({
      actorId: admin?.id,
      action: "SHIPMENT_STATUS_SYNCED",
      entityType: "Shipment",
      entityId: parsed.data,
      metadata: {
        provider: shipment.provider,
        providerShipmentId: shipment.providerShipmentId,
        syncedStatus: synced?.status ?? null,
      },
    });
  } catch (error) {
    return {
      error:
        error instanceof Error && error.message.includes("not found")
          ? "Shipment not found."
          : "Unable to refresh shipment status.",
    };
  }

  refreshShipping();
  revalidatePath("/admin/orders");
  return { error: null, message: "Shipment status refreshed." };
}

export async function createShipmentAction(
  _previous: ShippingActionState,
  formData: FormData
): Promise<ShippingActionState> {
  await requireRole("STAFF");
  const parsed = id.safeParse(formData.get("id"));
  if (!parsed.success) return { error: "Choose a valid order." };

  const result = await adminCreateShipmentAction(parsed.data);
  if (!result.success) return { error: result.error ?? "Shipment creation failed." };

  refreshShipping();
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${parsed.data}`);
  return { error: null, message: "Shipment created successfully." };
}

export async function loadMoreAdminShipmentsAction(options: {
  search?: string;
  filter?: ShipmentFilter;
  provider?: string;
  page: number;
  pageSize?: number;
}) {
  await requireRole("STAFF");
  return getAdminShipments(options);
}

export async function syncSingleShipmentAction(shipmentId: string): Promise<{
  success: boolean;
  message: string;
  status?: ShipmentStatus;
}> {
  await requireRole("STAFF");
  const parsed = id.safeParse(shipmentId);
  if (!parsed.success) return { success: false, message: "Invalid shipment ID" };

  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: parsed.data },
      select: { provider: true, providerShipmentId: true, status: true },
    });
    if (!shipment) return { success: false, message: "Shipment not found." };
    if (!shipment.providerShipmentId) {
      return { success: false, message: "No courier tracking/consignment ID found." };
    }

    const provider = getShippingProvider();
    if (shipment.provider !== provider.name) {
      return {
        success: false,
        message: `Courier provider mismatch (configured: ${provider.name}, parcel: ${shipment.provider}).`,
      };
    }

    const updated = await new ShippingService(provider).syncShipmentStatus(
      shipment.providerShipmentId
    );
    refreshShipping();
    return {
      success: true,
      message: `Status synced: ${updated.status}`,
      status: updated.status,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Sync failed";
    return { success: false, message: msg };
  }
}
