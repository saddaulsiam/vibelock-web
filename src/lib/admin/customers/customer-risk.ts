import "server-only";

import { requireRole } from "@/lib/auth/authorization";
import prisma from "@/lib/prisma/client";
import {
  SteadfastCourierProvider,
  type SteadfastCustomerRiskResult,
} from "@/lib/shipping/providers/steadfast";

export interface CombinedCustomerRiskProfile {
  phone?: string | null;
  email?: string | null;
  riskScore: "LOW_RISK" | "MODERATE_RISK" | "HIGH_RISK" | "NEW_CUSTOMER";
  riskLabel: string;
  headline: string;
  recommendation: string;
  confidenceBadge: "VERIFIED" | "SUSPICIOUS" | "NORMAL" | "NEW";
  storeStats: {
    totalOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    pendingOrders: number;
    totalSpent: number;
    isRepeatCustomer: boolean;
  };
  steadfastStats: SteadfastCustomerRiskResult | null;
  checkedAt: string;
}

export async function getCustomerRiskProfile({
  phone,
  email,
  userId,
  currentOrderId,
}: {
  phone?: string | null;
  email?: string | null;
  userId?: string | null;
  currentOrderId?: string | null;
}): Promise<CombinedCustomerRiskProfile> {
  await requireRole("ADMIN");

  // 1. Fetch VibeLock Internal Store History
  const orFilters = [
    ...(phone ? [{ customerPhone: phone }] : []),
    ...(email ? [{ customerEmail: email }] : []),
    ...(userId ? [{ userId }] : []),
  ];

  let storeOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    total: unknown;
  }> = [];

  if (orFilters.length > 0) {
    storeOrders = await prisma.order.findMany({
      where: {
        OR: orFilters,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        total: true,
      },
    });
  }

  // Filter out the current order to compute true historical past orders
  const pastOrders = currentOrderId
    ? storeOrders.filter((o) => o.id !== currentOrderId)
    : storeOrders;

  const totalOrders = pastOrders.length;
  const deliveredOrders = pastOrders.filter((o) => o.status === "DELIVERED").length;
  const cancelledOrders = pastOrders.filter((o) => o.status === "CANCELLED").length;
  const pendingOrders = pastOrders.filter(
    (o) => o.status === "PENDING" || o.status === "CONFIRMED" || o.status === "PROCESSING"
  ).length;

  const totalSpent = pastOrders
    .filter((o) => o.status === "DELIVERED" || o.paymentStatus === "SUCCESS")
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  const isRepeatCustomer = totalOrders > 0;

  // 2. Query Steadfast Courier Network Fraud Check
  let steadfastStats: SteadfastCustomerRiskResult | null = null;
  if (phone && phone.trim()) {
    try {
      const steadfast = new SteadfastCourierProvider();
      steadfastStats = await steadfast.checkCustomerRisk(phone);
    } catch (err) {
      console.warn("[CustomerRisk] Steadfast check failed:", err);
      steadfastStats = null;
    }
  }

  // 3. Synthesize Risk Intelligence
  let riskScore: "LOW_RISK" | "MODERATE_RISK" | "HIGH_RISK" | "NEW_CUSTOMER" = "NEW_CUSTOMER";
  let riskLabel = "New Customer";
  let headline = "First-time Buyer on VibeLock";
  let recommendation = "Verify delivery address & phone via call or WhatsApp before dispatch.";
  let confidenceBadge: "VERIFIED" | "SUSPICIOUS" | "NORMAL" | "NEW" = "NEW";

  const stTotal = steadfastStats?.totalParcels ?? 0;
  const stDelivered = steadfastStats?.totalDelivered ?? 0;
  const stRatio = steadfastStats?.deliveryRatio ?? 0;
  const stFraud = steadfastStats?.fraudReportsCount ?? 0;

  if (stFraud > 0) {
    riskScore = "HIGH_RISK";
    riskLabel = "High COD Fraud Risk";
    confidenceBadge = "SUSPICIOUS";
    headline = `Flagged in Steadfast Network (${stFraud} fraud reports filed)`;
    recommendation = "Do NOT ship COD without 100% advance payment or thorough phone verification.";
  } else if (stTotal >= 3 && stRatio < 55) {
    riskScore = "HIGH_RISK";
    riskLabel = "High Return / Cancellation Risk";
    confidenceBadge = "SUSPICIOUS";
    headline = `High Courier Return Rate (${stRatio}% delivered across ${stTotal} parcels)`;
    recommendation =
      "High risk of parcel return (RTO). Call customer and consider taking advance delivery charge.";
  } else if (deliveredOrders >= 2 || (stTotal >= 5 && stRatio >= 85)) {
    riskScore = "LOW_RISK";
    riskLabel = "Trusted / Verified Buyer";
    confidenceBadge = "VERIFIED";
    headline = isRepeatCustomer
      ? `Repeat Loyal Buyer (${deliveredOrders} delivered orders on VibeLock)`
      : `High Courier Reliability (${stRatio}% delivery rate across ${stTotal} parcels in BD)`;
    recommendation =
      "Reliable buyer with proven delivery track record. Safe for 1-click confirmation.";
  } else if (stTotal >= 1 && stRatio >= 70) {
    riskScore = "LOW_RISK";
    riskLabel = "Good Courier Track Record";
    confidenceBadge = "NORMAL";
    headline = `${stDelivered} of ${stTotal} parcels delivered successfully on Steadfast`;
    recommendation = "Normal customer profile with active courier history. Standard confirmation.";
  } else if (isRepeatCustomer && deliveredOrders >= 1) {
    riskScore = "LOW_RISK";
    riskLabel = "Verified Repeat Buyer";
    confidenceBadge = "VERIFIED";
    headline = `Previously completed ${deliveredOrders} order(s) on VibeLock`;
    recommendation = "Customer has previously received parcels from your store.";
  } else if (stTotal === 0 && !isRepeatCustomer) {
    riskScore = "NEW_CUSTOMER";
    riskLabel = "First-time Buyer";
    confidenceBadge = "NEW";
    headline = "No prior courier or store delivery records found";
    recommendation =
      "First-time buyer. Call or send a WhatsApp message to verify phone and address.";
  } else {
    riskScore = "MODERATE_RISK";
    riskLabel = "Moderate Verification Required";
    confidenceBadge = "NORMAL";
    headline = `Moderate delivery ratio (${stRatio}% across ${stTotal} parcels)`;
    recommendation = "Recommend confirming order details with customer prior to courier dispatch.";
  }

  return {
    phone,
    email,
    riskScore,
    riskLabel,
    headline,
    recommendation,
    confidenceBadge,
    storeStats: {
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      pendingOrders,
      totalSpent,
      isRepeatCustomer,
    },
    steadfastStats,
    checkedAt: new Date().toISOString(),
  };
}
