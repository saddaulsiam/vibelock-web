import { PaymentStatus } from "@prisma/client";

export interface PaymentInitiationRequest {
  orderId: string;
  orderNumber: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingStreet: string;
  shippingCity: string;
  shippingZip: string;
  shippingCountry: string;
}

export interface PaymentInitiationResponse {
  success: boolean;
  redirectUrl?: string;
  merchantReferenceId?: string;
  error?: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  status: PaymentStatus;
  providerTransactionId?: string;
  verifiedAmount?: number;
  rawPayload?: unknown;
  error?: string;
}

export interface PaymentProvider {
  initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse>;
  verifyPayment(callbackPayload: Record<string, unknown>): Promise<PaymentVerificationResult>;
}
