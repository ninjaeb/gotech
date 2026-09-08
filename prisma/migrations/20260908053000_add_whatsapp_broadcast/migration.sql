-- CreateTable
CREATE TABLE `WhatsAppBroadcast` (
    `id` VARCHAR(191) NOT NULL,
    `headline` VARCHAR(191) NOT NULL,
    `link` VARCHAR(191) NOT NULL,
    `status` ENUM('SENDING', 'SENT') NOT NULL DEFAULT 'SENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sentAt` DATETIME(3) NULL,
    `listId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,

    INDEX `WhatsAppBroadcast_status_idx`(`status`),
    INDEX `WhatsAppBroadcast_listId_idx`(`listId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WhatsAppBroadcastRecipient` (
    `id` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `sentAt` DATETIME(3) NULL,
    `error` TEXT NULL,
    `broadcastId` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NOT NULL,

    INDEX `WhatsAppBroadcastRecipient_broadcastId_status_idx`(`broadcastId`, `status`),
    UNIQUE INDEX `WhatsAppBroadcastRecipient_broadcastId_contactId_key`(`broadcastId`, `contactId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WhatsAppBroadcast` ADD CONSTRAINT `WhatsAppBroadcast_listId_fkey` FOREIGN KEY (`listId`) REFERENCES `ContactList`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WhatsAppBroadcast` ADD CONSTRAINT `WhatsAppBroadcast_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WhatsAppBroadcastRecipient` ADD CONSTRAINT `WhatsAppBroadcastRecipient_broadcastId_fkey` FOREIGN KEY (`broadcastId`) REFERENCES `WhatsAppBroadcast`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WhatsAppBroadcastRecipient` ADD CONSTRAINT `WhatsAppBroadcastRecipient_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
