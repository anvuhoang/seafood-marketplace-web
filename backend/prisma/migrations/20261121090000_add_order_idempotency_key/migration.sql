-- AlterTable
ALTER TABLE "orders" ADD COLUMN "idempotency_key" VARCHAR(100);

-- CreateIndex
CREATE UNIQUE INDEX "orders_user_id_idempotency_key_key" ON "orders"("user_id", "idempotency_key");
