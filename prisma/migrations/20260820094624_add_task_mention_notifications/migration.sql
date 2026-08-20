-- AlterTable
ALTER TABLE `Notification` ADD COLUMN `taskId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Notification_taskId_idx` ON `Notification`(`taskId`);

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
