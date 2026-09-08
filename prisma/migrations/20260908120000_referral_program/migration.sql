-- AlterTable
ALTER TABLE `User` ADD COLUMN `referralCode` VARCHAR(191) NULL,
    ADD COLUMN `referralCommissionRate` DECIMAL(5, 2) NULL,
    MODIFY `role` ENUM('ADMIN', 'DEVELOPER', 'PARTNER') NOT NULL DEFAULT 'ADMIN';

-- AlterTable
ALTER TABLE `Settings` ADD COLUMN `referralCommissionRate` DECIMAL(5, 2) NOT NULL DEFAULT 10,
    ADD COLUMN `referralLandingUrl` VARCHAR(191) NOT NULL DEFAULT 'https://gotka.com/landing/new-business/';

-- AlterTable
ALTER TABLE `Deal` ADD COLUMN `referredById` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `ReferralClick` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ipHash` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `referer` VARCHAR(191) NULL,
    `partnerId` VARCHAR(191) NOT NULL,

    INDEX `ReferralClick_partnerId_createdAt_idx`(`partnerId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReferralCommission` (
    `id` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'PAID', 'VOID') NOT NULL DEFAULT 'PENDING',
    `rate` DECIMAL(5, 2) NOT NULL,
    `dealValue` DECIMAL(12, 2) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `dealTitle` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approvedAt` DATETIME(3) NULL,
    `paidAt` DATETIME(3) NULL,
    `partnerId` VARCHAR(191) NOT NULL,
    `dealId` VARCHAR(191) NULL,
    `withdrawalId` VARCHAR(191) NULL,

    UNIQUE INDEX `ReferralCommission_dealId_key`(`dealId`),
    INDEX `ReferralCommission_partnerId_status_idx`(`partnerId`, `status`),
    INDEX `ReferralCommission_withdrawalId_idx`(`withdrawalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReferralWithdrawal` (
    `id` VARCHAR(191) NOT NULL,
    `status` ENUM('REQUESTED', 'PAID', 'REJECTED') NOT NULL DEFAULT 'REQUESTED',
    `amount` DECIMAL(12, 2) NOT NULL,
    `paymentDetails` TEXT NOT NULL,
    `adminNote` TEXT NULL,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,
    `partnerId` VARCHAR(191) NOT NULL,

    INDEX `ReferralWithdrawal_partnerId_status_idx`(`partnerId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `User_referralCode_key` ON `User`(`referralCode`);

-- CreateIndex
CREATE INDEX `Deal_referredById_idx` ON `Deal`(`referredById`);

-- AddForeignKey
ALTER TABLE `Deal` ADD CONSTRAINT `Deal_referredById_fkey` FOREIGN KEY (`referredById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferralClick` ADD CONSTRAINT `ReferralClick_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferralCommission` ADD CONSTRAINT `ReferralCommission_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferralCommission` ADD CONSTRAINT `ReferralCommission_dealId_fkey` FOREIGN KEY (`dealId`) REFERENCES `Deal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferralCommission` ADD CONSTRAINT `ReferralCommission_withdrawalId_fkey` FOREIGN KEY (`withdrawalId`) REFERENCES `ReferralWithdrawal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferralWithdrawal` ADD CONSTRAINT `ReferralWithdrawal_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

