-- AlterTable
ALTER TABLE `Activity` ADD COLUMN `whatsappMediaData` LONGTEXT NULL,
    ADD COLUMN `whatsappMediaMimeType` VARCHAR(191) NULL,
    ADD COLUMN `whatsappMediaName` VARCHAR(191) NULL,
    ADD COLUMN `whatsappMediaType` ENUM('IMAGE', 'DOCUMENT', 'VIDEO') NULL;
