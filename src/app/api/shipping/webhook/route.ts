import { NextRequest, NextResponse } from "next/server";
import { ShippingService } from "@/lib/shipping/service";
import { MockCourierProvider } from "@/lib/shipping/providers/mock/client";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // 1. Authenticate / Verify webhook signature here
    const secret = process.env.COURIER_WEBHOOK_SECRET;
    const signature = req.headers.get("x-courier-signature");

    // Simplistic check for mock provider
    if (secret && signature !== secret) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const { providerShipmentId, status } = payload;

    if (!providerShipmentId || !status) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const provider = new MockCourierProvider();
    const service = new ShippingService(provider);

    // Using sync method from service which validates transitions
    // Assuming status mapping is already handled by provider or we just pass it to sync
    // For now, let's just trigger a sync from provider
    await service.syncShipmentStatus(providerShipmentId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Shipping Webhook Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
