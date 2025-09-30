-- CreateIndex
CREATE INDEX "invoices_created_at_idx" ON "public"."invoices"("created_at");

-- CreateIndex
CREATE INDEX "invoices_status_created_at_idx" ON "public"."invoices"("status", "created_at");

-- CreateIndex
CREATE INDEX "invoices_status_issue_date_idx" ON "public"."invoices"("status", "issue_date");

-- CreateIndex
CREATE INDEX "invoices_replacement_of_id_idx" ON "public"."invoices"("replacement_of_id");

-- CreateIndex
CREATE INDEX "invoices_replaced_by_id_idx" ON "public"."invoices"("replaced_by_id");
