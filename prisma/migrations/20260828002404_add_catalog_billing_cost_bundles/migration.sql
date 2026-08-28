-- AlterTable
ALTER TABLE `ServicePackage` ADD COLUMN `billingFrequency` ENUM('ONE_TIME', 'MONTHLY', 'QUARTERLY', 'YEARLY') NOT NULL DEFAULT 'ONE_TIME',
    ADD COLUMN `unitCost` DECIMAL(12, 2) NULL;

-- CreateTable
CREATE TABLE `ServicePackageComponent` (
    `id` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL DEFAULT 1,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `bundleId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,

    INDEX `ServicePackageComponent_bundleId_idx`(`bundleId`),
    INDEX `ServicePackageComponent_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ServicePackageComponent` ADD CONSTRAINT `ServicePackageComponent_bundleId_fkey` FOREIGN KEY (`bundleId`) REFERENCES `ServicePackage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServicePackageComponent` ADD CONSTRAINT `ServicePackageComponent_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `ServicePackage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
