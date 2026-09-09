-- AlterTable
ALTER TABLE `PartnerListing` ADD COLUMN `translations` JSON NULL;

-- CreateTable
CREATE TABLE `BusinessCategory` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BusinessCategory_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartnerListingCategory` (
    `id` VARCHAR(191) NOT NULL,
    `listingId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,

    INDEX `PartnerListingCategory_categoryId_idx`(`categoryId`),
    UNIQUE INDEX `PartnerListingCategory_listingId_categoryId_key`(`listingId`, `categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PartnerListingCategory` ADD CONSTRAINT `PartnerListingCategory_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `PartnerListing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerListingCategory` ADD CONSTRAINT `PartnerListingCategory_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `BusinessCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
