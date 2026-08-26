-- AlterTable
ALTER TABLE `Contact` ADD COLUMN `lifecycleStage` ENUM('SUBSCRIBER', 'LEAD', 'MQL', 'SQL', 'OPPORTUNITY', 'CUSTOMER', 'EVANGELIST', 'OTHER') NULL;

-- CreateIndex
CREATE INDEX `Contact_lifecycleStage_idx` ON `Contact`(`lifecycleStage`);
