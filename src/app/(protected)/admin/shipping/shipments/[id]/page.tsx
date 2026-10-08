import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShipmentStatus } from "@prisma/client";
import { RefreshShipmentStatusForm, ShipmentStatusForm } from "@/components/admin/shipping-forms";
import prisma from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/authorization";

export default async function AdminShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;
  const shipment = await prisma.shipment.findUnique({ where: { id }, select: { id: true, provider: true, providerShipmentId: true, trackingNumber: true, status: true, shippingAmount: true, failureReason: true, createdAt: true, updatedAt: true, shippedAt: true, deliveredAt: true, cancelledAt: true, order: { select: { id: true, orderNumber: true, shippingMethodName: true, shippingCost: true, customerName: true, customerEmail: true } } } });
  if (!shipment) notFound();
  return <div className="space-y-6"><Link href="/admin/shipping" className="text-sm font-medium text-primary hover:underline">← Back to shipping</Link><div><h1 className="mt-3 text-3xl font-bold tracking-tight">Shipment for {shipment.order.orderNumber}</h1><p className="text-muted-foreground">{shipment.order.customerName || "Guest"} · {shipment.order.customerEmail}</p></div><div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle>Shipment details</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p><strong>Status:</strong> <Badge variant={shipment.status === "FAILED" || shipment.status === "CANCELLED" ? "destructive" : "outline"}>{shipment.status}</Badge></p><p><strong>Provider:</strong> {shipment.provider}</p><p><strong>Provider reference:</strong> {shipment.providerShipmentId || "N/A"}</p><p><strong>Tracking number:</strong> {shipment.trackingNumber || "N/A"}</p><p><strong>Shipping amount:</strong> ৳{Number(shipment.shippingAmount).toFixed(2)}</p><p><strong>Order method:</strong> {shipment.order.shippingMethodName}</p><p><strong>Created:</strong> {new Date(shipment.createdAt).toLocaleString("en-BD")}</p><p><strong>Updated:</strong> {new Date(shipment.updatedAt).toLocaleString("en-BD")}</p>{shipment.failureReason ? <p className="text-red-700"><strong>Failure:</strong> {shipment.failureReason}</p> : null}</CardContent></Card><Card><CardHeader><CardTitle>Shipment status</CardTitle></CardHeader><CardContent className="space-y-5"><ShipmentStatusForm id={shipment.id} current={shipment.status} statuses={Object.values(ShipmentStatus)} />{shipment.provider === "steadfast" ? <RefreshShipmentStatusForm id={shipment.id} /> : null}</CardContent></Card></div></div>;
}
