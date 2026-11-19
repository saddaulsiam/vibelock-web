-- CreateEnum
CREATE TYPE "CaptureReconciliationStatus" AS ENUM ('SETTLED', 'NEEDS_REVIEW', 'RESOLVED');

-- CreateTable
CREATE TABLE "PaymentCapture" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "bankTranId" TEXT NOT NULL,
    "valId" TEXT,
    "cardType" TEXT,
    "cardBrand" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "reconciliationStatus" "CaptureReconciliationStatus" NOT NULL,
    "reconciliationNotes" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentCapture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentCapture_gateway_bankTranId_key" ON "PaymentCapture"("gateway", "bankTranId");

-- CreateIndex
CREATE INDEX "PaymentCapture_paymentId_idx" ON "PaymentCapture"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentCapture_gateway_valId_idx" ON "PaymentCapture"("gateway", "valId");

-- CreateIndex
CREATE INDEX "PaymentCapture_reconciliationStatus_idx" ON "PaymentCapture"("reconciliationStatus");

-- Partial Unique Index: Database-enforced invariant: at most one primary capture per Payment
CREATE UNIQUE INDEX "PaymentCapture_paymentId_single_primary_uidx"
ON "PaymentCapture"("paymentId")
WHERE "isPrimary" = true;

-- AddForeignKey
ALTER TABLE "PaymentCapture" ADD CONSTRAINT "PaymentCapture_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
