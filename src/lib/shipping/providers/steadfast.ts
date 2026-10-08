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
  delivered_approval_pending: "DELIVERED",
  partial_delivered: "IN_TRANSIT",
  partial_delivered_approval_pending: "IN_TRANSIT",
  cancelled: "CANCELLED",
  cancelled_approval_pending: "CANCELLED",
  unknown: "CREATED",
  unknown_approval_pending: "CREATED",
  returned: "RETURNED",
};

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function nonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numericReference(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : nonEmptyString(value);
}

export class SteadfastCourierProvider implements ShippingProvider {
  readonly name = "steadfast";
  private readonly baseUrl: string;

  constructor(
    private readonly apiKey = env.STEADFAST_API_KEY,
    private readonly secretKey = env.STEADFAST_SECRET_KEY,
    baseUrl = env.STEADFAST_BASE_URL ?? "https://portal.steadfast.com.bd/api/v1"
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
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
          ...(init.headers ?? {}),
        },
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new Error("Steadfast request failed.");
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new Error("Steadfast returned an invalid response.");
    }
    return { response, payload };
  }

  async createShipment(request: CreateShipmentRequest): Promise<CreateShipmentResponse> {
    const { response, payload } = await this.request("/create_order", {
      method: "POST",
      body: JSON.stringify({
        invoice: request.orderNumber,
        recipient_name: request.recipientName,
        recipient_phone: request.recipientPhone,
        recipient_address: [request.street, request.city, request.state, request.zip, request.country]
          .filter(Boolean)
          .join(", "),
        cod_amount: request.codAmount ?? 0,
        note: request.note,
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

  async cancelShipment(_request: CancelShipmentRequest): Promise<CancelShipmentResponse> {
    return { success: false, error: "Steadfast cancellation is not supported by the verified API contract." };
  }
}
