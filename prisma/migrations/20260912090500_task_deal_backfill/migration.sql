-- Copy every existing single Task->Deal link into the new join table, then
-- drop the column it came from. `mig_` + the task's own id keeps every
-- backfilled row's id unique and recognisable, same convention used by the
-- billing migration's DocumentEvent backfill — a task can only have had one
-- dealId, so its own id can't collide with another backfilled row here.
INSERT IGNORE INTO `TaskDeal` (`id`, `taskId`, `dealId`)
SELECT CONCAT('mig_', `id`), `id`, `dealId`
FROM `Task`
WHERE `dealId` IS NOT NULL;

-- DropForeignKey
ALTER TABLE `Task` DROP FOREIGN KEY `Task_dealId_fkey`;

-- DropIndex
DROP INDEX `Task_dealId_idx` ON `Task`;

-- AlterTable
ALTER TABLE `Task` DROP COLUMN `dealId`;
