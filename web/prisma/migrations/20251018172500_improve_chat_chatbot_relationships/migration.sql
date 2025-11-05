/*
  Warnings:

  - You are about to drop the column `organizationId` on the `Chat` table. All the data in the column will be lost.
  - Made the column `chatbotId` on table `Chat` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."Chat" DROP CONSTRAINT "Chat_chatbotId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Chat" DROP CONSTRAINT "Chat_organizationId_fkey";

-- DropIndex
DROP INDEX "public"."Chat_organizationId_idx";

-- AlterTable
ALTER TABLE "Chat" DROP COLUMN "organizationId",
ALTER COLUMN "chatbotId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "Chatbot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
