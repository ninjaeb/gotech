-- CreateTable
CREATE TABLE `PartnerListing` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `companyName` VARCHAR(191) NOT NULL,
    `tagline` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `services` JSON NOT NULL,
    `industry` ENUM('TECHNOLOGY', 'RETAIL_ECOMMERCE', 'HEALTHCARE', 'FINANCE_BANKING', 'MANUFACTURING', 'CONSTRUCTION_REAL_ESTATE', 'EDUCATION', 'HOSPITALITY_TOURISM', 'PROFESSIONAL_SERVICES', 'MEDIA_ENTERTAINMENT', 'TRANSPORTATION_LOGISTICS', 'AGRICULTURE', 'ENERGY_UTILITIES', 'GOVERNMENT_NONPROFIT', 'TELECOMMUNICATIONS', 'AUTOMOTIVE', 'FOOD_BEVERAGE', 'LEGAL', 'MARKETING_ADVERTISING', 'OTHER') NULL,
    `website` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `logoUrl` LONGTEXT NULL,
    `reviewNote` TEXT NULL,
    `submittedAt` DATETIME(3) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `publishedAt` DATETIME(3) NULL,
    `publishedSnapshot` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `partnerId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `PartnerListing_slug_key`(`slug`),
    UNIQUE INDEX `PartnerListing_partnerId_key`(`partnerId`),
    INDEX `PartnerListing_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DirectoryLead` (
    `id` VARCHAR(191) NOT NULL,
    `status` ENUM('NEW', 'PICKED_UP', 'CONTACTED', 'QUOTED', 'WON', 'LOST') NOT NULL DEFAULT 'NEW',
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `company` VARCHAR(191) NULL,
    `message` TEXT NOT NULL,
    `locale` VARCHAR(191) NOT NULL DEFAULT 'en',
    `value` DECIMAL(12, 2) NULL,
    `notes` TEXT NULL,
    `pickedUpAt` DATETIME(3) NULL,
    `firstRepliedAt` DATETIME(3) NULL,
    `closedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `listingId` VARCHAR(191) NOT NULL,

    INDEX `DirectoryLead_listingId_status_idx`(`listingId`, `status`),
    INDEX `DirectoryLead_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DirectoryLeadReply` (
    `id` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sentAt` DATETIME(3) NULL,
    `sendError` TEXT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,

    INDEX `DirectoryLeadReply_leadId_idx`(`leadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PartnerListing` ADD CONSTRAINT `PartnerListing_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DirectoryLead` ADD CONSTRAINT `DirectoryLead_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `PartnerListing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DirectoryLeadReply` ADD CONSTRAINT `DirectoryLeadReply_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `DirectoryLead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DirectoryLeadReply` ADD CONSTRAINT `DirectoryLeadReply_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

