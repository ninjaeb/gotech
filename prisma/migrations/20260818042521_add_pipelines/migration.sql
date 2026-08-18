-- Replaces the fixed DealStage enum with per-pipeline, per-stage rows so
-- each deal type can carry its own stage list. Every existing Deal is
-- backfilled into one default "Sales" pipeline seeded with the original 6
-- stages in their original order, so nothing changes in effect for a
-- database that only ever had one pipeline.

-- CreateTable
CREATE TABLE `Pipeline` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Pipeline_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PipelineStage` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL,
    `isWon` BOOLEAN NOT NULL DEFAULT false,
    `isLost` BOOLEAN NOT NULL DEFAULT false,
    `pipelineId` VARCHAR(191) NOT NULL,

    INDEX `PipelineStage_pipelineId_idx`(`pipelineId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PipelineStage` ADD CONSTRAINT `PipelineStage_pipelineId_fkey` FOREIGN KEY (`pipelineId`) REFERENCES `Pipeline`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the default pipeline + its 6 stages, matching the original DealStage
-- enum values/order exactly. Fixed, readable ids rather than generated
-- cuids — there's no server-side id generator available inside plain SQL,
-- and a stable slug is more debuggable for what is effectively a singleton
-- system row anyway.
INSERT INTO `Pipeline` (`id`, `name`, `isDefault`, `sortOrder`, `createdAt`)
VALUES ('pipeline-sales-default', 'Sales', true, 0, CURRENT_TIMESTAMP(3));

INSERT INTO `PipelineStage` (`id`, `name`, `sortOrder`, `isWon`, `isLost`, `pipelineId`)
VALUES
    ('stage-sales-lead', 'Lead', 0, false, false, 'pipeline-sales-default'),
    ('stage-sales-qualified', 'Qualified', 1, false, false, 'pipeline-sales-default'),
    ('stage-sales-proposal', 'Proposal', 2, false, false, 'pipeline-sales-default'),
    ('stage-sales-negotiation', 'Negotiation', 3, false, false, 'pipeline-sales-default'),
    ('stage-sales-won', 'Won', 4, true, false, 'pipeline-sales-default'),
    ('stage-sales-lost', 'Lost', 5, false, true, 'pipeline-sales-default');

-- AlterTable: add the new columns nullable first so existing rows can be
-- backfilled before they're required.
ALTER TABLE `Deal`
    ADD COLUMN `pipelineId` VARCHAR(191) NULL,
    ADD COLUMN `pipelineStageId` VARCHAR(191) NULL;

-- Backfill every existing Deal from its old `stage` value into the new
-- default pipeline's matching stage.
UPDATE `Deal` SET
    `pipelineId` = 'pipeline-sales-default',
    `pipelineStageId` = CASE `stage`
        WHEN 'LEAD' THEN 'stage-sales-lead'
        WHEN 'QUALIFIED' THEN 'stage-sales-qualified'
        WHEN 'PROPOSAL' THEN 'stage-sales-proposal'
        WHEN 'NEGOTIATION' THEN 'stage-sales-negotiation'
        WHEN 'WON' THEN 'stage-sales-won'
        WHEN 'LOST' THEN 'stage-sales-lost'
    END;

-- DropIndex
DROP INDEX `Deal_stage_idx` ON `Deal`;

-- AlterTable: now safe to require the new columns and drop the old one.
ALTER TABLE `Deal`
    MODIFY COLUMN `pipelineId` VARCHAR(191) NOT NULL,
    MODIFY COLUMN `pipelineStageId` VARCHAR(191) NOT NULL,
    DROP COLUMN `stage`;

-- CreateIndex
CREATE INDEX `Deal_pipelineId_idx` ON `Deal`(`pipelineId`);

-- CreateIndex
CREATE INDEX `Deal_pipelineStageId_idx` ON `Deal`(`pipelineStageId`);

-- AddForeignKey
ALTER TABLE `Deal` ADD CONSTRAINT `Deal_pipelineId_fkey` FOREIGN KEY (`pipelineId`) REFERENCES `Pipeline`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Deal` ADD CONSTRAINT `Deal_pipelineStageId_fkey` FOREIGN KEY (`pipelineStageId`) REFERENCES `PipelineStage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
