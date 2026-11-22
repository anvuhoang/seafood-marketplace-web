-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "input_tokens" INTEGER,
ADD COLUMN     "model_calls" INTEGER,
ADD COLUMN     "output_tokens" INTEGER;

-- CreateTable
CREATE TABLE "chat_incidents" (
    "id" UUID NOT NULL,
    "kind" VARCHAR(40) NOT NULL,
    "detail" VARCHAR(300),
    "conversation_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_incidents_created_at_idx" ON "chat_incidents"("created_at");

-- CreateIndex
CREATE INDEX "chat_incidents_kind_created_at_idx" ON "chat_incidents"("kind", "created_at");
