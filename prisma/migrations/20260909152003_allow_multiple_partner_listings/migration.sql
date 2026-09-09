-- DropForeignKey
ALTER TABLE `PartnerListing` DROP FOREIGN KEY `PartnerListing_partnerId_fkey`;

-- DropIndex
DROP INDEX `PartnerListing_partnerId_key` ON `PartnerListing`;

-- CreateIndex
CREATE INDEX `PartnerListing_partnerId_idx` ON `PartnerListing`(`partnerId`);

-- AddForeignKey
ALTER TABLE `PartnerListing` ADD CONSTRAINT `PartnerListing_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
