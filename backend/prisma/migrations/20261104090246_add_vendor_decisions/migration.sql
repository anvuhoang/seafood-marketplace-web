-- CreateEnum
CREATE TYPE "VendorDecisionAction" AS ENUM ('APPROVE', 'REJECT', 'SUSPEND', 'REACTIVATE');

-- CreateTable
CREATE TABLE "vendor_decisions" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "action" "VendorDecisionAction" NOT NULL,
    "from_status" "VendorStatus" NOT NULL,
    "to_status" "VendorStatus" NOT NULL,
    "reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vendor_decisions_vendor_id_created_at_idx" ON "vendor_decisions"("vendor_id", "created_at");

-- CreateIndex
CREATE INDEX "vendor_decisions_admin_id_idx" ON "vendor_decisions"("admin_id");

-- AddForeignKey
ALTER TABLE "vendor_decisions" ADD CONSTRAINT "vendor_decisions_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_decisions" ADD CONSTRAINT "vendor_decisions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
