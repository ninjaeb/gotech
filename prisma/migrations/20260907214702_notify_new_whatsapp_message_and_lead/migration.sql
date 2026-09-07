-- AlterTable
ALTER TABLE `User` ADD COLUMN `notifyNewLead` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `notifyNewWhatsAppMessage` BOOLEAN NOT NULL DEFAULT false;
