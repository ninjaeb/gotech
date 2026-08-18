-- AlterTable
ALTER TABLE `Deal` ADD COLUMN `ownerId` VARCHAR(191) NULL,
    ADD COLUMN `wonAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `Deal_ownerId_idx` ON `Deal`(`ownerId`);

-- AddForeignKey
ALTER TABLE `Deal` ADD CONSTRAINT `Deal_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
