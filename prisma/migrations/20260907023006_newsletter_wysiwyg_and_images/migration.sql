/*
  Warnings:

  - You are about to drop the column `bodyMarkdown` on the `Newsletter` table. All the data in the column will be lost.
  - Added the required column `bodyHtml` to the `Newsletter` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Newsletter` DROP COLUMN `bodyMarkdown`,
    ADD COLUMN `bodyHtml` TEXT NOT NULL;

-- CreateTable
CREATE TABLE `NewsletterImage` (
    `id` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `data` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `newsletterId` VARCHAR(191) NULL,

    INDEX `NewsletterImage_newsletterId_idx`(`newsletterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `NewsletterImage` ADD CONSTRAINT `NewsletterImage_newsletterId_fkey` FOREIGN KEY (`newsletterId`) REFERENCES `Newsletter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
