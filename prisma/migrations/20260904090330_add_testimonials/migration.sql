-- CreateTable
CREATE TABLE `Testimonial` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'SUBMITTED') NOT NULL DEFAULT 'PENDING',
    `contactId` VARCHAR(191) NOT NULL,
    `aiDraft` TEXT NULL,
    `content` TEXT NULL,
    `rating` INTEGER NULL,
    `authorName` VARCHAR(191) NULL,
    `authorTitle` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `submittedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Testimonial_token_key`(`token`),
    INDEX `Testimonial_contactId_idx`(`contactId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Testimonial` ADD CONSTRAINT `Testimonial_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
