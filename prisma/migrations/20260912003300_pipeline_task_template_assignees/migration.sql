-- CreateTable
CREATE TABLE `PipelineTaskTemplateAssignee` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    INDEX `PipelineTaskTemplateAssignee_userId_idx`(`userId`),
    UNIQUE INDEX `PipelineTaskTemplateAssignee_itemId_userId_key`(`itemId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PipelineTaskTemplateFollower` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    INDEX `PipelineTaskTemplateFollower_userId_idx`(`userId`),
    UNIQUE INDEX `PipelineTaskTemplateFollower_itemId_userId_key`(`itemId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PipelineTaskTemplateAssignee` ADD CONSTRAINT `PipelineTaskTemplateAssignee_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `PipelineTaskTemplateItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PipelineTaskTemplateAssignee` ADD CONSTRAINT `PipelineTaskTemplateAssignee_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PipelineTaskTemplateFollower` ADD CONSTRAINT `PipelineTaskTemplateFollower_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `PipelineTaskTemplateItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PipelineTaskTemplateFollower` ADD CONSTRAINT `PipelineTaskTemplateFollower_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
