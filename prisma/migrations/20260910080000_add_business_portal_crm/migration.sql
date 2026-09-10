-- CreateTable
CREATE TABLE `PartnerCompany` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `industry` ENUM('TECHNOLOGY', 'RETAIL_ECOMMERCE', 'HEALTHCARE', 'FINANCE_BANKING', 'MANUFACTURING', 'CONSTRUCTION_REAL_ESTATE', 'EDUCATION', 'HOSPITALITY_TOURISM', 'PROFESSIONAL_SERVICES', 'MEDIA_ENTERTAINMENT', 'TRANSPORTATION_LOGISTICS', 'AGRICULTURE', 'ENERGY_UTILITIES', 'GOVERNMENT_NONPROFIT', 'TELECOMMUNICATIONS', 'AUTOMOTIVE', 'FOOD_BEVERAGE', 'LEGAL', 'MARKETING_ADVERTISING', 'OTHER') NULL,
    `phone` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `partnerId` VARCHAR(191) NOT NULL,

    INDEX `PartnerCompany_partnerId_idx`(`partnerId`),
    INDEX `PartnerCompany_partnerId_name_idx`(`partnerId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartnerContact` (
    `id` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `title` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `partnerId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NULL,

    INDEX `PartnerContact_partnerId_idx`(`partnerId`),
    INDEX `PartnerContact_companyId_idx`(`companyId`),
    INDEX `PartnerContact_partnerId_lastName_firstName_idx`(`partnerId`, `lastName`, `firstName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartnerDeal` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `value` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `status` ENUM('OPEN', 'WON', 'LOST') NOT NULL DEFAULT 'OPEN',
    `expectedCloseDate` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `wonAt` DATETIME(3) NULL,
    `lostAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `partnerId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NULL,
    `contactId` VARCHAR(191) NULL,

    INDEX `PartnerDeal_partnerId_idx`(`partnerId`),
    INDEX `PartnerDeal_companyId_idx`(`companyId`),
    INDEX `PartnerDeal_contactId_idx`(`contactId`),
    INDEX `PartnerDeal_partnerId_status_idx`(`partnerId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartnerTask` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `dueDate` DATETIME(3) NULL,
    `completed` BOOLEAN NOT NULL DEFAULT false,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `partnerId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NULL,
    `contactId` VARCHAR(191) NULL,
    `dealId` VARCHAR(191) NULL,

    INDEX `PartnerTask_partnerId_idx`(`partnerId`),
    INDEX `PartnerTask_companyId_idx`(`companyId`),
    INDEX `PartnerTask_contactId_idx`(`contactId`),
    INDEX `PartnerTask_dealId_idx`(`dealId`),
    INDEX `PartnerTask_partnerId_dueDate_idx`(`partnerId`, `dueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartnerTaskAssignee` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    INDEX `PartnerTaskAssignee_userId_idx`(`userId`),
    UNIQUE INDEX `PartnerTaskAssignee_taskId_userId_key`(`taskId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PartnerCompany` ADD CONSTRAINT `PartnerCompany_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerContact` ADD CONSTRAINT `PartnerContact_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerContact` ADD CONSTRAINT `PartnerContact_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `PartnerCompany`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerDeal` ADD CONSTRAINT `PartnerDeal_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerDeal` ADD CONSTRAINT `PartnerDeal_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `PartnerCompany`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerDeal` ADD CONSTRAINT `PartnerDeal_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `PartnerContact`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerTask` ADD CONSTRAINT `PartnerTask_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerTask` ADD CONSTRAINT `PartnerTask_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `PartnerCompany`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerTask` ADD CONSTRAINT `PartnerTask_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `PartnerContact`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerTask` ADD CONSTRAINT `PartnerTask_dealId_fkey` FOREIGN KEY (`dealId`) REFERENCES `PartnerDeal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerTaskAssignee` ADD CONSTRAINT `PartnerTaskAssignee_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `PartnerTask`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerTaskAssignee` ADD CONSTRAINT `PartnerTaskAssignee_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
