import {
  PaymentInitiationRequest,
  PaymentInitiationResponse,
  PaymentProvider,
  PaymentVerificationResult,
} from "../../types";
import { PaymentStatus } from "@prisma/client";
import { env } from "@/lib/config/env";
import { publicEnv } from "@/lib/config/public-env";

export interface PaystationInitiationApiResponse {
  status_code?: string | number;
  status?: string;
  message?: string;
  payment_url?: string;
  invoice_number?: string;
  [key: string]: unknown;
}

export interface PaystationTransactionStatusData {
  invoice_number?: string;
  trx_status?: string;
  trx_id?: string | number;
  payment_amount?: number | string;
  trx_amount?: number | string;
  order_date_time?: string;
  payment_method?: string;
  reference?: string;
  [key: string]: unknown;
}

export interface PaystationTransactionStatusApiResponse {
  status_code?: string | number;
  status?: string;
  message?: string;
  data?: PaystationTransactionStatusData;
  [key: string]: unknown;
}

export class PaystationProvider implements PaymentProvider {
  private readonly merchantId = env.PAYSTATION_MERCHANT_ID;
  private readonly password = env.PAYSTATION_PASSWORD;
  private readonly isSandbox = env.PAYSTATION_SANDBOX;

  get baseUrl(): string {
    return this.isSandbox
      ? "https://sandbox.paystation.com.bd"
      : "https://api.paystation.com.bd";
  }

  /**
   * Initiates a hosted checkout payment session with PayStation.
   *
   * PayStation expects application/x-www-form-urlencoded with merchant credentials
   * and integer payment_amount. Fractional BDT amounts are strictly rejected without
   * silent rounding.
   */
  async initiatePayment(
    request: PaymentInitiationRequest
  ): Promise<PaymentInitiationResponse> {
    if (!this.merchantId || !this.password) {
      return { success: false, error: "PayStation configuration missing" };
    }

    // PayStation documents payment_amount strictly as an integer.
    // Reject unsupported fractional amounts safely rather than silently rounding customer funds.
    if (!Number.isInteger(request.amount) || request.amount <= 0) {
      return {
        success: false,
        error: `PayStation requires an integer amount in BDT. Unsupported amount: ${request.amount}`,
      };
    }

    const invoiceNumber = `PS-${request.orderNumber}-${Date.now()}`;
    const appUrl = publicEnv.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const callbackUrl = `${appUrl}/api/payments/paystation/callback`;

    const body = new URLSearchParams();
    body.append("merchantId", this.merchantId);
    body.append("password", this.password);
    body.append("invoice_number", invoiceNumber);
    body.append("currency", "BDT");
    body.append("payment_amount", String(request.amount));
    body.append("pay_with_charge", "0");
    body.append("cust_name", request.customerName);
    body.append("cust_phone", request.customerPhone);
    body.append("cust_email", request.customerEmail);
    body.append("callback_url", callbackUrl);

    if (request.shippingStreet) {
      const addressParts = [request.shippingStreet, request.shippingCity].filter(Boolean);
      body.append("cust_address", addressParts.join(", "));
    }
    body.append("reference", request.orderNumber);

    try {
      const response = await fetch(`${this.baseUrl}/initiate-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `PayStation initiate-payment request failed with HTTP ${response.status}`,
        };
      }

      const result = (await response.json()) as PaystationInitiationApiResponse;

      const statusCodeStr = String(result?.status_code ?? "");
      const statusStr = String(result?.status ?? "").toLowerCase();

      if (statusCodeStr !== "200" || statusStr !== "success") {
        return {
          success: false,
          error:
            result?.message ||
            `PayStation initiation rejected (code: ${result?.status_code || "unknown"}, status: ${result?.status || "unknown"})`,
        };
      }

      if (!result.payment_url || typeof result.payment_url !== "string") {
        return {
          success: false,
          error: "PayStation response missing payment_url",
        };
      }

      // Validate payment_url is HTTPS and matches expected PayStation checkout domain
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(result.payment_url);
      } catch {
        return {
          success: false,
          error: "Invalid payment URL returned by PayStation",
        };
      }

      if (parsedUrl.protocol !== "https:") {
        return {
          success: false,
          error: "Insecure payment URL protocol returned by PayStation",
        };
      }

      const allowedHosts = [
        "sandbox.paystation.com.bd",
        "api.paystation.com.bd",
        "paystation.com.bd",
      ];
      const hostname = parsedUrl.hostname.toLowerCase();
      const isAllowedHost =
        allowedHosts.includes(hostname) || hostname.endsWith(".paystation.com.bd");

      if (!isAllowedHost) {
        return {
          success: false,
          error: `Untrusted payment URL host: ${parsedUrl.hostname}`,
        };
      }

      // Validate that returned invoice number matches the initiated invoice if provided
      if (result.invoice_number && result.invoice_number !== invoiceNumber) {
        return {
          success: false,
          error: "Invoice number mismatch in PayStation initiation response",
        };
      }

      return {
        success: true,
        redirectUrl: result.payment_url,
        merchantReferenceId: invoiceNumber,
      };
    } catch (err: unknown) {
      const error = err as Error;
      console.error("[PayStation Provider] Payment initiation failed:", error?.message);
      return {
        success: false,
        error: error?.message || "Internal PayStation initiation error",
      };
    }
  }

  /**
   * Verifies a transaction server-to-server with PayStation using Transaction Status v1.
   * Never trusts browser parameters or raw IPN payloads as proof of payment.
   */
  async verifyPayment(
    callbackPayload: Record<string, unknown>
  ): Promise<PaymentVerificationResult> {
    if (!this.merchantId || !this.password) {
      return {
        success: false,
        status: "FAILED",
        isUnverified: true,
        error: "PayStation configuration missing",
        rawPayload: callbackPayload,
      };
    }

    const invoiceNumber =
      (typeof callbackPayload.invoice_number === "string" && callbackPayload.invoice_number.trim()
        ? callbackPayload.invoice_number.trim()
        : undefined) ??
      (typeof callbackPayload.invoiceNumber === "string" && callbackPayload.invoiceNumber.trim()
        ? callbackPayload.invoiceNumber.trim()
        : undefined);

    if (!invoiceNumber) {
      return {
        success: false,
        status: "FAILED",
        isUnverified: true,
        error: "Missing invoice_number in callback payload",
        rawPayload: callbackPayload,
      };
    }

    // Call server-to-server Transaction Status v1:
    // Header: merchantId: MERCHANT_ID
    // Body: invoice_number: OUR_INVOICE_NUMBER
    try {
      const formBody = new URLSearchParams();
      formBody.append("invoice_number", invoiceNumber);

      const response = await fetch(`${this.baseUrl}/transaction-status`, {
        method: "POST",
        headers: {
          merchantId: this.merchantId,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody.toString(),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const { logSecurityAlert, hashSecurityIdentifier } = await import(
          "@/lib/monitoring/security-logger"
        );
        logSecurityAlert("PAYMENT_TAMPERING_DETECTED", {
          endpoint: "paystation/verifyPayment",
          gateway: "paystation",
          reason: "gateway_status_query_failed",
          referenceHash: hashSecurityIdentifier(invoiceNumber),
        });

        return {
          success: false,
          status: "FAILED",
          isUnverified: true,
          verifiedMerchantReferenceId: invoiceNumber,
          error: `PayStation transaction-status query returned HTTP ${response.status}`,
          rawPayload: callbackPayload,
        };
      }

      const result = (await response.json()) as PaystationTransactionStatusApiResponse;

      const statusCodeStr = String(result?.status_code ?? "");
      const statusStr = String(result?.status ?? "").toLowerCase();

      if (statusCodeStr !== "200" || statusStr !== "success") {
        return {
          success: false,
          status: "FAILED",
          isUnverified: true,
          verifiedMerchantReferenceId: invoiceNumber,
          error:
            result?.message ||
            `Transaction status query failed (code: ${result?.status_code}, status: ${result?.status})`,
          rawPayload: result,
        };
      }

      const data = result.data || {};
      const rawTrxStatus = String(data.trx_status || "").trim().toLowerCase();
      const verifiedInvoice =
        typeof data.invoice_number === "string" && data.invoice_number.trim()
          ? data.invoice_number.trim()
          : invoiceNumber;
      const trxId =
        data.trx_id !== undefined && data.trx_id !== null
          ? String(data.trx_id).trim()
          : undefined;

      const amountVal =
        data.payment_amount !== undefined
          ? Number(data.payment_amount)
          : data.trx_amount !== undefined
            ? Number(data.trx_amount)
            : undefined;

      // Status resolution
      if (rawTrxStatus === "success" || rawTrxStatus === "successful") {
        return {
          success: true,
          status: "SUCCESS" as PaymentStatus,
          providerTransactionId: trxId,
          verifiedMerchantReferenceId: verifiedInvoice,
          verifiedAmount: amountVal,
          verifiedCurrency: "BDT",
          rawPayload: result,
        };
      }

      if (
        rawTrxStatus === "failed" ||
        rawTrxStatus === "fail" ||
        rawTrxStatus === "cancelled" ||
        rawTrxStatus === "cancel"
      ) {
        const isCancelled = rawTrxStatus === "cancelled" || rawTrxStatus === "cancel";
        return {
          success: false,
          status: isCancelled ? ("CANCELLED" as PaymentStatus) : ("FAILED" as PaymentStatus),
          providerTransactionId: trxId,
          verifiedMerchantReferenceId: verifiedInvoice,
          verifiedAmount: amountVal,
          verifiedCurrency: "BDT",
          error: `PayStation transaction finished with status: ${data.trx_status}`,
          rawPayload: result,
        };
      }

      if (rawTrxStatus === "processing" || rawTrxStatus === "pending") {
        return {
          success: false,
          status: "PENDING" as PaymentStatus,
          isUnverified: true,
          providerTransactionId: trxId,
          verifiedMerchantReferenceId: verifiedInvoice,
          verifiedAmount: amountVal,
          verifiedCurrency: "BDT",
          error: `PayStation transaction is still processing`,
          rawPayload: result,
        };
      }

      return {
        success: false,
        status: "FAILED" as PaymentStatus,
        isUnverified: true,
        providerTransactionId: trxId,
        verifiedMerchantReferenceId: verifiedInvoice,
        error: `Unrecognized PayStation transaction status: ${data.trx_status}`,
        rawPayload: result,
      };
    } catch (err: unknown) {
      const error = err as Error;
      console.error(
        `[PayStation Provider] Server-to-server transaction status query failed for ${invoiceNumber}:`,
        error?.message
      );
      return {
        success: false,
        status: "FAILED",
        isUnverified: true,
        verifiedMerchantReferenceId: invoiceNumber,
        error: error?.message || "Internal error during PayStation transaction status verification",
        rawPayload: callbackPayload,
      };
    }
  }
}
