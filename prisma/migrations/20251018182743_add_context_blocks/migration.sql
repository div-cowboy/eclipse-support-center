-- CreateEnum
CREATE TYPE "ContextBlockType" AS ENUM ('TEXT', 'CODE', 'DOCUMENTATION', 'FAQ', 'TROUBLESHOOTING', 'TUTORIAL');

-- CreateTable
CREATE TABLE "ContextBlock" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "ContextBlockType" NOT NULL DEFAULT 'TEXT',
    "metadata" JSONB,
    "vectorId" TEXT,
    "chatbotId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContextBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContextBlock_vectorId_key" ON "ContextBlock"("vectorId");

-- CreateIndex
CREATE INDEX "ContextBlock_chatbotId_idx" ON "ContextBlock"("chatbotId");

-- CreateIndex
CREATE INDEX "ContextBlock_type_idx" ON "ContextBlock"("type");

-- CreateIndex
CREATE INDEX "ContextBlock_vectorId_idx" ON "ContextBlock"("vectorId");

-- AddForeignKey
ALTER TABLE "ContextBlock" ADD CONSTRAINT "ContextBlock_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "Chatbot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
