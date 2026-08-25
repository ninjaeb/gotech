-- AlterTable
ALTER TABLE `Activity` MODIFY `type` ENUM('NOTE', 'CALL', 'EMAIL', 'WHATSAPP', 'MEETING', 'STAGE_CHANGE', 'TASK_COMPLETED') NOT NULL;

-- CreateTable
CREATE TABLE `WhatsAppAccount` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'singleton',
    `phoneNumberId` VARCHAR(191) NOT NULL,
    `businessAccountId` VARCHAR(191) NOT NULL,
    `displayPhoneNumber` VARCHAR(191) NULL,
    `encryptedAccessToken` TEXT NOT NULL,
    `encryptedAppSecret` TEXT NOT NULL,
    `webhookVerifyToken` VARCHAR(191) NOT NULL,
    `lastSyncError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
