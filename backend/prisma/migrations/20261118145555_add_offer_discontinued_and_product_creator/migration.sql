-- AlterEnum
ALTER TYPE "OfferStatus" ADD VALUE 'DISCONTINUED';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "created_by_vendor_id" UUID;

-- CreateIndex
CREATE INDEX "products_created_by_vendor_id_idx" ON "products"("created_by_vendor_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_vendor_id_fkey" FOREIGN KEY ("created_by_vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
