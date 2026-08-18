-- CreateTable
CREATE TABLE `ClientUser` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` TEXT NULL,
    `inviteToken` VARCHAR(191) NULL,
    `inviteTokenExpiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `contactId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `ClientUser_email_key`(`email`),
    UNIQUE INDEX `ClientUser_inviteToken_key`(`inviteToken`),
    UNIQUE INDEX `ClientUser_contactId_key`(`contactId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ClientUser` ADD CONSTRAINT `ClientUser_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
