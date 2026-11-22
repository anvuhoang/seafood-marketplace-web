-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "PaymentStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "checkout_url" VARCHAR(500),
ADD COLUMN     "expires_at" TIMESTAMPTZ(6),
ADD COLUMN     "failure_reason" VARCHAR(255),
ADD COLUMN     "order_code" BIGINT,
ADD COLUMN     "payment_link_id" VARCHAR(100),
ADD COLUMN     "qr_code" TEXT,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "payments_order_code_key" ON "payments"("order_code");
