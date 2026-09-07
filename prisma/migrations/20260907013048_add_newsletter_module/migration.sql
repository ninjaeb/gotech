-- AlterTable
ALTER TABLE `Contact` ADD COLUMN `emailOptOut` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `emailOptOutAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `NewsletterSender` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'singleton',
    `fromName` VARCHAR(191) NOT NULL,
    `fromEmail` VARCHAR(191) NOT NULL,
    `smtpHost` VARCHAR(191) NOT NULL,
    `smtpPort` INTEGER NOT NULL,
    `smtpSecure` BOOLEAN NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `encryptedPassword` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Newsletter` (
    `id` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `bodyMarkdown` TEXT NOT NULL,
    `status` ENUM('DRAFT', 'SCHEDULED', 'SENDING', 'SENT') NOT NULL DEFAULT 'DRAFT',
    `scheduledAt` DATETIME(3) NULL,
    `sentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `listId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,

    INDEX `Newsletter_status_scheduledAt_idx`(`status`, `scheduledAt`),
    INDEX `Newsletter_listId_idx`(`listId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NewsletterRecipient` (
    `id` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `sentAt` DATETIME(3) NULL,
    `error` TEXT NULL,
    `unsubscribeToken` VARCHAR(191) NOT NULL,
    `newsletterId` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `NewsletterRecipient_unsubscribeToken_key`(`unsubscribeToken`),
    INDEX `NewsletterRecipient_newsletterId_status_idx`(`newsletterId`, `status`),
    UNIQUE INDEX `NewsletterRecipient_newsletterId_contactId_key`(`newsletterId`, `contactId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Newsletter` ADD CONSTRAINT `Newsletter_listId_fkey` FOREIGN KEY (`listId`) REFERENCES `ContactList`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Newsletter` ADD CONSTRAINT `Newsletter_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NewsletterRecipient` ADD CONSTRAINT `NewsletterRecipient_newsletterId_fkey` FOREIGN KEY (`newsletterId`) REFERENCES `Newsletter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NewsletterRecipient` ADD CONSTRAINT `NewsletterRecipient_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
