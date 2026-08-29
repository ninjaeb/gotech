-- CreateTable
CREATE TABLE `WhatsAppMentionNotification` (
    `id` VARCHAR(191) NOT NULL,
    `wamid` VARCHAR(191) NOT NULL,
    `mentionerId` VARCHAR(191) NOT NULL,
    `mentioneeName` VARCHAR(191) NOT NULL,
    `excerpt` TEXT NOT NULL,
    `contactId` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NULL,
    `dealId` VARCHAR(191) NULL,
    `projectId` VARCHAR(191) NULL,
    `taskId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `WhatsAppMentionNotification_wamid_key`(`wamid`),
    INDEX `WhatsAppMentionNotification_contactId_idx`(`contactId`),
    INDEX `WhatsAppMentionNotification_companyId_idx`(`companyId`),
    INDEX `WhatsAppMentionNotification_dealId_idx`(`dealId`),
    INDEX `WhatsAppMentionNotification_projectId_idx`(`projectId`),
    INDEX `WhatsAppMentionNotification_taskId_idx`(`taskId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WhatsAppMentionNotification` ADD CONSTRAINT `WhatsAppMentionNotification_mentionerId_fkey` FOREIGN KEY (`mentionerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WhatsAppMentionNotification` ADD CONSTRAINT `WhatsAppMentionNotification_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WhatsAppMentionNotification` ADD CONSTRAINT `WhatsAppMentionNotification_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WhatsAppMentionNotification` ADD CONSTRAINT `WhatsAppMentionNotification_dealId_fkey` FOREIGN KEY (`dealId`) REFERENCES `Deal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WhatsAppMentionNotification` ADD CONSTRAINT `WhatsAppMentionNotification_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WhatsAppMentionNotification` ADD CONSTRAINT `WhatsAppMentionNotification_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
