import {
  PaymentInitiationRequest,
  PaymentInitiationResponse,
  PaymentProvider,
  PaymentVerificationResult,
} from "../../types";
import { env } from "@/lib/config/env";
import { publicEnv } from "@/lib/config/public-env";

export interface BkashTokenGrantResponse {
  statusCode: string;
  statusMessage: string;
  token?: string;
  refreshToken?: string;
  id_token?: string;
  expires_in?: number;
}

export interface BkashCreatePaymentResponse {
  statusCode: string;
  statusMessage: string;
  paymentID?: string;
  bkashURL?: string;
  callbackURL?: string;
  successCallbackURL?: string;
  failureCallbackURL?: string;
  cancelledCallbackURL?: string;
  amount?: string;
  currency?: string;
  intent?: string;
  merchantInvoiceNumber?: string;
}

export interface BkashExecutePaymentResponse {
  statusCode: string;
  statusMessage: string;
  paymentID?: string;
  paymentId?: string;
  payerReference?: string;
  customerMsisdn?: string;
  payerAccount?: string;
  trxID?: string;
  trxId?: string;
  amount?: string;
  transactionStatus?: string;
  paymentExecuteTime?: string;
  currency?: string;
  intent?: string;
  merchantInvoiceNumber?: string;
}

export interface BkashQueryPaymentStatusResponse {
  statusCode: string;
  statusMessage: string;
  paymentID?: string;
  paymentId?: string;
  trxID?: string;
  trxId?: string;
  transactionStatus?: string;
  amount?: string;
  currency?: string;
  intent?: string;
  merchantInvoice?: string;
  payerReference?: string;
  customerMsisdn?: string;
  paymentExecuteTime?: string;
}

export class BkashProvider implements PaymentProvider {
  private readonly appKey = env.BKASH_APP_KEY;
  private readonly appSecret = env.BKASH_APP_SECRET;
  private readonly username = env.BKASH_USERNAME;
  private readonly password = env.BKASH_PASSWORD;
  private readonly isSandbox = env.BKASH_SANDBOX;

  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  get baseUrl(): string {
    return this.isSandbox
      ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta"
      : "https://tokenized.pay.bka.sh/v1.2.0-beta";
  }

  /**
   * Resets the cached token for testing and forced refresh.
   */
  clearCachedToken(): void {
    this.cachedToken = null;
    this.tokenExpiresAt = 0;
  }

  /**
   * Obtains a valid bKash id_token, reusing cached token if unexpired.
   */
  async getValidToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && now < this.tokenExpiresAt) {
      return this.cachedToken;
    }
    return this.grantToken();
  }

  /**
   * Calls bKash Token Grant API (/tokenized/checkout/token/grant).
   */
  async grantToken(): Promise<string> {
    if (!this.appKey || !this.appSecret || !this.username || !this.password) {
      throw new Error("bKash configuration missing: required credentials not provided");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${this.baseUrl}/tokenized/checkout/token/grant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          username: this.username,
          password: this.password,
        },
        body: JSON.stringify({
          app_key: this.appKey,
          app_secret: this.appSecret,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`bKash token grant request failed with HTTP status ${response.status}`);
      }

      const data = (await response.json()) as BkashTokenGrantResponse;

      if (data.statusCode !== "0000" || !data.id_token) {
        throw new Error(data.statusMessage || `bKash token grant error code: ${data.statusCode}`);
      }

      this.cachedToken = data.id_token;
      // Buffer token expiration by 120 seconds to prevent mid-flight expiration
      const expiresInSec = typeof data.expires_in === "number" && data.expires_in > 0 ? data.expires_in : 3600;
      this.tokenExpiresAt = Date.now() + Math.max(expiresInSec - 120, 60) * 1000;

      return this.cachedToken;
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === "AbortError") {
        throw new Error("bKash token grant timed out");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Calls bKash Create Payment API (/tokenized/checkout/create).
   */
  async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    if (!this.appKey || !this.appSecret || !this.username || !this.password) {
      return { success: false, error: "bKash configuration missing" };
    }

    const appUrl = publicEnv.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const callbackURL = `${appUrl}/api/payments/bkash/callback`;

    let idToken: string;
    try {
      idToken = await this.getValidToken();
    } catch (err: unknown) {
      const error = err as Error;
      console.error("[bKashProvider] Token acquisition failed");
      return { success: false, error: error.message || "Failed to authenticate with bKash" };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const payload = {
        mode: "0011",
        payerReference: request.customerPhone || "01700000000",
        callbackURL,
        amount: request.amount.toFixed(2),
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: request.orderNumber,
      };

      const response = await fetch(`${this.baseUrl}/tokenized/checkout/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: idToken,
          "X-APP-Key": this.appKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `bKash payment create request failed with HTTP ${response.status}`,
        };
      }

      const result = (await response.json()) as BkashCreatePaymentResponse;

      if (result.statusCode === "0000") {
        if (result.paymentID && result.bkashURL) {
          return {
            success: true,
            redirectUrl: result.bkashURL,
            merchantReferenceId: result.paymentID,
          };
        }
        return {
          success: false,
          error: "Malformed bKash response: missing paymentID or bkashURL",
        };
      }

      return {
        success: false,
        error: result.statusMessage || `Failed to initiate payment with bKash (code: ${result.statusCode})`,
      };
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === "AbortError") {
        return { success: false, error: "bKash payment initiation timed out" };
      }
      console.error("[bKashProvider] Payment initiation request failed");
      return { success: false, error: "Internal payment initiation error" };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Calls bKash Execute Payment API (/tokenized/checkout/execute).
   * Official reference: POST /tokenized/checkout/execute
   */
  async executePayment(paymentID: string, idToken?: string): Promise<BkashExecutePaymentResponse> {
    const token = idToken || (await this.getValidToken());
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${this.baseUrl}/tokenized/checkout/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: token,
          "X-APP-Key": this.appKey!,
        },
        body: JSON.stringify({ paymentID }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`bKash payment execute failed with HTTP ${response.status}`);
      }

      return (await response.json()) as BkashExecutePaymentResponse;
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === "AbortError") {
        throw new Error("bKash payment execute timed out");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Calls bKash Query Payment Status API (/tokenized/checkout/payment/status).
   * Official reference: POST /tokenized/checkout/payment/status
   */
  async queryPaymentStatus(paymentID: string, idToken?: string): Promise<BkashQueryPaymentStatusResponse> {
    const token = idToken || (await this.getValidToken());
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${this.baseUrl}/tokenized/checkout/payment/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: token,
          "X-APP-Key": this.appKey!,
        },
        body: JSON.stringify({ paymentID }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`bKash payment status query failed with HTTP ${response.status}`);
      }

      return (await response.json()) as BkashQueryPaymentStatusResponse;
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === "AbortError") {
        throw new Error("bKash payment status query timed out");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Server-side verification for bKash Tokenized Checkout callbacks.
   *
   * Official flow:
   * 1. Extract untrusted paymentID and status from callbackPayload.
   * 2. Browser callback status (cancel/failure) is untrusted: return isUnverified: true
   *    so PaymentService preserves INITIATED status and holds reservations without releasing.
   * 3. If callback claims status === "success", never trust browser input.
   *    Perform server-to-server POST /tokenized/checkout/execute with valid id_token.
   * 4. If execute times out or reports duplicate (e.g. 2029), fallback to POST /tokenized/checkout/payment/status.
   * 5. Verify statusCode === "0000", transactionStatus === "Completed", valid trxID, amount, and currency.
   */
  async verifyPayment(
    callbackPayload: Record<string, unknown>
  ): Promise<PaymentVerificationResult> {
    const paymentId =
      (typeof callbackPayload.paymentID === "string" && callbackPayload.paymentID.trim()
        ? callbackPayload.paymentID.trim()
        : undefined) ??
      (typeof callbackPayload.paymentId === "string" && callbackPayload.paymentId.trim()
        ? callbackPayload.paymentId.trim()
        : undefined);

    if (!paymentId) {
      return {
        success: false,
        status: "FAILED",
        isUnverified: true,
        error: "Missing or invalid paymentID in callback",
        rawPayload: callbackPayload,
      };
    }

    const rawStatus =
      typeof callbackPayload.status === "string" ? callbackPayload.status.toLowerCase().trim() : "";

    // 1. Browser cancel redirect: untrusted input, mark isUnverified: true
    if (rawStatus === "cancel") {
      return {
        success: false,
        status: "CANCELLED",
        isUnverified: true,
        verifiedMerchantReferenceId: paymentId,
        error: "Customer cancelled payment on bKash checkout",
        rawPayload: callbackPayload,
      };
    }

    // 2. Browser failure redirect: untrusted input, mark isUnverified: true
    if (rawStatus === "failure" || rawStatus === "fail") {
      return {
        success: false,
        status: "FAILED",
        isUnverified: true,
        verifiedMerchantReferenceId: paymentId,
        error: "Payment failed on bKash checkout",
        rawPayload: callbackPayload,
      };
    }

    // 3. Any status other than explicit "success": untrusted input, mark isUnverified: true
    if (rawStatus !== "success") {
      return {
        success: false,
        status: "FAILED",
        isUnverified: true,
        verifiedMerchantReferenceId: paymentId,
        error: `Unverified bKash callback status: ${callbackPayload.status || "missing"}`,
        rawPayload: callbackPayload,
      };
    }

    // 4. Server configuration check
    if (!this.appKey || !this.appSecret || !this.username || !this.password) {
      return {
        success: false,
        status: "FAILED",
        isUnverified: true,
        error: "bKash configuration missing",
        rawPayload: callbackPayload,
      };
    }

    let idToken: string;
    try {
      idToken = await this.getValidToken();
    } catch (err: unknown) {
      const error = err as Error;
      return {
        success: false,
        status: "FAILED",
        isUnverified: true,
        error: error.message || "Failed to authenticate with bKash for payment execution",
        rawPayload: callbackPayload,
      };
    }

    // 5. Server-to-server execute payment
    let executeResult: BkashExecutePaymentResponse | null = null;
    let executeError: Error | null = null;

    try {
      executeResult = await this.executePayment(paymentId, idToken);
    } catch (err: unknown) {
      executeError = err as Error;
    }

    // Check execute result
    if (executeResult) {
      const statusCode = String(executeResult.statusCode);
      const trxStatus =
        typeof executeResult.transactionStatus === "string"
          ? executeResult.transactionStatus.toUpperCase()
          : "";

      const executeTrxId =
        (typeof executeResult.trxID === "string" && executeResult.trxID.trim()
          ? executeResult.trxID.trim()
          : undefined) ??
        (typeof executeResult.trxId === "string" && executeResult.trxId.trim()
          ? executeResult.trxId.trim()
          : undefined);

      if (statusCode === "0000" && trxStatus === "COMPLETED" && executeTrxId) {
        const returnedPaymentId =
          (typeof executeResult.paymentID === "string" && executeResult.paymentID.trim()
            ? executeResult.paymentID.trim()
            : undefined) ??
          (typeof executeResult.paymentId === "string" && executeResult.paymentId.trim()
            ? executeResult.paymentId.trim()
            : undefined) ??
          "";
        const returnedInvoice =
          typeof executeResult.merchantInvoiceNumber === "string"
            ? executeResult.merchantInvoiceNumber.trim()
            : "";

        if (!returnedPaymentId || returnedPaymentId !== paymentId) {
          return {
            success: false,
            status: "FAILED",
            isUnverified: false,
            error: !returnedPaymentId
              ? "Missing paymentID in bKash execution response"
              : `Mismatched paymentID in bKash execution response: expected ${paymentId}, got ${returnedPaymentId}`,
            rawPayload: executeResult,
          };
        }

        if (!returnedInvoice) {
          return {
            success: false,
            status: "FAILED",
            isUnverified: false,
            error: "Missing or empty merchantInvoiceNumber in bKash execution response",
            rawPayload: executeResult,
          };
        }

        const amount = Number(executeResult.amount);
        const currency =
          typeof executeResult.currency === "string"
            ? executeResult.currency.toUpperCase()
            : undefined;

        if (!Number.isFinite(amount) || amount <= 0 || !currency) {
          return {
            success: false,
            status: "FAILED",
            isUnverified: false,
            error: "Incomplete or malformed verification response from bKash",
            rawPayload: executeResult,
          };
        }

        return {
          success: true,
          status: "SUCCESS",
          providerTransactionId: executeTrxId,
          verifiedMerchantReferenceId: returnedPaymentId,
          verifiedOrderNumber: returnedInvoice,
          verifiedAmount: amount,
          verifiedCurrency: currency,
          isUnverified: false,
          rawPayload: executeResult,
        };
      }

      // Explicit cancellation code from gateway
      if (statusCode === "2050") {
        return {
          success: false,
          status: "CANCELLED",
          isUnverified: false,
          error: executeResult.statusMessage || "Payment cancelled on bKash",
          rawPayload: executeResult,
        };
      }

      // Check if execute returned a code that may mean already executed or duplicate (e.g. 2029 or 2005)
      const isPotentialDuplicateOrInFlight =
        statusCode === "2029" || statusCode === "2005" || statusCode === "2068";
      if (!isPotentialDuplicateOrInFlight) {
        return {
          success: false,
          status: "FAILED",
          isUnverified: false,
          error: executeResult.statusMessage || `bKash execute failed with code ${statusCode}`,
          rawPayload: executeResult,
        };
      }
    }

    // 6. Fallback to Query Payment Status:
    // Called when execute timed out, encountered a network error, or returned a potential duplicate status (2029/2005)
    try {
      const queryResult = await this.queryPaymentStatus(paymentId, idToken);
      const queryStatusCode = String(queryResult.statusCode);
      const queryTrxStatus =
        typeof queryResult.transactionStatus === "string"
          ? queryResult.transactionStatus.toUpperCase()
          : "";

      const queryTrxId =
        (typeof queryResult.trxID === "string" && queryResult.trxID.trim()
          ? queryResult.trxID.trim()
          : undefined) ??
        (typeof queryResult.trxId === "string" && queryResult.trxId.trim()
          ? queryResult.trxId.trim()
          : undefined);

      if (queryStatusCode === "0000" && queryTrxStatus === "COMPLETED" && queryTrxId) {
        const returnedPaymentId =
          (typeof queryResult.paymentID === "string" && queryResult.paymentID.trim()
            ? queryResult.paymentID.trim()
            : undefined) ??
          (typeof queryResult.paymentId === "string" && queryResult.paymentId.trim()
            ? queryResult.paymentId.trim()
            : undefined) ??
          "";
        const returnedInvoice =
          typeof queryResult.merchantInvoice === "string"
            ? queryResult.merchantInvoice.trim()
            : "";

        if (!returnedPaymentId || returnedPaymentId !== paymentId) {
          return {
            success: false,
            status: "FAILED",
            isUnverified: false,
            error: !returnedPaymentId
              ? "Missing paymentID in bKash query response"
              : `Mismatched paymentID in bKash query response: expected ${paymentId}, got ${returnedPaymentId}`,
            rawPayload: queryResult,
          };
        }

        if (!returnedInvoice) {
          return {
            success: false,
            status: "FAILED",
            isUnverified: false,
            error: "Missing or empty merchantInvoice in bKash query response",
            rawPayload: queryResult,
          };
        }

        const amount = Number(queryResult.amount);
        const currency =
          typeof queryResult.currency === "string"
            ? queryResult.currency.toUpperCase()
            : undefined;

        if (!Number.isFinite(amount) || amount <= 0 || !currency) {
          return {
            success: false,
            status: "FAILED",
            isUnverified: false,
            error: "Incomplete or malformed query response from bKash",
            rawPayload: queryResult,
          };
        }

        return {
          success: true,
          status: "SUCCESS",
          providerTransactionId: queryTrxId,
          verifiedMerchantReferenceId: returnedPaymentId,
          verifiedOrderNumber: returnedInvoice,
          verifiedAmount: amount,
          verifiedCurrency: currency,
          isUnverified: false,
          rawPayload: queryResult,
        };
      }

      if (queryTrxStatus === "INITIATED") {
        return {
          success: false,
          status: "FAILED",
          isUnverified: true,
          error: "Payment execution pending or unconfirmed at gateway",
          rawPayload: queryResult,
        };
      }

      if (queryTrxStatus === "CANCELED" || queryTrxStatus === "CANCELLED") {
        return {
          success: false,
          status: "CANCELLED",
          isUnverified: false,
          error: queryResult.statusMessage || "Payment cancelled on bKash",
          rawPayload: queryResult,
        };
      }

      return {
        success: false,
        status: "FAILED",
        isUnverified: false,
        error:
          queryResult.statusMessage ||
          `bKash payment query returned status ${queryTrxStatus || queryStatusCode}`,
        rawPayload: queryResult,
      };
    } catch {
      // Both execute and query encountered network issues or timeouts
      return {
        success: false,
        status: "FAILED",
        isUnverified: true,
        error: executeError?.message || "bKash gateway verification timed out",
        rawPayload: callbackPayload,
      };
    }
  }
}
