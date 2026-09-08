-- AlterTable
ALTER TABLE `Contact` ADD COLUMN `whatsappMarketingOptIn` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `whatsappMarketingOptInAt` DATETIME(3) NULL;
