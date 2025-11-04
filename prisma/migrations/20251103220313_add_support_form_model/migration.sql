-- CreateEnum
CREATE TYPE "SupportFormStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "SupportForm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organizationId" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "settings" JSONB NOT NULL,
    "defaultValues" JSONB,
    "status" "SupportFormStatus" NOT NULL DEFAULT 'ACTIVE',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "embedCode" TEXT NOT NULL,
    "defaultCategory" TEXT,
    "defaultPriority" "TicketPriority",
    "autoAssignToId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "submissionCount" INTEGER NOT NULL DEFAULT 0,
    "lastSubmittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "SupportForm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupportForm_embedCode_key" ON "SupportForm"("embedCode");

-- CreateIndex
CREATE INDEX "SupportForm_organizationId_idx" ON "SupportForm"("organizationId");

-- CreateIndex
CREATE INDEX "SupportForm_embedCode_idx" ON "SupportForm"("embedCode");

-- CreateIndex
CREATE INDEX "SupportForm_status_idx" ON "SupportForm"("status");

-- CreateIndex
CREATE INDEX "SupportForm_isPublic_idx" ON "SupportForm"("isPublic");

-- AddForeignKey
ALTER TABLE "SupportForm" ADD CONSTRAINT "SupportForm_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportForm" ADD CONSTRAINT "SupportForm_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
