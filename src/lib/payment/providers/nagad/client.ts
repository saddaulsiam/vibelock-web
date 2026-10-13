import {
  PaymentInitiationRequest,
  PaymentInitiationResponse,
  PaymentProvider,
  PaymentVerificationResult,
} from "../../types";
import { env } from "@/lib/config/env";
import { publicEnv } from "@/lib/config/public-env";
import {
  formatNagadDateTime,
  generateChallenge,
  encryptWithPublicKey,
  decryptWithPrivateKey,
  signWithPrivateKey,
} from "./crypto";
import type {
  NagadInitializeRequestBody,
  NagadInitializeResponse,
  NagadDecryptedInitializeData,
  NagadCompleteRequestBody,
  NagadCompleteResponse,
  NagadVerifyPaymentResponse,
} from "./types";

export class NagadProvider implements PaymentProvider {
  private get merchantId() {
    return env.NAGAD_MERCHANT_ID;
  }
  private get merchantNumber() {
    return env.NAGAD_MERCHANT_NUMBER;
  }
  private get pgPublicKey() {
    return env.NAGAD_PG_PUBLIC_KEY;
  }
  private get merchantPrivateKey() {
    return env.NAGAD_MERCHANT_PRIVATE_KEY;
  }
  private get isSandbox() {
    return env.NAGAD_SANDBOX;
  }

  get baseUrl(): string {
    return this.isSandbox
      ? "https://api-sandbox.mynagad.com/api/dfs"
      : "https://api.mynagad.com/api/dfs";
  }

  private get headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "X-KM-Api-Version": "v-0.2.0",
      "X-KM-IP-V4": "127.0.0.1",
      "X-KM-Client-Type": "PC_WEB",
    };
  }

  /**
   * Step 1: Handshake & Initialize + Step 2: Complete & Fetch Gateway Redirect URL
   */
  async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    if (
      !this.merchantId ||
      !this.merchantNumber ||
      !this.pgPublicKey ||
      !this.merchantPrivateKey
    ) {
      console.error("[NagadProvider] Missing Nagad credentials in environment.");
      return {
        success: false,
        error: "Nagad credentials not configured",
      };
    }

    try {
      const orderId = request.orderNumber;
      const dateTime = formatNagadDateTime();
      const clientChallenge = generateChallenge();

      // --- STEP 1: Initialize ---
      const sensitiveDataInit = {
        merchantId: this.merchantId,
        datetime: dateTime,
        orderId,
        challenge: clientChallenge,
      };

      const sensitiveJsonInit = JSON.stringify(sensitiveDataInit);
      const encryptedSensitiveDataInit = encryptWithPublicKey(sensitiveJsonInit, this.pgPublicKey);
      const signatureInit = signWithPrivateKey(sensitiveJsonInit, this.merchantPrivateKey);

      const initPayload: NagadInitializeRequestBody = {
        dateTime,
        sensitiveData: encryptedSensitiveDataInit,
        signature: signatureInit,
      };

      const initUrl = `${this.baseUrl}/check-out/initialize/${this.merchantId}/${orderId}`;
      const initRes = await fetch(initUrl, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(initPayload),
      });

      if (!initRes.ok) {
        const errorText = await initRes.text();
        console.error(`[NagadProvider] Initialize HTTP ${initRes.status} error:`, errorText);
        return {
          success: false,
          error: `Nagad initiation failed (HTTP ${initRes.status})`,
        };
      }

      const initData: NagadInitializeResponse = await initRes.json();

      let paymentReferenceId: string | undefined;
      let serverChallenge: string = clientChallenge;

      if (initData.sensitiveData) {
        try {
          const decryptedJson = decryptWithPrivateKey(
            initData.sensitiveData,
            this.merchantPrivateKey
          );
          const decrypted: NagadDecryptedInitializeData = JSON.parse(decryptedJson);
          paymentReferenceId = decrypted.paymentReferenceId;
          serverChallenge = decrypted.challenge || clientChallenge;
        } catch (decryptErr) {
          console.error("[NagadProvider] Failed to decrypt sensitiveData from initialize response:", decryptErr);
          return {
            success: false,
            error: "Failed to parse Nagad security response",
          };
        }
      } else if (initData.paymentReferenceId) {
        // Fallback for mocked or direct-format responses
        paymentReferenceId = initData.paymentReferenceId;
        serverChallenge = initData.challenge || clientChallenge;
      }

      if (!paymentReferenceId) {
        console.error("[NagadProvider] Missing paymentReferenceId in response:", initData);
        return {
          success: false,
          error: initData.message || initData.reason || "Missing payment reference from Nagad",
        };
      }

      // --- STEP 2: Complete Checkout / Place Order ---
      const callbackUrl = new URL(
        "/api/payments/nagad/callback",
        publicEnv.NEXT_PUBLIC_APP_URL
      ).toString();

      const sensitiveDataComplete = {
        merchantId: this.merchantId,
        orderId,
        currencyCode: "050", // 050 for BDT
        amount: request.amount.toFixed(2),
        challenge: serverChallenge,
        merchantCallbackURL: callbackUrl,
      };

      const sensitiveJsonComplete = JSON.stringify(sensitiveDataComplete);
      const encryptedSensitiveDataComplete = encryptWithPublicKey(
        sensitiveJsonComplete,
        this.pgPublicKey
      );
      const signatureComplete = signWithPrivateKey(
        sensitiveJsonComplete,
        this.merchantPrivateKey
      );

      const completePayload: NagadCompleteRequestBody = {
        merchantId: this.merchantId,
        orderId,
        sensitiveData: encryptedSensitiveDataComplete,
        signature: signatureComplete,
        paymentRefId: paymentReferenceId,
      };

      const completeUrl = `${this.baseUrl}/check-out/complete/${paymentReferenceId}`;
      const completeRes = await fetch(completeUrl, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(completePayload),
      });

      if (!completeRes.ok) {
        const errorText = await completeRes.text();
        console.error(`[NagadProvider] Complete HTTP ${completeRes.status} error:`, errorText);
        return {
          success: false,
          error: `Nagad completion failed (HTTP ${completeRes.status})`,
        };
      }

      const completeData: NagadCompleteResponse = await completeRes.json();
      const redirectUrl = completeData.callBackUrl || completeData.callbackUrl;

      if (!redirectUrl) {
        console.error("[NagadProvider] No redirect URL in complete response:", completeData);
        return {
          success: false,
          error: completeData.message || completeData.reason || "Payment URL not generated by Nagad",
        };
      }

      return {
        success: true,
        redirectUrl,
        merchantReferenceId: paymentReferenceId,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[NagadProvider] Payment initiation exception:", message);
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Step 3: Callback verification and Server-to-Server Payment Query
   */
  async verifyPayment(
    callbackPayload: Record<string, unknown>
  ): Promise<PaymentVerificationResult> {
    const paymentRefId =
      (typeof callbackPayload.payment_ref_id === "string" && callbackPayload.payment_ref_id.trim()
        ? callbackPayload.payment_ref_id.trim()
        : undefined) ??
      (typeof callbackPayload.paymentRefId === "string" && callbackPayload.paymentRefId.trim()
        ? callbackPayload.paymentRefId.trim()
        : undefined) ??
      (typeof callbackPayload.paymentId === "string" && callbackPayload.paymentId.trim()
        ? callbackPayload.paymentId.trim()
        : undefined) ??
      (typeof callbackPayload.tran_id === "string" && callbackPayload.tran_id.trim()
        ? callbackPayload.tran_id.trim()
        : undefined);

    const rawStatus =
      typeof callbackPayload.status === "string"
        ? callbackPayload.status.trim().toUpperCase()
        : "";

    // Safeguard: Never trust browser-provided cancellation or failure without server-side verification.
    // If incoming browser callback signals cancelled or aborted, return isUnverified: true
    if (rawStatus === "ABORTED" || rawStatus === "CANCELLED" || rawStatus === "CANCEL") {
      return {
        success: false,
        status: "CANCELLED",
        isUnverified: true,
        verifiedMerchantReferenceId: paymentRefId,
        rawPayload: callbackPayload,
        error: "Customer cancelled payment on Nagad gateway",
      };
    }

    if (rawStatus === "FAILED" || rawStatus === "FAIL") {
      return {
        success: false,
        status: "FAILED",
        isUnverified: true,
        verifiedMerchantReferenceId: paymentRefId,
        rawPayload: callbackPayload,
        error: "Payment failed on Nagad gateway",
      };
    }

    if (!paymentRefId) {
      return {
        success: false,
        status: "FAILED",
        isUnverified: true,
        error: "Missing payment reference identifier in callback",
        rawPayload: callbackPayload,
      };
    }

    // Server-to-server query verification: GET /verify/payment/{paymentRefId}
    try {
      const verifyUrl = `${this.baseUrl}/verify/payment/${paymentRefId}`;
      const verifyRes = await fetch(verifyUrl, {
        method: "GET",
        headers: this.headers,
      });

      if (!verifyRes.ok) {
        const errorText = await verifyRes.text();
        console.error(`[NagadProvider] Server verification HTTP ${verifyRes.status}:`, errorText);
        return {
          success: false,
          status: "FAILED",
          isUnverified: true,
          error: `Nagad payment query failed (HTTP ${verifyRes.status})`,
          rawPayload: callbackPayload,
        };
      }

      const verifyData: NagadVerifyPaymentResponse = await verifyRes.json();
      const statusUpper = (verifyData.status || "").trim().toUpperCase();
      const isSuccess = statusUpper === "SUCCESS";

      if (isSuccess) {
        const amountNum = parseFloat(verifyData.amount);
        return {
          success: true,
          status: "SUCCESS",
          providerTransactionId: verifyData.issuerPaymentRefNo || verifyData.paymentRefId,
          verifiedMerchantReferenceId: verifyData.paymentRefId || paymentRefId,
          verifiedOrderNumber: verifyData.orderId,
          verifiedAmount: isNaN(amountNum) ? undefined : amountNum,
          verifiedCurrency: "BDT",
          rawPayload: verifyData,
        };
      } else {
        const isAborted = statusUpper === "ABORTED" || statusUpper === "CANCELLED";
        return {
          success: false,
          status: isAborted ? "CANCELLED" : "FAILED",
          isUnverified: false, // Server-to-server authoritative failure
          providerTransactionId: verifyData.issuerPaymentRefNo || verifyData.paymentRefId,
          verifiedMerchantReferenceId: verifyData.paymentRefId || paymentRefId,
          verifiedOrderNumber: verifyData.orderId,
          rawPayload: verifyData,
          error: verifyData.message || `Nagad payment status: ${verifyData.status}`,
        };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown network error";
      console.error("[NagadProvider] Server verification network exception:", message);
      return {
        success: false,
        status: "PENDING",
        isUnverified: true,
        error: `Could not verify payment with Nagad: ${message}`,
        rawPayload: callbackPayload,
      };
    }
  }
}
