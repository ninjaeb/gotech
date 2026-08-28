-- AlterTable
ALTER TABLE `EmailAccount` ADD COLUMN `fromName` VARCHAR(191) NULL,
    ADD COLUMN `htmlSignature` TEXT NULL;
