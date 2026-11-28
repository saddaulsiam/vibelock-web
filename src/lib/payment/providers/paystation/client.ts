import { env } from "@/lib/config/env";
import { publicEnv } from "@/lib/config/public-env";
import { PaymentStatus } from "@prisma/client";
import {
  PaymentInitiationRequest,
  PaymentInitiationResponse,
  PaymentProvider,
  PaymentVerificationResult,
} from "../../types";

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
    return this.isSandbox ? "https://sandbox.paystation.com.bd" : "https://api.paystation.com.bd";
  }

  /**
   * Initiates a hosted checkout payment session with PayStation.
   *
   * PayStation expects application/x-www-form-urlencoded with merchant credentials
   * and integer payment_amount. Fractional BDT amounts are strictly rejected without
   * silent rounding.
   */
  async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
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
    const callbackUrl = new URL("/api/payments/paystation/callback", appUrl);

    console.log("➡️ [PayStation Initiate: Step 1] Preparing payment request:", {
      orderNumber: request.orderNumber,
      amount: request.amount,
      invoiceNumber,
      callbackUrl: callbackUrl.toString(),
      environment: this.isSandbox ? "SANDBOX" : "PRODUCTION",
      baseUrl: this.baseUrl,
      customer: {
        name: request.customerName,
        phone: request.customerPhone,
        email: request.customerEmail,
      },
    });

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
    body.append("callback_url", callbackUrl.toString());

    if (request.shippingStreet) {
      const addressParts = [request.shippingStreet, request.shippingCity].filter(Boolean);
      body.append("cust_address", addressParts.join(", "));
    }
    body.append("reference", request.orderNumber);

    try {
      console.log(
        `🚀 [PayStation Initiate: Step 2] Sending POST ${this.baseUrl}/initiate-payment:`,
        {
          merchantId: this.merchantId,
          invoice_number: invoiceNumber,
          currency: "BDT",
          payment_amount: String(request.amount),
          pay_with_charge: "0",
          cust_name: request.customerName,
          cust_phone: request.customerPhone,
          cust_email: request.customerEmail,
          callback_url: callbackUrl.toString(),
          reference: request.orderNumber,
        }
      );

      const response = await fetch(`${this.baseUrl}/initiate-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
        signal: AbortSignal.timeout(10000),
      });

      console.log(
        `📥 [PayStation Initiate: Step 3] Gateway HTTP status: ${response.status} (ok: ${response.ok})`
      );

      if (!response.ok) {
        console.error(
          "[PayStation][Initiate]",
          JSON.stringify({
            event: "initiate_failed",
            orderNumber: request.orderNumber,
            invoiceNumber,
            gateway: "PAYSTATION",
            httpStatus: response.status,
            success: false,
            error: `HTTP ${response.status}`,
          })
        );
        return {
          success: false,
          error: `PayStation initiate-payment request failed with HTTP ${response.status}`,
        };
      }

      const result = (await response.json()) as PaystationInitiationApiResponse;
      console.log("📥 [PayStation Initiate: Step 3 Response Body]", result);

      const statusCodeStr = String(result?.status_code ?? "");
      const statusStr = String(result?.status ?? "").toLowerCase();

      if (statusCodeStr !== "200" || statusStr !== "success") {
        console.warn(
          "[PayStation][Initiate]",
          JSON.stringify({
            event: "initiate_rejected",
            orderNumber: request.orderNumber,
            invoiceNumber,
            gateway: "PAYSTATION",
            httpStatus: response.status,
            statusCode: result?.status_code,
            status: result?.status,
            success: false,
            error: result?.message || "Rejected by gateway",
          })
        );
        return {
          success: false,
          error:
            result?.message ||
            `PayStation initiation rejected (code: ${result?.status_code || "unknown"}, status: ${result?.status || "unknown"})`,
        };
      }

      if (!result.payment_url || typeof result.payment_url !== "string") {
        console.error("❌ [PayStation Initiate: Missing payment_url]", result);
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

      console.log(
        "🔗 [PayStation Initiate: Step 4] Success! Redirecting customer to PayStation checkout:",
        {
          redirectUrl: result.payment_url,
          invoiceNumber,
        }
      );

      console.info(
        "[PayStation][Initiate]",
        JSON.stringify({
          event: "initiate_success",
          orderNumber: request.orderNumber,
          invoiceNumber,
          gateway: "PAYSTATION",
          httpStatus: response.status,
          statusCode: result?.status_code,
          status: result?.status,
          success: true,
        })
      );

      return {
        success: true,
        redirectUrl: result.payment_url,
        merchantReferenceId: invoiceNumber,
      };
    } catch (err: unknown) {
      const error = err as Error;
      console.error(
        "[PayStation][Initiate]",
        JSON.stringify({
          event: "initiate_exception",
          orderNumber: request.orderNumber,
          invoiceNumber,
          gateway: "PAYSTATION",
          error: error?.message,
        })
      );
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

    const rawCallbackStatus =
      (typeof callbackPayload.status === "string" && callbackPayload.status.trim().toLowerCase()) ||
      (typeof callbackPayload.trx_status === "string" &&
        callbackPayload.trx_status.trim().toLowerCase()) ||
      (typeof callbackPayload.payment_status === "string" &&
        callbackPayload.payment_status.trim().toLowerCase()) ||
      "";

    const isExplicitCancel =
      rawCallbackStatus === "cancel" ||
      rawCallbackStatus === "canceled" ||
      rawCallbackStatus === "cancelled" ||
      rawCallbackStatus === "aborted" ||
      callbackPayload.cancel === "true" ||
      callbackPayload.cancelled === "true" ||
      callbackPayload.canceled === "true";

    if (isExplicitCancel) {
      return {
        success: false,
        status: "CANCELLED",
        isUnverified: false,
        providerTransactionId: undefined,
        verifiedMerchantReferenceId: invoiceNumber,
        error: "Customer cancelled payment on PayStation checkout",
        rawPayload: callbackPayload,
      };
    }

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
      console.log("🔍 [PayStation Verify: Step 1] Initiating server-to-server verification:", {
        invoiceNumber,
        baseUrl: this.baseUrl,
        rawCallbackStatus,
        isExplicitCancel,
      });

      const formBody = new URLSearchParams();
      formBody.append("invoice_number", invoiceNumber);

      console.log(
        `🚀 [PayStation Verify: Step 2] Querying POST ${this.baseUrl}/transaction-status for invoice: ${invoiceNumber}`
      );

      const response = await fetch(`${this.baseUrl}/transaction-status`, {
        method: "POST",
        headers: {
          merchantId: this.merchantId,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody.toString(),
        signal: AbortSignal.timeout(10000),
      });

      console.log(
        `📥 [PayStation Verify: Step 3] Transaction-status query HTTP status: ${response.status}`
      );

      if (!response.ok) {
        const isUpstreamUnavailable = response.status >= 500 || response.status === 429;

        console.warn(
          "[PayStation][Verify]",
          JSON.stringify({
            event: "transaction_status_http_error",
            invoiceNumber,
            gateway: "PAYSTATION",
            httpStatus: response.status,
            verificationResult: isUpstreamUnavailable ? "PENDING" : "FAILED",
            isUnverified: true,
            isRetryable: isUpstreamUnavailable,
            error: `HTTP ${response.status}`,
          })
        );

        return {
          success: false,
          status: isUpstreamUnavailable ? "PENDING" : "FAILED",
          isUnverified: true,
          isRetryable: isUpstreamUnavailable,
          verifiedMerchantReferenceId: invoiceNumber,
          error: `PayStation transaction-status query returned HTTP ${response.status}`,
          rawPayload: callbackPayload,
        };
      }

      const result = (await response.json()) as PaystationTransactionStatusApiResponse;
      console.log("📥 [PayStation Verify: Step 3 Response Body]", result);

      const statusCodeStr = String(result?.status_code ?? "");
      const statusStr = String(result?.status ?? "").toLowerCase();

      if (statusCodeStr !== "200" || statusStr !== "success") {
        console.warn(
          "[PayStation][Verify]",
          JSON.stringify({
            event: "transaction_status_rejected",
            invoiceNumber,
            gateway: "PAYSTATION",
            httpStatus: response.status,
            statusCode: result?.status_code,
            status: result?.status,
            verificationResult: "PENDING",
            isUnverified: true,
            isRetryable: false,
            error: result?.message || `Gateway code ${result?.status_code}`,
          })
        );

        return {
          success: false,
          status: "PENDING",
          isUnverified: true,
          verifiedMerchantReferenceId: invoiceNumber,
          error:
            result?.message ||
            `Transaction status query failed (code: ${result?.status_code}, status: ${result?.status})`,
          rawPayload: result,
        };
      }

      const data = result.data || {};
      const rawTrxStatus = String(data.trx_status || "")
        .trim()
        .toLowerCase();
      const verifiedInvoice =
        typeof data.invoice_number === "string" && data.invoice_number.trim()
          ? data.invoice_number.trim()
          : invoiceNumber;
      const candidateTrxId =
        data.trx_id !== undefined && data.trx_id !== null
          ? String(data.trx_id).trim()
          : typeof callbackPayload.trx_id === "string" || typeof callbackPayload.trx_id === "number"
            ? String(callbackPayload.trx_id).trim()
            : undefined;
      const trxId = candidateTrxId && candidateTrxId.length > 0 ? candidateTrxId : undefined;

      const amountVal =
        data.payment_amount !== undefined
          ? Number(data.payment_amount)
          : data.trx_amount !== undefined
            ? Number(data.trx_amount)
            : undefined;

      console.log("⚖️ [PayStation Verify: Step 4] Resolving transaction status:", {
        invoiceNumber: verifiedInvoice,
        rawTrxStatus: data.trx_status,
        mappedStatus:
          rawTrxStatus === "success" || rawTrxStatus === "successful"
            ? "SUCCESS"
            : rawTrxStatus === "processing" || rawTrxStatus === "pending"
              ? "PENDING"
              : rawTrxStatus,
        trxId,
        paymentAmount: data.payment_amount,
        trxAmount: data.trx_amount,
        paymentMethod: data.payment_method,
        orderDateTime: data.order_date_time,
      });

      // Status resolution
      if (rawTrxStatus === "success" || rawTrxStatus === "successful") {
        console.info(
          "[PayStation][Verify]",
          JSON.stringify({
            event: "transaction_status_result",
            invoiceNumber,
            gateway: "PAYSTATION",
            httpStatus: response.status,
            statusCode: result?.status_code,
            status: result?.status,
            trxStatus: data?.trx_status,
            verificationResult: "SUCCESS",
            isUnverified: false,
            isRetryable: false,
          })
        );

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
        rawTrxStatus === "cancel" ||
        rawTrxStatus === "canceled" ||
        rawTrxStatus === "aborted"
      ) {
        const isCancelled =
          rawTrxStatus === "cancelled" ||
          rawTrxStatus === "cancel" ||
          rawTrxStatus === "canceled" ||
          rawTrxStatus === "aborted";
        console.info(
          "[PayStation][Verify]",
          JSON.stringify({
            event: "transaction_status_result",
            invoiceNumber,
            gateway: "PAYSTATION",
            httpStatus: response.status,
            statusCode: result?.status_code,
            status: result?.status,
            trxStatus: data?.trx_status,
            verificationResult: isCancelled ? "CANCELLED" : "FAILED",
            isUnverified: false,
            isRetryable: false,
          })
        );

        return {
          success: false,
          status: isCancelled ? ("CANCELLED" as PaymentStatus) : ("FAILED" as PaymentStatus),
          isUnverified: false,
          isRetryable: false,
          providerTransactionId: trxId,
          verifiedMerchantReferenceId: verifiedInvoice,
          verifiedAmount: amountVal,
          verifiedCurrency: "BDT",
          error: `PayStation transaction finished with status: ${data.trx_status}`,
          rawPayload: result,
        };
      }

      if (rawTrxStatus === "refund") {
        console.info(
          "[PayStation][Verify]",
          JSON.stringify({
            event: "transaction_status_result",
            invoiceNumber,
            gateway: "PAYSTATION",
            httpStatus: response.status,
            statusCode: result?.status_code,
            status: result?.status,
            trxStatus: data?.trx_status,
            verificationResult: "REFUNDED",
            isUnverified: false,
            isRetryable: false,
          })
        );

        return {
          success: false,
          status: "REFUNDED" as PaymentStatus,
          isUnverified: false,
          isRetryable: false,
          providerTransactionId: trxId,
          verifiedMerchantReferenceId: verifiedInvoice,
          verifiedAmount: amountVal,
          verifiedCurrency: "BDT",
          error: "PayStation transaction was refunded",
          rawPayload: result,
        };
      }

      if (rawTrxStatus === "processing" || rawTrxStatus === "pending") {
        console.info(
          "[PayStation][Verify]",
          JSON.stringify({
            event: "transaction_status_result",
            invoiceNumber,
            gateway: "PAYSTATION",
            httpStatus: response.status,
            statusCode: result?.status_code,
            status: result?.status,
            trxStatus: data?.trx_status,
            verificationResult: "PENDING",
            isUnverified: true,
            isRetryable: true,
          })
        );

        return {
          success: false,
          status: "PENDING" as PaymentStatus,
          isUnverified: true,
          isRetryable: true,
          providerTransactionId: trxId,
          verifiedMerchantReferenceId: verifiedInvoice,
          verifiedAmount: amountVal,
          verifiedCurrency: "BDT",
          error: `PayStation transaction is still processing`,
          rawPayload: result,
        };
      }

      console.warn(
        "[PayStation][Verify]",
        JSON.stringify({
          event: "transaction_status_unrecognized",
          invoiceNumber,
          gateway: "PAYSTATION",
          httpStatus: response.status,
          trxStatus: data?.trx_status,
          verificationResult: "FAILED",
          isUnverified: true,
          isRetryable: false,
        })
      );

      return {
        success: false,
        status: "FAILED" as PaymentStatus,
        isUnverified: true,
        isRetryable: false,
        providerTransactionId: trxId,
        verifiedMerchantReferenceId: verifiedInvoice,
        error: `Unrecognized PayStation transaction status: ${data.trx_status}`,
        rawPayload: result,
      };
    } catch (err: unknown) {
      const error = err as Error;
      const isRetryableError =
        error?.name === "TimeoutError" ||
        error?.name === "AbortError" ||
        Boolean(
          error?.message &&
          (error.message.toLowerCase().includes("timeout") ||
            error.message.toLowerCase().includes("timed out") ||
            error.message.toLowerCase().includes("econnreset") ||
            error.message.toLowerCase().includes("etimedout") ||
            error.message.toLowerCase().includes("fetch failed") ||
            error.message.toLowerCase().includes("network"))
        );

      console.error(
        "[PayStation][Verify]",
        JSON.stringify({
          event: "transaction_status_error",
          invoiceNumber,
          gateway: "PAYSTATION",
          isUnverified: true,
          isRetryable: isRetryableError,
          error: error?.message,
        })
      );

      return {
        success: false,
        status: isRetryableError ? "PENDING" : "FAILED",
        isUnverified: true,
        isRetryable: isRetryableError,
        verifiedMerchantReferenceId: invoiceNumber,
        error: error?.message || "Internal error during PayStation transaction status verification",
        rawPayload: callbackPayload,
      };
    }
  }
}
