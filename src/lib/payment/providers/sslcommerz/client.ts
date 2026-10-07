import {
  PaymentInitiationRequest,
  PaymentInitiationResponse,
  PaymentProvider,
  PaymentVerificationResult,
} from "../../types";
import { env } from "@/lib/config/env";
import { publicEnv } from "@/lib/config/public-env";

export class SSLCommerzProvider implements PaymentProvider {
  private readonly storeId = env.SSLCOMMERZ_STORE_ID;
  private readonly storePassword = env.SSLCOMMERZ_STORE_PASSWORD;
  private readonly isSandbox = env.SSLCOMMERZ_SANDBOX;

  private get baseUrl() {
    return this.isSandbox ? "https://sandbox.sslcommerz.com" : "https://securepay.sslcommerz.com";
  }

  async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    if (!this.storeId || !this.storePassword) {
      return { success: false, error: "SSLCommerz configuration missing" };
    }

    const merchantReferenceId = `SSLC-${request.orderNumber}-${Date.now()}`;

    // We assume publicEnv.NEXT_PUBLIC_APP_URL is available
    const appUrl = publicEnv.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const data = new URLSearchParams();
    data.append("store_id", this.storeId);
    data.append("store_passwd", this.storePassword);
    data.append("total_amount", request.amount.toString());
    data.append("currency", "BDT");
    data.append("tran_id", merchantReferenceId);
    data.append("success_url", `${appUrl}/api/payments/sslcommerz/callback?status=success`);
    data.append("fail_url", `${appUrl}/api/payments/sslcommerz/callback?status=fail`);
    data.append("cancel_url", `${appUrl}/api/payments/sslcommerz/callback?status=cancel`);
    data.append("emi_option", "0");
    data.append("cus_name", request.customerName);
    data.append("cus_email", request.customerEmail);
    data.append("cus_add1", request.shippingStreet);
    data.append("cus_city", request.shippingCity);
    data.append("cus_postcode", request.shippingZip);
    data.append("cus_country", request.shippingCountry);
    data.append("cus_phone", request.customerPhone);
    data.append("shipping_method", "NO");
    data.append("product_name", `Order ${request.orderNumber}`);
    data.append("product_category", "Ecommerce");
    data.append("product_profile", "general");

    try {
      const response = await fetch(`${this.baseUrl}/gwprocess/v4/api.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: data.toString(),
      });

      const result = await response.json();

      if (result.status === "SUCCESS" && result.GatewayPageURL) {
        return {
          success: true,
          redirectUrl: result.GatewayPageURL,
          merchantReferenceId,
        };
      }

      return {
        success: false,
        error: result.failedreason || "Failed to initiate payment with SSLCommerz",
      };
    } catch {
      console.error("[SSLCommerz] Payment initiation request failed");
      return { success: false, error: "Internal payment initiation error" };
    }
  }

  async verifyPayment(
    callbackPayload: Record<string, unknown>
  ): Promise<PaymentVerificationResult> {
    if (!this.storeId || !this.storePassword) {
      return { success: false, status: "FAILED", error: "SSLCommerz configuration missing" };
    }

    const { val_id, status } = callbackPayload as { val_id?: string; status?: string };

    if (status === "CANCELLED" || status === "UNATTEMPTED") {
      return {
        success: true,
        status: "CANCELLED",
        rawPayload: callbackPayload,
      };
    }

    if (status === "FAILED") {
      return {
        success: true,
        status: "FAILED",
        rawPayload: callbackPayload,
      };
    }

    if (!val_id) {
      return {
        success: false,
        status: "FAILED",
        error: "Missing val_id for verification",
        rawPayload: callbackPayload,
      };
    }

    // Verify with validation API
    try {
      const url = new URL(`${this.baseUrl}/validator/api/validationserverAPI.php`);
      url.searchParams.append("val_id", val_id);
      url.searchParams.append("store_id", this.storeId);
      url.searchParams.append("store_passwd", this.storePassword);
      url.searchParams.append("v", "1");
      url.searchParams.append("format", "json");

      const response = await fetch(url.toString(), {
        method: "GET",
      });

      const result = await response.json();

      if (result.status === "VALID" || result.status === "VALIDATED") {
        return {
          success: true,
          status: "SUCCESS",
          providerTransactionId: result.bank_tran_id,
          verifiedAmount: parseFloat(result.amount),
          rawPayload: result,
        };
      } else {
        return {
          success: false,
          status: "FAILED",
          error: "Verification failed on SSLCommerz server",
          rawPayload: result,
        };
      }
    } catch {
      console.error("[SSLCommerz] Payment verification request failed");
      return { success: false, status: "FAILED", error: "Verification request failed" };
    }
  }

  async refundPayment(request: {
    refundId: string;
    paymentId: string;
    gatewayTransactionId: string;
    amount: number;
    reason?: string;
  }): Promise<{
    success: boolean;
    gatewayRefundRef?: string;
    error?: string;
    unknownResult?: boolean;
  }> {
    if (!this.storeId || !this.storePassword) {
      return { success: false, error: "SSLCommerz configuration missing" };
    }

    try {
      const url = new URL(`${this.baseUrl}/validator/api/merchantTransIDvalidationAPI.php`);
      url.searchParams.append("refund_amount", request.amount.toString());
      url.searchParams.append("refund_remarks", request.reason || "Refund requested");
      url.searchParams.append("bank_tran_id", request.gatewayTransactionId);
      url.searchParams.append("refe_id", request.refundId);
      url.searchParams.append("store_id", this.storeId);
      url.searchParams.append("store_passwd", this.storePassword);
      url.searchParams.append("v", "1");
      url.searchParams.append("format", "json");

      const response = await fetch(url.toString(), {
        method: "GET",
      });

      if (!response.ok) {
        return {
          success: false,
          error: "Refund provider returned an HTTP error",
          unknownResult: true,
        };
      }

      const result = await response.json();

      if (result.APIConnect === "DONE" && result.status === "success") {
        return {
          success: true,
          gatewayRefundRef: result.refund_ref_id || result.trans_id || request.refundId,
        };
      } else if (result.APIConnect === "DONE" && result.status === "failed") {
        return {
          success: false,
          error: "Refund failed on SSLCommerz server",
        };
      } else {
        return {
          success: false,
          error: "Refund provider returned an unknown result",
          unknownResult: true,
        };
      }
    } catch {
      console.error("[SSLCommerz] Refund request failed");
      return {
        success: false,
        error: "Refund request failed due to network or timeout",
        unknownResult: true,
      };
    }
  }
}
