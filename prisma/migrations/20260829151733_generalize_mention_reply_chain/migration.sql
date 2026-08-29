/*
  Warnings:

  - You are about to drop the column `mentioneeName` on the `WhatsAppMentionNotification` table. All the data in the column will be lost.
  - You are about to drop the column `mentionerId` on the `WhatsAppMentionNotification` table. All the data in the column will be lost.
  - Added the required column `forwardToId` to the `WhatsAppMentionNotification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recipientId` to the `WhatsAppMentionNotification` table without a default value. This is not possible if the table is not empty.

*/
-- This table only ever holds live "if replied to, forward to X" pointers
-- for an in-flight WhatsApp exchange — never permanent history (the CRM
-- Activity/Notification rows created alongside each forward are the
-- actual record). mentioneeName has no user id to backfill recipientId
-- from, so any row still pending when this runs is cleared rather than
-- migrated: worst case, a reply mid-flight at deploy time doesn't
-- auto-forward, which is the same no-op as if this WhatsApp feature
-- weren't configured at all.
DELETE FROM `WhatsAppMentionNotification`;

-- DropForeignKey
ALTER TABLE `WhatsAppMentionNotification` DROP FOREIGN KEY `WhatsAppMentionNotification_mentionerId_fkey`;

-- DropIndex
DROP INDEX `WhatsAppMentionNotification_mentionerId_fkey` ON `WhatsAppMentionNotification`;

-- AlterTable
ALTER TABLE `WhatsAppMentionNotification` DROP COLUMN `mentioneeName`,
    DROP COLUMN `mentionerId`,
    ADD COLUMN `forwardToId` VARCHAR(191) NOT NULL,
    ADD COLUMN `recipientId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `WhatsAppMentionNotification` ADD CONSTRAINT `WhatsAppMentionNotification_recipientId_fkey` FOREIGN KEY (`recipientId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WhatsAppMentionNotification` ADD CONSTRAINT `WhatsAppMentionNotification_forwardToId_fkey` FOREIGN KEY (`forwardToId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
