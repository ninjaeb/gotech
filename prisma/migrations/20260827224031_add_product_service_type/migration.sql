-- AlterTable
ALTER TABLE `ServicePackage` ADD COLUMN `type` ENUM('PRODUCT', 'SERVICE') NOT NULL DEFAULT 'SERVICE';

-- CreateIndex
CREATE INDEX `ServicePackage_type_idx` ON `ServicePackage`(`type`);
