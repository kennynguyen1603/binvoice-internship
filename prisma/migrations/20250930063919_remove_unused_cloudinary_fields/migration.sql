/*
  Warnings:

  - You are about to drop the column `pdf_public_id` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `pdf_secure_url` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `pdf_url` on the `invoices` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."invoices" DROP COLUMN "pdf_public_id",
DROP COLUMN "pdf_secure_url",
DROP COLUMN "pdf_url";
