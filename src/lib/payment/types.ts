import { PaymentStatus } from "@prisma/client";

export * from "./constants";
export { CaptureReconciliationStatus } from "./fulfillment";

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
  sessionKey?: string;
  error?: string;
}

export interface VerifiedCaptureCandidate {
  bankTranId?: string;
  valId?: string;
  cardType?: string;
  cardBrand?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  riskLevel?: string;
  riskTitle?: string;
  tranDate?: string;
  rawPayload: Record<string, unknown>;
}

export interface PaymentVerificationResult {
  success: boolean;
  status: PaymentStatus;
  providerTransactionId?: string;
  verifiedMerchantReferenceId?: string;
  verifiedOrderNumber?: string;
  verifiedAmount?: number;
  verifiedCurrency?: string;
  candidates?: VerifiedCaptureCandidate[];
  rawPayload?: unknown;
  error?: string;
  isUnverified?: boolean;
  isRetryable?: boolean;
}

export interface RefundInitiationRequest {
  refundId: string;
  paymentId: string;
  gatewayTransactionId: string;
  amount: number;
  reason?: string;
}

export interface RefundInitiationResponse {
  success: boolean;
  gatewayRefundRef?: string;
  error?: string;
}

export interface PaymentProvider {
  initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse>;
  verifyPayment(callbackPayload: Record<string, unknown>): Promise<PaymentVerificationResult>;
  refundPayment?(request: RefundInitiationRequest): Promise<RefundInitiationResponse>;
}
