import { ShipmentStatus } from "@prisma/client";
import {
  CancelShipmentRequest,
  CancelShipmentResponse,
  CreateShipmentRequest,
  CreateShipmentResponse,
  ShipmentStatusResult,
  ShippingProvider,
} from "../types";
import { env } from "@/lib/config/env";

type JsonRecord = Record<string, unknown>;

const statusMap: Record<string, ShipmentStatus> = {
  pending: "CREATED",
  in_review: "CREATED",
  hold: "CREATED",
  picked_up: "IN_TRANSIT",
  picked: "IN_TRANSIT",
  in_transit: "IN_TRANSIT",
  out_for_delivery: "OUT_FOR_DELIVERY",
  delivered: "DELIVERED",
  delivered_approval_pending: "OUT_FOR_DELIVERY",
  partial_delivered: "IN_TRANSIT",
  partial_delivered_approval_pending: "IN_TRANSIT",
  cancelled: "CANCELLED",
  cancelled_approval_pending: "IN_TRANSIT",
  exceptional: "FAILED",
  unknown: "CREATED",
  unknown_approval_pending: "CREATED",
  returned: "RETURNED",
};

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function nonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numericReference(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : nonEmptyString(value);
}

/**
 * Normalizes phone number to 11 digits format (e.g. 017XXXXXXXX)
 * required by Steadfast Courier API.
 */
function normalizeBdPhone(phone: string): string {
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("880") && clean.length === 13) {
    clean = clean.slice(2);
  } else if (clean.startsWith("88") && clean.length === 13) {
    clean = clean.slice(2);
  }
  return clean;
}

export class SteadfastCourierProvider implements ShippingProvider {
  readonly name = "steadfast";
  private readonly apiKey?: string;
  private readonly secretKey?: string;
  private readonly baseUrl: string;

  constructor(apiKey?: string, secretKey?: string, baseUrl?: string) {
    this.apiKey =
      arguments.length > 0 ? apiKey : env.STEADFAST_API_KEY || process.env.STEADFAST_API_KEY;
    this.secretKey =
      arguments.length > 1
        ? secretKey
        : env.STEADFAST_SECRET_KEY || process.env.STEADFAST_SECRET_KEY;
    let url =
      (arguments.length > 2 ? baseUrl : env.STEADFAST_BASE_URL || process.env.STEADFAST_BASE_URL) ||
      "https://portal.packzy.com/api/v1";
    if (url.includes("portal.steadfast.com.bd")) {
      url = url.replace("portal.steadfast.com.bd", "portal.packzy.com");
    }
    this.baseUrl = url.replace(/\/+$/, "");
  }

  private ensureConfigured() {
    if (!this.apiKey || !this.secretKey) {
      throw new Error("Steadfast shipping provider is not configured.");
    }
  }

  private async request(path: string, init: RequestInit) {
    this.ensureConfigured();
    const apiKey = this.apiKey;
    const secretKey = this.secretKey;
    if (!apiKey || !secretKey) {
      throw new Error("Steadfast shipping provider is not configured.");
    }
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          "Api-Key": apiKey,
          "Secret-Key": secretKey,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(init.headers ?? {}),
        },
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      console.error("[SteadfastProvider] Request failed to URL:", `${this.baseUrl}${path}`, err);
      throw new Error("Steadfast request failed.");
    }

    let payload: unknown;
    try {
      const cloned = typeof response.clone === "function" ? response.clone() : null;
      try {
        payload = await response.json();
      } catch (err) {
        if (cloned && typeof cloned.text === "function") {
          const rawText = await cloned.text();
          payload = { status: response.status, message: rawText.trim() };
        } else {
          throw err;
        }
      }
    } catch (err) {
      console.error("[SteadfastProvider] JSON parse error:", err);
      throw new Error("Steadfast returned an invalid response.");
    }
    return { response, payload };
  }

  /**
   * Dispatches parcel to Steadfast via POST /create_order
   */
  async createShipment(request: CreateShipmentRequest): Promise<CreateShipmentResponse> {
    const cleanPhone = normalizeBdPhone(request.recipientPhone);

    const { response, payload } = await this.request("/create_order", {
      method: "POST",
      body: JSON.stringify({
        invoice: request.orderNumber,
        recipient_name: request.recipientName,
        recipient_phone: cleanPhone,
        recipient_address: [
          request.street,
          request.city,
          request.state,
          request.zip,
          request.country,
        ]
          .filter(Boolean)
          .join(", "),
        cod_amount: request.codAmount ?? 0,
        note: request.note || `VibeLock order #${request.orderNumber}`,
      }),
    });

    const body = record(payload);
    const consignment = body ? record(body.consignment) : null;
    if (!response.ok || body?.status !== 200 || !consignment) {
      return { success: false, error: "Steadfast rejected the shipment." };
    }

    const providerShipmentId = numericReference(consignment.consignment_id);
    const trackingNumber = nonEmptyString(consignment.tracking_code);
    if (!providerShipmentId || !trackingNumber) {
      return { success: false, error: "Steadfast returned an incomplete shipment." };
    }

    return {
      success: true,
      providerShipmentId,
      trackingNumber,
      status: statusMap[nonEmptyString(consignment.status)?.toLowerCase() ?? ""] ?? "CREATED",
    };
  }

  /**
   * Retrieves delivery status by Consignment ID (CID) via GET /status_by_cid/{id}
   */
  async getShipmentStatus(providerShipmentId: string): Promise<ShipmentStatusResult> {
    const { response, payload } = await this.request(
      `/status_by_cid/${encodeURIComponent(providerShipmentId)}`,
      { method: "GET" }
    );
    const body = record(payload);
    const providerStatus = nonEmptyString(body?.delivery_status)?.toLowerCase();
    if (!response.ok || body?.status !== 200 || !providerStatus || !(providerStatus in statusMap)) {
      throw new Error("Steadfast returned an invalid shipment status.");
    }
    return {
      success: true,
      status: statusMap[providerStatus],
      providerStatus,
    };
  }

  /**
   * Retrieves delivery status by Tracking Code via GET /status_by_trackingcode/{code}
   */
  async getShipmentStatusByTrackingCode(trackingCode: string): Promise<ShipmentStatusResult> {
    const { response, payload } = await this.request(
      `/status_by_trackingcode/${encodeURIComponent(trackingCode)}`,
      { method: "GET" }
    );
    const body = record(payload);
    const providerStatus = nonEmptyString(body?.delivery_status)?.toLowerCase();
    if (!response.ok || body?.status !== 200 || !providerStatus || !(providerStatus in statusMap)) {
      throw new Error("Steadfast returned an invalid shipment status.");
    }
    return {
      success: true,
      status: statusMap[providerStatus],
      providerStatus,
    };
  }

  /**
   * Retrieves delivery status by Order Invoice via GET /status_by_invoice/{invoice}
   */
  async getShipmentStatusByInvoice(invoice: string): Promise<ShipmentStatusResult> {
    const { response, payload } = await this.request(
      `/status_by_invoice/${encodeURIComponent(invoice)}`,
      { method: "GET" }
    );
    const body = record(payload);
    const providerStatus = nonEmptyString(body?.delivery_status)?.toLowerCase();
    if (!response.ok || body?.status !== 200 || !providerStatus || !(providerStatus in statusMap)) {
      throw new Error("Steadfast returned an invalid shipment status.");
    }
    return {
      success: true,
      status: statusMap[providerStatus],
      providerStatus,
    };
  }

  /**
   * Retrieves current available COD financial balance from Steadfast via GET /get_balance
   */
  async getMerchantBalance(): Promise<{
    success: boolean;
    currentBalance?: number;
    error?: string;
  }> {
    try {
      const { response, payload } = await this.request("/get_balance", { method: "GET" });
      const body = record(payload);
      if (!response.ok || body?.status !== 200) {
        return { success: false, error: "Failed to retrieve balance from Steadfast." };
      }
      return {
        success: true,
        currentBalance:
          typeof body?.current_balance === "number"
            ? body.current_balance
            : Number(body?.current_balance || 0),
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Error checking Steadfast balance.",
      };
    }
  }

  async cancelShipment(_request: CancelShipmentRequest): Promise<CancelShipmentResponse> {
    void _request;
    return {
      success: false,
      error: "Steadfast cancellation is not supported by the verified API contract.",
    };
  }

  /**
   * Retrieves customer delivery history and fraud risk metrics via GET /fraud_check/{phone}
   */
  async checkCustomerRisk(phone: string): Promise<SteadfastCustomerRiskResult> {
    const cleanPhone = normalizeBdPhone(phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      return {
        success: false,
        totalParcels: 0,
        totalDelivered: 0,
        totalCancelled: 0,
        deliveryRatio: 0,
        cancellationRatio: 0,
        fraudReportsCount: 0,
        riskLevel: "UNKNOWN",
        error: "Invalid or missing phone number.",
      };
    }

    try {
      const { response, payload } = await this.request(
        `/fraud_check/${encodeURIComponent(cleanPhone)}`,
        { method: "GET" }
      );

      const body = record(payload);
      if (!response.ok || !body) {
        return {
          success: false,
          phone: cleanPhone,
          totalParcels: 0,
          totalDelivered: 0,
          totalCancelled: 0,
          deliveryRatio: 0,
          cancellationRatio: 0,
          fraudReportsCount: 0,
          riskLevel: "UNKNOWN",
          error: "Steadfast fraud check failed.",
        };
      }

      // Handle diverse response field namings across Steadfast / Packzy API versions
      const totalParcels =
        Number(body.total_parcels ?? body.Total_parcels ?? body.total_orders ?? 0) || 0;
      const totalDelivered = Number(body.total_delivered ?? body.Total_delivered ?? 0) || 0;
      const totalCancelled =
        Number(body.total_cancelled ?? body.Total_cancelled ?? body.total_returned ?? 0) || 0;

      // Extract fraud reports if any
      const rawReports = Array.isArray(body.total_fraud_reports)
        ? body.total_fraud_reports
        : Array.isArray(body.fraud_reports)
          ? body.fraud_reports
          : [];
      const fraudReportsCount =
        typeof body.total_fraud_reports === "number" ? body.total_fraud_reports : rawReports.length;

      // Delivery ratio calculation
      let deliveryRatio = 0;
      if (typeof body.delivery_ratio === "number" && !isNaN(body.delivery_ratio)) {
        deliveryRatio = Math.round(body.delivery_ratio);
      } else if (totalParcels > 0) {
        deliveryRatio = Math.round((totalDelivered / totalParcels) * 100);
      }

      let cancellationRatio = 0;
      if (typeof body.cancellation_ratio === "number" && !isNaN(body.cancellation_ratio)) {
        cancellationRatio = Math.round(body.cancellation_ratio);
      } else if (totalParcels > 0) {
        cancellationRatio = Math.round((totalCancelled / totalParcels) * 100);
      }

      let riskLevel: "LOW" | "MODERATE" | "HIGH" | "UNKNOWN" = "UNKNOWN";
      if (totalParcels === 0) {
        riskLevel = "UNKNOWN";
      } else if (fraudReportsCount > 0 || deliveryRatio < 60 || cancellationRatio >= 40) {
        riskLevel = "HIGH";
      } else if (deliveryRatio >= 85 && cancellationRatio <= 15) {
        riskLevel = "LOW";
      } else {
        riskLevel = "MODERATE";
      }

      return {
        success: true,
        phone: cleanPhone,
        totalParcels,
        totalDelivered,
        totalCancelled,
        deliveryRatio,
        cancellationRatio,
        fraudReportsCount,
        riskLevel,
      };
    } catch (err) {
      console.warn("[SteadfastProvider] Fraud check error:", err);
      return {
        success: false,
        phone: cleanPhone,
        totalParcels: 0,
        totalDelivered: 0,
        totalCancelled: 0,
        deliveryRatio: 0,
        cancellationRatio: 0,
        fraudReportsCount: 0,
        riskLevel: "UNKNOWN",
        error:
          err instanceof Error ? err.message : "Failed to connect to Steadfast fraud check API.",
      };
    }
  }
}

export interface SteadfastCustomerRiskResult {
  success: boolean;
  phone?: string;
  totalParcels: number;
  totalDelivered: number;
  totalCancelled: number;
  deliveryRatio: number;
  cancellationRatio: number;
  fraudReportsCount: number;
  riskLevel: "LOW" | "MODERATE" | "HIGH" | "UNKNOWN";
  error?: string;
}
