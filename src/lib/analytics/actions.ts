"use server";

import { headers, cookies } from "next/headers";
import { getCustomerOrderConfirmation } from "@/lib/orders/queries";
import { buildMetaUserData } from "./meta-utils";
import { sendMetaCapiEvent } from "./meta-capi";
import { SITE_URL } from "@/lib/seo/site";

/**
 * Server action to trigger Meta CAPI Purchase event with verified order details.
 * - Non-blocking / fire-and-forget safe.
 * - Extracts client IP, user agent, and _fbp / _fbc cookies.
 * - Emits event_id matching the client-side order.orderNumber for exact deduplication.
 */
export async function trackCapiPurchaseAction(orderNumber: string) {
  try {
    const order = await getCustomerOrderConfirmation(orderNumber);
    if (!order) {
      return { success: false, reason: "order_not_found" };
    }

    const isPaid = order.paymentStatus === "SUCCESS";
    const isCod = order.paymentMethod === "COD";
    const isCancelled =
      order.status === "CANCELLED" || order.paymentStatus === "CANCELLED";

    if (isCancelled || (!isPaid && !isCod)) {
      return { success: false, reason: "order_not_confirmed" };
    }

    const headerStore = await headers();
    const cookieStore = await cookies();

    const clientIp =
      headerStore.get("x-forwarded-for") ||
      headerStore.get("x-real-ip") ||
      undefined;
    const userAgent = headerStore.get("user-agent") || undefined;
    const fbp = cookieStore.get("_fbp")?.value || undefined;
    const fbc = cookieStore.get("_fbc")?.value || undefined;

    const userData = buildMetaUserData({
      email: order.customerEmail,
      phone: order.customerPhone,
      name: order.customerName,
      city: order.shippingCity,
      country: order.shippingCountry || "bd",
      clientIp,
      userAgent,
      fbp,
      fbc,
    });

    const contents = order.items.map((item) => ({
      id: item.sku,
      quantity: item.quantity,
      item_price: item.unitPrice,
      title: item.productName,
    }));

    await sendMetaCapiEvent({
      event_name: "Purchase",
      event_time: Math.floor(new Date(order.createdAt).getTime() / 1000),
      event_id: order.orderNumber, // Exact match with browser eventID
      event_source_url: `${SITE_URL}/order-success/${order.orderNumber}`,
      action_source: "website",
      user_data: userData,
      custom_data: {
        currency: "BDT",
        value: order.total,
        order_id: order.orderNumber,
        num_items: order.items.reduce((sum, item) => sum + item.quantity, 0),
        content_ids: contents.map((c) => c.id),
        contents,
      },
    });

    return { success: true };
  } catch (error) {
    // Fail-safe: log warning but never throw an unhandled error to caller
    console.warn(
      `[Meta CAPI Purchase Action Error for ${orderNumber}]:`,
      error instanceof Error ? error.message : "Unknown error"
    );
    return {
      success: false,
      reason: error instanceof Error ? error.message : "unknown_error",
    };
  }
}
