-- A Task moves from a single nullable Deal (Task.dealId) to any number of
-- Deals, via a plain many-to-many join table (same shape as TaskAssignee/
-- TaskFollower). This migration only adds the new table; Task.dealId is
-- backfilled into it and dropped in the next migration, once the data is
-- safely copied over.

-- CreateTable
CREATE TABLE `TaskDeal` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `dealId` VARCHAR(191) NOT NULL,

    INDEX `TaskDeal_dealId_idx`(`dealId`),
    UNIQUE INDEX `TaskDeal_taskId_dealId_key`(`taskId`, `dealId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TaskDeal` ADD CONSTRAINT `TaskDeal_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskDeal` ADD CONSTRAINT `TaskDeal_dealId_fkey` FOREIGN KEY (`dealId`) REFERENCES `Deal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
