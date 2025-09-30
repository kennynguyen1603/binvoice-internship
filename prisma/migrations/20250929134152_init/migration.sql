-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('draft', 'issued', 'canceled');

-- CreateTable
CREATE TABLE "public"."invoice_number_seq" (
    "year" INTEGER NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "invoice_number_seq_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "public"."invoices" (
    "id" TEXT NOT NULL,
    "number" TEXT,
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'draft',
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "issue_date" TIMESTAMPTZ(6),
    "due_date" TIMESTAMPTZ(6),
    "buyer_name" TEXT NOT NULL,
    "buyer_tax_id" TEXT,
    "buyer_address" TEXT,
    "seller_name" TEXT NOT NULL,
    "seller_tax_id" TEXT,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "tax_total" DECIMAL(18,2) NOT NULL,
    "grand_total" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,
    "replacement_of_id" TEXT,
    "replaced_by_id" TEXT,
    "canceled_at" TIMESTAMPTZ(6),
    "cancel_reason" TEXT,
    "pdf_path" TEXT,
    "pdf_generated_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoice_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,2) NOT NULL,
    "unit_price" DECIMAL(18,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL,
    "line_subtotal" DECIMAL(18,2) NOT NULL,
    "line_tax" DECIMAL(18,2) NOT NULL,
    "line_total" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "public"."invoices"("number");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_replacement_of_id_key" ON "public"."invoices"("replacement_of_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_replaced_by_id_key" ON "public"."invoices"("replaced_by_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "public"."invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_issue_date_idx" ON "public"."invoices"("issue_date");

-- CreateIndex
CREATE INDEX "invoices_buyer_name_idx" ON "public"."invoices"("buyer_name");

-- CreateIndex
CREATE INDEX "invoice_items_invoice_id_idx" ON "public"."invoice_items"("invoice_id");

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_replacement_of_id_fkey" FOREIGN KEY ("replacement_of_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
