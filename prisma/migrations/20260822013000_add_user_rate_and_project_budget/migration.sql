-- AlterTable
ALTER TABLE `User` ADD COLUMN `hourlyRate` DECIMAL(10, 2) NULL;

-- AlterTable
ALTER TABLE `Project` ADD COLUMN `budgetHours` INTEGER NULL,
    ADD COLUMN `budgetAmount` DECIMAL(12, 2) NULL,
    ADD COLUMN `targetCompletionDate` DATETIME(3) NULL;
