-- AlterTable
ALTER TABLE `Activity` ADD COLUMN `whatsappStatus` ENUM('SENT', 'DELIVERED', 'READ', 'FAILED') NULL;
