-- CreateIndex
CREATE INDEX "detected_parts_scanId_idx" ON "detected_parts"("scanId");

-- CreateIndex
CREATE INDEX "repair_inquiries_senderId_idx" ON "repair_inquiries"("senderId");

-- CreateIndex
CREATE INDEX "repair_inquiries_workshopId_status_idx" ON "repair_inquiries"("workshopId", "status");

-- CreateIndex
CREATE INDEX "scan_images_scanId_idx" ON "scan_images"("scanId");

-- CreateIndex
CREATE INDEX "scans_userId_idx" ON "scans"("userId");

-- CreateIndex
CREATE INDEX "scans_guestSessionId_idx" ON "scans"("guestSessionId");

-- CreateIndex
CREATE INDEX "scans_status_idx" ON "scans"("status");

-- CreateIndex
CREATE INDEX "vehicles_userId_idx" ON "vehicles"("userId");

-- CreateIndex
CREATE INDEX "workshop_services_workshopId_idx" ON "workshop_services"("workshopId");

-- CreateIndex
CREATE INDEX "workshops_city_status_idx" ON "workshops"("city", "status");
