-- CreateTable
CREATE TABLE `TaskAssignee` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    INDEX `TaskAssignee_userId_idx`(`userId`),
    UNIQUE INDEX `TaskAssignee_taskId_userId_key`(`taskId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TaskAssignee` ADD CONSTRAINT `TaskAssignee_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskAssignee` ADD CONSTRAINT `TaskAssignee_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: carry forward each task's existing single assignee as its first TaskAssignee row.
INSERT INTO `TaskAssignee` (`id`, `taskId`, `userId`)
SELECT UUID(), `id`, `assigneeId` FROM `Task` WHERE `assigneeId` IS NOT NULL;

-- DropForeignKey
ALTER TABLE `Task` DROP FOREIGN KEY `Task_assigneeId_fkey`;

-- DropIndex
DROP INDEX `Task_assigneeId_idx` ON `Task`;

-- AlterTable
ALTER TABLE `Task` DROP COLUMN `assigneeId`;
