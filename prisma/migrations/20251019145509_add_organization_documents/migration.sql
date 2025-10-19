-- CreateEnum
CREATE TYPE "OrganizationDocumentType" AS ENUM ('TEXT', 'POLICY', 'PROCEDURE', 'MANUAL', 'GUIDE', 'FAQ', 'ANNOUNCEMENT');

-- CreateTable
CREATE TABLE "OrganizationDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "OrganizationDocumentType" NOT NULL DEFAULT 'TEXT',
    "metadata" JSONB,
    "vectorId" TEXT,
    "organizationId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationDocument_vectorId_key" ON "OrganizationDocument"("vectorId");

-- CreateIndex
CREATE INDEX "OrganizationDocument_organizationId_idx" ON "OrganizationDocument"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationDocument_type_idx" ON "OrganizationDocument"("type");

-- CreateIndex
CREATE INDEX "OrganizationDocument_vectorId_idx" ON "OrganizationDocument"("vectorId");

-- CreateIndex
CREATE INDEX "OrganizationDocument_uploadedBy_idx" ON "OrganizationDocument"("uploadedBy");

-- AddForeignKey
ALTER TABLE "OrganizationDocument" ADD CONSTRAINT "OrganizationDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationDocument" ADD CONSTRAINT "OrganizationDocument_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
