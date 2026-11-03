-- CreateTable
CREATE TABLE "vendor_follows" (
    "user_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_follows_pkey" PRIMARY KEY ("user_id","vendor_id")
);

-- CreateIndex
CREATE INDEX "vendor_follows_vendor_id_idx" ON "vendor_follows"("vendor_id");

-- AddForeignKey
ALTER TABLE "vendor_follows" ADD CONSTRAINT "vendor_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_follows" ADD CONSTRAINT "vendor_follows_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
