-- AlterTable
ALTER TABLE `Activity` ADD COLUMN `taskId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Activity_taskId_idx` ON `Activity`(`taskId`);

-- AddForeignKey
ALTER TABLE `Activity` ADD CONSTRAINT `Activity_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
