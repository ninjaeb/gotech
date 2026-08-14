-- AlterTable
ALTER TABLE `Activity` ADD COLUMN `projectId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Task` ADD COLUMN `projectId` VARCHAR(191) NULL,
    MODIFY `type` ENUM('CALL', 'EMAIL', 'MEETING', 'FOLLOW_UP', 'MILESTONE', 'OTHER') NOT NULL DEFAULT 'OTHER';

-- CreateTable
CREATE TABLE `Project` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `status` ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD') NOT NULL DEFAULT 'NOT_STARTED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `dealId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Project_dealId_key`(`dealId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Activity_projectId_idx` ON `Activity`(`projectId`);

-- CreateIndex
CREATE INDEX `Task_projectId_idx` ON `Task`(`projectId`);

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_dealId_fkey` FOREIGN KEY (`dealId`) REFERENCES `Deal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Activity` ADD CONSTRAINT `Activity_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
