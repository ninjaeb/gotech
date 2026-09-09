-- AlterTable
ALTER TABLE `DirectoryLead` ADD COLUMN `referredById` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ReferralClick` ADD COLUMN `listingId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `DirectoryLead_referredById_createdAt_idx` ON `DirectoryLead`(`referredById`, `createdAt`);

-- CreateIndex
CREATE INDEX `ReferralClick_listingId_idx` ON `ReferralClick`(`listingId`);

-- AddForeignKey
ALTER TABLE `ReferralClick` ADD CONSTRAINT `ReferralClick_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `PartnerListing`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DirectoryLead` ADD CONSTRAINT `DirectoryLead_referredById_fkey` FOREIGN KEY (`referredById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
