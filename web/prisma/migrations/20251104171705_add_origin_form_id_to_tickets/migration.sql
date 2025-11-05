-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "originFormId" TEXT;

-- CreateIndex
CREATE INDEX "Ticket_originFormId_idx" ON "Ticket"("originFormId");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_originFormId_fkey" FOREIGN KEY ("originFormId") REFERENCES "SupportForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
