import {
  PaymentInitiationRequest,
  PaymentInitiationResponse,
  PaymentProvider,
  PaymentVerificationResult,
  VerifiedCaptureCandidate,
} from "../../types";
import { PaymentStatus } from "@prisma/client";
import { env } from "@/lib/config/env";
import { publicEnv } from "@/lib/config/public-env";

function sanitizeCapturePayload(raw: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k.toLowerCase() === "card_no" || k.toLowerCase() === "card_number") {
      continue;
    }
    sanitized[k] = v;
  }
  return sanitized;
}

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
    data.append("ipn_url", `${appUrl}/api/payments/sslcommerz/callback?status=ipn`);
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
        const sessionKey =
          typeof result.sessionkey === "string" && result.sessionkey.trim()
            ? result.sessionkey.trim()
            : undefined;

        return {
          success: true,
          redirectUrl: result.GatewayPageURL,
          merchantReferenceId,
          sessionKey,
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
      return {
        success: false,
        status: "FAILED",
        isUnverified: true,
        error: "SSLCommerz configuration missing",
      };
    }

    const { val_id } = callbackPayload as { val_id?: string };
    const tranId =
      typeof callbackPayload.tran_id === "string" && callbackPayload.tran_id.trim()
        ? callbackPayload.tran_id.trim()
        : undefined;

    // 1. Primary path: if val_id is present, perform server-side validation via validationserverAPI.php
    if (val_id) {
      try {
        const url = new URL(`${this.baseUrl}/validator/api/validationserverAPI.php`);
        url.searchParams.append("val_id", val_id);
        url.searchParams.append("store_id", this.storeId);
        url.searchParams.append("store_passwd", this.storePassword);
        url.searchParams.append("v", "1");
        url.searchParams.append("format", "json");

        const response = await fetch(url.toString(), {
          method: "GET",
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          const { logSecurityAlert, hashSecurityIdentifier } = await import(
            "@/lib/monitoring/security-logger"
          );
          logSecurityAlert("PAYMENT_TAMPERING_DETECTED", {
            endpoint: "sslcommerz/verifyPayment",
            gateway: "sslcommerz",
            reason: "gateway_query_failed",
            referenceHash: hashSecurityIdentifier(tranId || val_id),
          });
          return {
            success: false,
            status: "FAILED",
            isUnverified: true,
            verifiedMerchantReferenceId: tranId,
            error: `Gateway validation API returned HTTP ${response.status}`,
            rawPayload: callbackPayload,
          };
        }

        const result = await response.json();
        const normalized = this.normalizeGatewayStatus(result.status);

        if (normalized === "SUCCESS") {
          const amount = Number(result.amount);
          const currency =
            typeof result.currency === "string" ? result.currency.trim().toUpperCase() : undefined;

          if (!Number.isFinite(amount) || !currency || !result.tran_id) {
            return {
              success: false,
              status: "FAILED",
              isUnverified: false,
              error: "Incomplete validation response from SSLCommerz",
              rawPayload: result,
            };
          }

          const sanitizedPayload = sanitizeCapturePayload(result);
          const candidate: VerifiedCaptureCandidate = {
            bankTranId:
              typeof result.bank_tran_id === "string" && result.bank_tran_id.trim()
                ? result.bank_tran_id.trim()
                : undefined,
            valId:
              typeof result.val_id === "string" && result.val_id.trim()
                ? result.val_id.trim()
                : undefined,
            cardType:
              typeof result.card_type === "string" && result.card_type.trim()
                ? result.card_type.trim()
                : undefined,
            cardBrand:
              typeof result.card_brand === "string" && result.card_brand.trim()
                ? result.card_brand.trim()
                : undefined,
            amount,
            currency,
            status: PaymentStatus.SUCCESS,
            riskLevel:
              result.risk_level !== undefined && result.risk_level !== null
                ? String(result.risk_level).trim()
                : undefined,
            riskTitle:
              typeof result.risk_title === "string" && result.risk_title.trim()
                ? result.risk_title.trim()
                : undefined,
            tranDate:
              typeof result.tran_date === "string" && result.tran_date.trim()
                ? result.tran_date.trim()
                : undefined,
            rawPayload: sanitizedPayload,
          };

          return {
            success: true,
            status: "SUCCESS",
            providerTransactionId: result.bank_tran_id || result.val_id,
            verifiedMerchantReferenceId: result.tran_id,
            verifiedAmount: amount,
            verifiedCurrency: currency,
            candidates: [candidate],
            rawPayload: sanitizedPayload,
            isUnverified: false,
          };
        } else if (normalized === "CANCELLED") {
          return {
            success: false,
            status: "CANCELLED",
            providerTransactionId: result.bank_tran_id || result.val_id,
            verifiedMerchantReferenceId: result.tran_id,
            verifiedAmount: Number(result.amount) || undefined,
            verifiedCurrency:
              typeof result.currency === "string"
                ? result.currency.trim().toUpperCase()
                : undefined,
            rawPayload: result,
            isUnverified: false,
          };
        } else if (normalized === "FAILED") {
          return {
            success: false,
            status: "FAILED",
            providerTransactionId: result.bank_tran_id || result.val_id,
            verifiedMerchantReferenceId: result.tran_id,
            verifiedAmount: Number(result.amount) || undefined,
            verifiedCurrency:
              typeof result.currency === "string"
                ? result.currency.trim().toUpperCase()
                : undefined,
            error:
              (result.failedreason as string) ||
              (result.error as string) ||
              `Payment failed on SSLCommerz server (${result.status})`,
            rawPayload: result,
            isUnverified: false,
          };
        } else {
          // Unknown or pending gateway status from validation API: do not mark as failed!
          const { logSecurityAlert, hashSecurityIdentifier } = await import(
            "@/lib/monitoring/security-logger"
          );
          logSecurityAlert("PAYMENT_TAMPERING_DETECTED", {
            endpoint: "sslcommerz/verifyPayment",
            gateway: "sslcommerz",
            reason: "unknown_gateway_status",
            referenceHash: hashSecurityIdentifier(result.tran_id || tranId || val_id),
            status: String(result.status),
          });
          return {
            success: false,
            status: "FAILED",
            isUnverified: true,
            verifiedMerchantReferenceId: result.tran_id || tranId,
            error: `Unknown or pending gateway status: ${result.status}`,
            rawPayload: result,
          };
        }
      } catch (err) {
        console.error("[SSLCommerz] Payment validation request failed:", err);
        const { logSecurityAlert, hashSecurityIdentifier } = await import(
          "@/lib/monitoring/security-logger"
        );
        logSecurityAlert("PAYMENT_TAMPERING_DETECTED", {
          endpoint: "sslcommerz/verifyPayment",
          gateway: "sslcommerz",
          reason: "gateway_query_failed",
          referenceHash: hashSecurityIdentifier(tranId || val_id),
        });
        return {
          success: false,
          status: "FAILED",
          isUnverified: true,
          verifiedMerchantReferenceId: tranId,
          error: "Verification request failed",
          rawPayload: callbackPayload,
        };
      }
    }

    // 2. Fallback path: when val_id is missing, query Merchant Transaction ID Validation API
    if (!tranId) {
      return {
        success: false,
        status: "FAILED",
        isUnverified: true,
        error: "Missing tran_id and val_id for server-side verification",
        rawPayload: callbackPayload,
      };
    }

    return this.queryTransactionByTranId(tranId, callbackPayload);
  }

  private async queryTransactionByTranId(
    tranId: string,
    callbackPayload: Record<string, unknown>
  ): Promise<PaymentVerificationResult> {
    try {
      const url = new URL(`${this.baseUrl}/validator/api/merchantTransIDvalidationAPI.php`);
      url.searchParams.append("tran_id", tranId);
      url.searchParams.append("store_id", this.storeId!);
      url.searchParams.append("store_passwd", this.storePassword!);
      url.searchParams.append("format", "json");
      url.searchParams.append("v", "1");

      const response = await fetch(url.toString(), {
        method: "GET",
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const { logSecurityAlert, hashSecurityIdentifier } = await import(
          "@/lib/monitoring/security-logger"
        );
        logSecurityAlert("PAYMENT_TAMPERING_DETECTED", {
          endpoint: "sslcommerz/verifyPayment",
          gateway: "sslcommerz",
          reason: "gateway_query_failed",
          referenceHash: hashSecurityIdentifier(tranId),
        });
        return {
          success: false,
          status: "FAILED",
          isUnverified: true,
          verifiedMerchantReferenceId: tranId,
          error: `Gateway query API returned HTTP ${response.status}`,
          rawPayload: callbackPayload,
        };
      }

      const result = await response.json();

      if (!result || typeof result !== "object" || result.APIConnect !== "DONE") {
        const { logSecurityAlert, hashSecurityIdentifier } = await import(
          "@/lib/monitoring/security-logger"
        );
        logSecurityAlert("PAYMENT_TAMPERING_DETECTED", {
          endpoint: "sslcommerz/verifyPayment",
          gateway: "sslcommerz",
          reason: "gateway_query_failed",
          referenceHash: hashSecurityIdentifier(tranId),
        });
        return {
          success: false,
          status: "FAILED",
          isUnverified: true,
          verifiedMerchantReferenceId: tranId,
          error: (result?.failedreason as string) || "Gateway query did not complete successfully",
          rawPayload: result,
        };
      }

      if (!Array.isArray(result.element) || result.element.length === 0) {
        const { logSecurityAlert, hashSecurityIdentifier } = await import(
          "@/lib/monitoring/security-logger"
        );
        logSecurityAlert("PAYMENT_TAMPERING_DETECTED", {
          endpoint: "sslcommerz/verifyPayment",
          gateway: "sslcommerz",
          reason: "no_transaction_found",
          referenceHash: hashSecurityIdentifier(tranId),
        });
        return {
          success: false,
          status: "FAILED",
          isUnverified: true,
          verifiedMerchantReferenceId: tranId,
          error: "No transaction records found at gateway for merchant transaction ID",
          rawPayload: result,
        };
      }

      // Safely locate all matching tran_id records
      const matchedRecords = (result.element as Array<Record<string, unknown>>).filter(
        (el: unknown) =>
          el && typeof el === "object" && (el as Record<string, unknown>).tran_id === tranId
      );

      if (matchedRecords.length === 0) {
        const { logSecurityAlert, hashSecurityIdentifier } = await import(
          "@/lib/monitoring/security-logger"
        );
        logSecurityAlert("PAYMENT_TAMPERING_DETECTED", {
          endpoint: "sslcommerz/verifyPayment",
          gateway: "sslcommerz",
          reason: "transaction_reference_mismatch",
          referenceHash: hashSecurityIdentifier(tranId),
        });
        return {
          success: false,
          status: "FAILED",
          isUnverified: true,
          verifiedMerchantReferenceId: tranId,
          error: "No matching tran_id found in gateway query elements",
          rawPayload: result,
        };
      }

      // Map all matched records to VerifiedCaptureCandidate
      const candidates: VerifiedCaptureCandidate[] = matchedRecords.map((rec) => {
        const normStatus = this.normalizeGatewayStatus(rec.status);
        const mappedStatus =
          normStatus === "SUCCESS"
            ? PaymentStatus.SUCCESS
            : normStatus === "CANCELLED"
              ? PaymentStatus.CANCELLED
              : normStatus === "FAILED"
                ? PaymentStatus.FAILED
                : PaymentStatus.PENDING;

        return {
          bankTranId:
            typeof rec.bank_tran_id === "string" && rec.bank_tran_id.trim()
              ? rec.bank_tran_id.trim()
              : undefined,
          valId:
            typeof rec.val_id === "string" && rec.val_id.trim()
              ? rec.val_id.trim()
              : undefined,
          cardType:
            typeof rec.card_type === "string" && rec.card_type.trim()
              ? rec.card_type.trim()
              : undefined,
          cardBrand:
            typeof rec.card_brand === "string" && rec.card_brand.trim()
              ? rec.card_brand.trim()
              : undefined,
          amount: Number(rec.amount),
          currency:
            typeof rec.currency === "string" ? rec.currency.trim().toUpperCase() : "",
          status: mappedStatus,
          riskLevel:
            rec.risk_level !== undefined && rec.risk_level !== null
              ? String(rec.risk_level).trim()
              : undefined,
          riskTitle:
            typeof rec.risk_title === "string" && rec.risk_title.trim()
              ? rec.risk_title.trim()
              : undefined,
          tranDate:
            typeof rec.tran_date === "string" && rec.tran_date.trim()
              ? rec.tran_date.trim()
              : undefined,
          rawPayload: sanitizeCapturePayload(rec),
        };
      });

      // Filter and sort successful candidates deterministically: earliest tranDate, tiebreaker bankTranId
      const validCandidates = candidates.filter((c) => c.status === PaymentStatus.SUCCESS);
      validCandidates.sort((a, b) => {
        if (a.tranDate && b.tranDate) {
          const tA = new Date(a.tranDate).getTime();
          const tB = new Date(b.tranDate).getTime();
          if (!isNaN(tA) && !isNaN(tB) && tA !== tB) {
            return tA - tB;
          }
        }
        const bA = a.bankTranId ?? "";
        const bB = b.bankTranId ?? "";
        return bA.localeCompare(bB);
      });

      // If at least one successful candidate exists
      if (validCandidates.length > 0) {
        const primaryCandidate = validCandidates[0];

        // Currency check: log alert if mismatched, but preserve trustworthy evidence
        if (primaryCandidate.currency !== "BDT") {
          const { logSecurityAlert, hashSecurityIdentifier } = await import(
            "@/lib/monitoring/security-logger"
          );
          logSecurityAlert("PAYMENT_TAMPERING_DETECTED", {
            endpoint: "sslcommerz/verifyPayment",
            gateway: "sslcommerz",
            reason: "currency_mismatch",
            referenceHash: hashSecurityIdentifier(tranId),
          });
        }

        // Amount verification: validate finite number
        if (!Number.isFinite(primaryCandidate.amount)) {
          return {
            success: false,
            status: "FAILED",
            isUnverified: true,
            verifiedMerchantReferenceId: tranId,
            candidates,
            error: "Invalid amount in gateway query response",
            rawPayload: primaryCandidate.rawPayload,
          };
        }

        // If callbackPayload provided an amount, cross-check and log alert if mismatched
        if (callbackPayload.amount !== undefined) {
          const expectedAmount = Number(callbackPayload.amount);
          if (
            Number.isFinite(expectedAmount) &&
            Math.abs(primaryCandidate.amount - expectedAmount) > 0.01
          ) {
            const { logSecurityAlert, hashSecurityIdentifier } = await import(
              "@/lib/monitoring/security-logger"
            );
            logSecurityAlert("PAYMENT_TAMPERING_DETECTED", {
              endpoint: "sslcommerz/verifyPayment",
              gateway: "sslcommerz",
              reason: "amount_mismatch",
              referenceHash: hashSecurityIdentifier(tranId),
            });
          }
        }

        return {
          success: true,
          status: "SUCCESS",
          providerTransactionId: primaryCandidate.bankTranId || primaryCandidate.valId,
          verifiedMerchantReferenceId: tranId,
          verifiedAmount: primaryCandidate.amount,
          verifiedCurrency: primaryCandidate.currency,
          candidates,
          rawPayload: primaryCandidate.rawPayload,
          isUnverified: false,
        };
      }

      // No successful candidate. Fallback to first candidate for status reporting
      const firstCandidate = candidates[0];
      const matchedRecord = matchedRecords[0];

      // Currency verification: must be BDT
      const currency =
        typeof matchedRecord.currency === "string"
          ? matchedRecord.currency.trim().toUpperCase()
          : "";
      if (currency !== "BDT") {
        const { logSecurityAlert, hashSecurityIdentifier } = await import(
          "@/lib/monitoring/security-logger"
        );
        logSecurityAlert("PAYMENT_TAMPERING_DETECTED", {
          endpoint: "sslcommerz/verifyPayment",
          gateway: "sslcommerz",
          reason: "currency_mismatch",
          referenceHash: hashSecurityIdentifier(tranId),
        });
        return {
          success: false,
          status: "FAILED",
          isUnverified: true,
          verifiedMerchantReferenceId: tranId,
          candidates,
          error: `Currency mismatch from gateway: expected BDT, got ${matchedRecord.currency}`,
          rawPayload: firstCandidate.rawPayload,
        };
      }

      // If callbackPayload provided an amount, cross-check it
      if (callbackPayload.amount !== undefined) {
        const recordAmount = Number(matchedRecord.amount);
        const expectedAmount = Number(callbackPayload.amount);
        if (Number.isFinite(expectedAmount) && Math.abs(recordAmount - expectedAmount) > 0.01) {
          const { logSecurityAlert, hashSecurityIdentifier } = await import(
            "@/lib/monitoring/security-logger"
          );
          logSecurityAlert("PAYMENT_TAMPERING_DETECTED", {
            endpoint: "sslcommerz/verifyPayment",
            gateway: "sslcommerz",
            reason: "amount_mismatch",
            referenceHash: hashSecurityIdentifier(tranId),
          });
          return {
            success: false,
            status: "FAILED",
            isUnverified: true,
            verifiedMerchantReferenceId: tranId,
            candidates,
            error: `Amount mismatch from gateway: expected ${expectedAmount}, got ${recordAmount}`,
            rawPayload: firstCandidate.rawPayload,
          };
        }
      }

      if (firstCandidate.status === PaymentStatus.CANCELLED) {
        return {
          success: false,
          status: "CANCELLED",
          providerTransactionId: firstCandidate.bankTranId || firstCandidate.valId,
          verifiedMerchantReferenceId: tranId,
          verifiedAmount: firstCandidate.amount,
          verifiedCurrency: firstCandidate.currency,
          candidates,
          rawPayload: firstCandidate.rawPayload,
          isUnverified: false,
        };
      } else if (firstCandidate.status === PaymentStatus.FAILED) {
        return {
          success: false,
          status: "FAILED",
          providerTransactionId: firstCandidate.bankTranId || firstCandidate.valId,
          verifiedMerchantReferenceId: tranId,
          verifiedAmount: firstCandidate.amount,
          verifiedCurrency: firstCandidate.currency,
          candidates,
          error:
            (matchedRecord.error as string) ||
            (matchedRecord.failedreason as string) ||
            `Gateway reported ${matchedRecord.status}`,
          rawPayload: firstCandidate.rawPayload,
          isUnverified: false,
        };
      } else {
        // Unknown or pending gateway status (PENDING, PROCESSING, etc.)
        const { logSecurityAlert, hashSecurityIdentifier } = await import(
          "@/lib/monitoring/security-logger"
        );
        logSecurityAlert("PAYMENT_TAMPERING_DETECTED", {
          endpoint: "sslcommerz/verifyPayment",
          gateway: "sslcommerz",
          reason: "unknown_gateway_status",
          referenceHash: hashSecurityIdentifier(tranId),
          status: String(matchedRecord.status),
        });
        return {
          success: false,
          status: "FAILED",
          isUnverified: true,
          verifiedMerchantReferenceId: tranId,
          candidates,
          error: `Unknown or pending gateway status: ${matchedRecord.status}`,
          rawPayload: firstCandidate.rawPayload,
        };
      }
    } catch (err) {
      console.error("[SSLCommerz] Merchant transaction query failed:", err);
      const { logSecurityAlert, hashSecurityIdentifier } = await import(
        "@/lib/monitoring/security-logger"
      );
      logSecurityAlert("PAYMENT_TAMPERING_DETECTED", {
        endpoint: "sslcommerz/verifyPayment",
        gateway: "sslcommerz",
        reason: "gateway_query_failed",
        referenceHash: hashSecurityIdentifier(tranId),
      });
      return {
        success: false,
        status: "FAILED",
        isUnverified: true,
        verifiedMerchantReferenceId: tranId,
        error: "Gateway transaction validation query timed out or failed",
        rawPayload: callbackPayload,
      };
    }
  }

  private normalizeGatewayStatus(
    rawStatus: unknown
  ): "SUCCESS" | "FAILED" | "CANCELLED" | "UNKNOWN" {
    if (typeof rawStatus !== "string") return "UNKNOWN";
    const s = rawStatus.trim().toUpperCase();
    if (s === "VALID" || s === "VALIDATED" || s === "SUCCESS") {
      return "SUCCESS";
    }
    if (s === "CANCELLED" || s === "CANCEL") {
      return "CANCELLED";
    }
    if (
      s === "FAILED" ||
      s === "FAIL" ||
      s === "UNATTEMPTED" ||
      s === "EXPIRED" ||
      s === "DECLINED" ||
      s === "ISSUER BANK DECLINED" ||
      s === "ISSUER_BANK_DECLINED" ||
      s === "BANK DECLINED"
    ) {
      return "FAILED";
    }
    return "UNKNOWN";
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
