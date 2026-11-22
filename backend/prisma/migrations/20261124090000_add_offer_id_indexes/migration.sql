-- CreateIndex
CREATE INDEX "cart_items_offer_id_idx" ON "cart_items"("offer_id");

-- CreateIndex
CREATE INDEX "order_items_offer_id_idx" ON "order_items"("offer_id");
