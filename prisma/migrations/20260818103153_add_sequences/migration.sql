-- AlterTable
ALTER TABLE `Contact` ADD COLUMN `lastInboundEmailAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `Sequence` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SequenceStep` (
    `id` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `delayDays` INTEGER NOT NULL DEFAULT 0,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `sequenceId` VARCHAR(191) NOT NULL,

    INDEX `SequenceStep_sequenceId_idx`(`sequenceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SequenceEnrollment` (
    `id` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'COMPLETED', 'STOPPED_REPLY', 'STOPPED_MANUAL', 'FAILED') NOT NULL DEFAULT 'ACTIVE',
    `enrolledAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `nextStepDueAt` DATETIME(3) NOT NULL,
    `lastStepSentAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `sequenceId` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `currentStepId` VARCHAR(191) NULL,

    INDEX `SequenceEnrollment_contactId_idx`(`contactId`),
    INDEX `SequenceEnrollment_status_nextStepDueAt_idx`(`status`, `nextStepDueAt`),
    UNIQUE INDEX `SequenceEnrollment_sequenceId_contactId_key`(`sequenceId`, `contactId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SequenceStep` ADD CONSTRAINT `SequenceStep_sequenceId_fkey` FOREIGN KEY (`sequenceId`) REFERENCES `Sequence`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SequenceEnrollment` ADD CONSTRAINT `SequenceEnrollment_sequenceId_fkey` FOREIGN KEY (`sequenceId`) REFERENCES `Sequence`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SequenceEnrollment` ADD CONSTRAINT `SequenceEnrollment_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SequenceEnrollment` ADD CONSTRAINT `SequenceEnrollment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SequenceEnrollment` ADD CONSTRAINT `SequenceEnrollment_currentStepId_fkey` FOREIGN KEY (`currentStepId`) REFERENCES `SequenceStep`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
