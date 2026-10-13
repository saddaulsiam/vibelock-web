export interface NagadInitializeSensitiveData {
  merchantId: string;
  datetime: string;
  orderId: string;
  challenge: string;
}

export interface NagadInitializeRequestBody {
  dateTime: string;
  sensitiveData: string;
  signature: string;
}

export interface NagadInitializeResponse {
  sensitiveData?: string;
  signature?: string;
  paymentReferenceId?: string;
  challenge?: string;
  status?: string;
  message?: string;
  reason?: string;
}

export interface NagadDecryptedInitializeData {
  paymentReferenceId: string;
  challenge: string;
  status?: string;
}

export interface NagadCompleteSensitiveData {
  merchantId: string;
  orderId: string;
  currencyCode: string;
  amount: string;
  challenge: string;
  callBackUrl?: string;
  merchantCallbackURL?: string;
}

export interface NagadCompleteRequestBody {
  merchantId?: string;
  orderId?: string;
  sensitiveData: string;
  signature: string;
  paymentRefId?: string;
}

export interface NagadCompleteResponse {
  status?: string;
  statusCode?: string;
  callBackUrl?: string;
  callbackUrl?: string;
  paymentRefId?: string;
  message?: string;
  reason?: string;
}

export interface NagadVerifyPaymentResponse {
  merchantId: string;
  orderId: string;
  paymentRefId: string;
  amount: string;
  clientMobileNo?: string;
  merchantMobileNo?: string;
  orderDateTime?: string;
  issuerPaymentDateTime?: string;
  issuerPaymentRefNo?: string;
  additionalMerchantInfo?: unknown;
  status: string;
  statusCode?: string;
  cancelIssuerDateTime?: string;
  cancelIssuerRefNo?: string;
  message?: string;
}
