-- AlterTable
ALTER TABLE `Settings` ADD COLUMN `taskAssignmentNotificationDelayMinutes` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `PendingTaskAssignmentNotification` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `assignerId` VARCHAR(191) NOT NULL,
    `assignerName` VARCHAR(191) NOT NULL,
    `taskTitle` VARCHAR(191) NOT NULL,
    `sendAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PendingTaskAssignmentNotification_taskId_userId_key`(`taskId`, `userId`),
    INDEX `PendingTaskAssignmentNotification_sendAt_idx`(`sendAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PendingTaskAssignmentNotification` ADD CONSTRAINT `PendingTaskAssignmentNotification_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PendingTaskAssignmentNotification` ADD CONSTRAINT `PendingTaskAssignmentNotification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PendingTaskAssignmentNotification` ADD CONSTRAINT `PendingTaskAssignmentNotification_assignerId_fkey` FOREIGN KEY (`assignerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
