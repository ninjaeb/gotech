-- AlterTable
ALTER TABLE `Activity` ADD COLUMN `externalId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `EmailAccount` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `imapHost` VARCHAR(191) NOT NULL,
    `imapPort` INTEGER NOT NULL DEFAULT 993,
    `imapSecure` BOOLEAN NOT NULL DEFAULT true,
    `smtpHost` VARCHAR(191) NOT NULL,
    `smtpPort` INTEGER NOT NULL DEFAULT 465,
    `smtpSecure` BOOLEAN NOT NULL DEFAULT true,
    `username` VARCHAR(191) NOT NULL,
    `encryptedPassword` TEXT NOT NULL,
    `syncState` TEXT NOT NULL DEFAULT '{}',
    `lastSyncedAt` DATETIME(3) NULL,
    `lastSyncError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `EmailAccount_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Activity_externalId_key` ON `Activity`(`externalId`);

-- AddForeignKey
ALTER TABLE `EmailAccount` ADD CONSTRAINT `EmailAccount_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
