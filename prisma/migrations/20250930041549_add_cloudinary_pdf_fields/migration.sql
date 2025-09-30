-- AlterTable
ALTER TABLE "public"."invoices" ADD COLUMN     "pdf_public_id" TEXT,
ADD COLUMN     "pdf_secure_url" TEXT,
ADD COLUMN     "pdf_url" TEXT;
