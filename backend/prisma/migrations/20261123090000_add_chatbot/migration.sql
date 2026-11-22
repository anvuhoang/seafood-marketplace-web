-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "ChatFeedback" AS ENUM ('UP', 'DOWN');

-- CreateEnum
CREATE TYPE "ChatHandoffStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "chat_conversations" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "session_id" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "cards" JSONB,
    "sources" JSONB,
    "tools_used" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "feedback" "ChatFeedback",
    "latency_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_handoffs" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "contact_name" VARCHAR(150) NOT NULL,
    "contact" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ChatHandoffStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_handoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_memories" (
    "user_id" UUID NOT NULL,
    "notes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_memories_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" UUID NOT NULL,
    "source" VARCHAR(150) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "content_hash" VARCHAR(64) NOT NULL,
    "embedding" DOUBLE PRECISION[],
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_messages_conversation_id_created_at_idx" ON "chat_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "chat_messages_feedback_idx" ON "chat_messages"("feedback");

-- CreateIndex
CREATE INDEX "chat_handoffs_status_created_at_idx" ON "chat_handoffs"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_chunks_source_position_key" ON "knowledge_chunks"("source", "position");

-- CreateIndex
CREATE INDEX "chat_conversations_user_id_updated_at_idx" ON "chat_conversations"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "chat_conversations_session_id_idx" ON "chat_conversations"("session_id");

-- CreateIndex
CREATE INDEX "chat_conversations_updated_at_idx" ON "chat_conversations"("updated_at");

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_handoffs" ADD CONSTRAINT "chat_handoffs_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_memories" ADD CONSTRAINT "chat_memories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
