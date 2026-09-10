-- AlterTable: timezone moves from PartnerListing (per-listing) to User (per-partner-account)
ALTER TABLE `User` ADD COLUMN `timezone` VARCHAR(191) NULL;
ALTER TABLE `PartnerListing` DROP COLUMN `timezone`;

-- AlterTable: split state/country out of the freeform address field
ALTER TABLE `PartnerListing` ADD COLUMN `state` VARCHAR(191) NULL, ADD COLUMN `country` VARCHAR(191) NULL;
