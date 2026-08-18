-- AlterTable
ALTER TABLE `Settings` ADD COLUMN `bookingSlotMinutes` INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN `bookingUtcOffsetMinutes` INTEGER NOT NULL DEFAULT 480,
    ADD COLUMN `bookingWeeklyHours` TEXT NOT NULL DEFAULT '[{"enabled":false,"start":"09:00","end":"17:00"},{"enabled":true,"start":"09:00","end":"17:00"},{"enabled":true,"start":"09:00","end":"17:00"},{"enabled":true,"start":"09:00","end":"17:00"},{"enabled":true,"start":"09:00","end":"17:00"},{"enabled":true,"start":"09:00","end":"17:00"},{"enabled":false,"start":"09:00","end":"17:00"}]';

-- CreateTable
CREATE TABLE `Booking` (
    `id` VARCHAR(191) NOT NULL,
    `startAt` DATETIME(3) NOT NULL,
    `endAt` DATETIME(3) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `contactId` VARCHAR(191) NOT NULL,

    INDEX `Booking_contactId_idx`(`contactId`),
    UNIQUE INDEX `Booking_startAt_key`(`startAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
