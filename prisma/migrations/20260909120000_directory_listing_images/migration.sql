-- CreateTable
CREATE TABLE `DirectoryListingImage` (
    `id` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `data` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `listingId` VARCHAR(191) NOT NULL,

    INDEX `DirectoryListingImage_listingId_idx`(`listingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DirectoryListingImage` ADD CONSTRAINT `DirectoryListingImage_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `PartnerListing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
