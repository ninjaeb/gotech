-- CreateTable
CREATE TABLE `QuoteTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuoteTemplateItem` (
    `id` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL DEFAULT 1,
    `unitPrice` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `quoteTemplateId` VARCHAR(191) NOT NULL,
    `servicePackageId` VARCHAR(191) NULL,

    INDEX `QuoteTemplateItem_quoteTemplateId_idx`(`quoteTemplateId`),
    INDEX `QuoteTemplateItem_servicePackageId_idx`(`servicePackageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `QuoteTemplateItem` ADD CONSTRAINT `QuoteTemplateItem_quoteTemplateId_fkey` FOREIGN KEY (`quoteTemplateId`) REFERENCES `QuoteTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuoteTemplateItem` ADD CONSTRAINT `QuoteTemplateItem_servicePackageId_fkey` FOREIGN KEY (`servicePackageId`) REFERENCES `ServicePackage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
