-- AlterTable
ALTER TABLE `User` ADD COLUMN `lastTaskDigestWhatsAppSentAt` DATETIME(3) NULL,
    ADD COLUMN `phone` VARCHAR(191) NULL;
