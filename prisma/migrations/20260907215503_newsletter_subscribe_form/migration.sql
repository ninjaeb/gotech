-- AlterTable
ALTER TABLE `Settings` ADD COLUMN `newsletterSubscribeListId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Settings_newsletterSubscribeListId_idx` ON `Settings`(`newsletterSubscribeListId`);

-- AddForeignKey
ALTER TABLE `Settings` ADD CONSTRAINT `Settings_newsletterSubscribeListId_fkey` FOREIGN KEY (`newsletterSubscribeListId`) REFERENCES `ContactList`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
