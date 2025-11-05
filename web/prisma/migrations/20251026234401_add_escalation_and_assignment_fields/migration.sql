-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "escalationReason" TEXT,
ADD COLUMN     "escalationRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "escalationRequestedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Chat_escalationRequested_idx" ON "Chat"("escalationRequested");

-- CreateIndex
CREATE INDEX "Chat_assignedToId_idx" ON "Chat"("assignedToId");

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
