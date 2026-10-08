import { ShipmentStatus } from "@prisma/client";

export interface CreateShipmentRequest {
  orderId: string;
  orderNumber: string;
  recipientName: string;
  recipientPhone: string;
  street: string;
  city: string;
  state?: string;
  zip?: string;
  country: string;
  amount: number;
  codAmount?: number;
  referenceId: string;
  note?: string;
}

export interface CreateShipmentResponse {
  success: boolean;
  providerShipmentId?: string;
  trackingNumber?: string;
  status?: ShipmentStatus;
  error?: string;
}

export interface CancelShipmentRequest {
  shipmentId: string;
  providerShipmentId: string;
}

export interface CancelShipmentResponse {
  success: boolean;
  error?: string;
}

export interface ShipmentStatusResult {
  success: boolean;
  status?: ShipmentStatus;
  providerStatus?: string;
  deliveredAt?: Date;
  error?: string;
}

export interface ShippingProvider {
  readonly name?: string;
  createShipment(request: CreateShipmentRequest): Promise<CreateShipmentResponse>;
  getShipmentStatus(providerShipmentId: string): Promise<ShipmentStatusResult>;
  cancelShipment?(request: CancelShipmentRequest): Promise<CancelShipmentResponse>;
}
