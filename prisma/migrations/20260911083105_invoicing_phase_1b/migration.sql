-- Invoicing, phase 1b: numbered, Deal-scoped Invoices alongside the
-- original Project-scoped milestone Invoice, and their own line items.
-- Every new Invoice column is nullable/defaulted so the existing milestone
-- rows and code paths (createInvoice/updateInvoice/changeInvoiceStatus,
-- the Project page, the client portal, the dashboard stat) keep working
-- unchanged.

-- AlterTable
ALTER TABLE `Invoice`
    DROP FOREIGN KEY `Invoice_projectId_fkey`;

-- AlterTable
ALTER TABLE `Invoice`
    MODIFY `status` ENUM('DRAFT', 'DEPOSIT_SENT', 'PROGRESS_BILLED', 'PAID_IN_FULL', 'SENT', 'VIEWED', 'VOID') NOT NULL DEFAULT 'DRAFT',
    MODIFY `projectId` VARCHAR(191) NULL,
    ADD COLUMN `number` VARCHAR(191) NULL,
    ADD COLUMN `shareToken` VARCHAR(191) NULL,
    ADD COLUMN `issuedAt` DATETIME(3) NULL,
    ADD COLUMN `voidedAt` DATETIME(3) NULL,
    ADD COLUMN `currency` VARCHAR(191) NULL,
    ADD COLUMN `discountType` ENUM('NONE', 'PERCENT', 'AMOUNT') NOT NULL DEFAULT 'NONE',
    ADD COLUMN `discountValue` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `subtotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `discountAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `taxLabel` VARCHAR(191) NULL,
    ADD COLUMN `taxRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `taxAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `total` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `issuerName` VARCHAR(191) NULL,
    ADD COLUMN `issuerRegistrationNo` VARCHAR(191) NULL,
    ADD COLUMN `issuerTaxNo` VARCHAR(191) NULL,
    ADD COLUMN `issuerAddress` TEXT NULL,
    ADD COLUMN `issuerPhone` VARCHAR(191) NULL,
    ADD COLUMN `issuerEmail` VARCHAR(191) NULL,
    ADD COLUMN `billToName` VARCHAR(191) NULL,
    ADD COLUMN `billToCompany` VARCHAR(191) NULL,
    ADD COLUMN `billToRegistrationNo` VARCHAR(191) NULL,
    ADD COLUMN `billToAddress` TEXT NULL,
    ADD COLUMN `billToEmail` VARCHAR(191) NULL,
    ADD COLUMN `fromQuoteId` VARCHAR(191) NULL,
    ADD COLUMN `firstViewedAt` DATETIME(3) NULL,
    ADD COLUMN `lastViewedAt` DATETIME(3) NULL,
    ADD COLUMN `viewCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `dealId` VARCHAR(191) NULL,
    ADD COLUMN `contactId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Invoice_number_key` ON `Invoice`(`number`);

-- CreateIndex
CREATE UNIQUE INDEX `Invoice_shareToken_key` ON `Invoice`(`shareToken`);

-- CreateIndex
CREATE INDEX `Invoice_dealId_idx` ON `Invoice`(`dealId`);

-- CreateIndex
CREATE INDEX `Invoice_status_idx` ON `Invoice`(`status`);

-- CreateIndex
CREATE INDEX `Invoice_contactId_idx` ON `Invoice`(`contactId`);

-- CreateIndex
CREATE INDEX `Invoice_dueDate_idx` ON `Invoice`(`dueDate`);

-- AddForeignKey (SET NULL, not CASCADE like before — a numbered invoice may
-- outlive the Project it was billed against, and a milestone invoice
-- shouldn't vanish just because its Project was deleted)
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_dealId_fkey` FOREIGN KEY (`dealId`) REFERENCES `Deal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE `InvoiceItem` (
    `id` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL DEFAULT 1,
    `unitPrice` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `unit` VARCHAR(191) NULL,
    `taxable` BOOLEAN NOT NULL DEFAULT true,
    `lineTotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `unitCost` DECIMAL(12, 2) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `invoiceId` VARCHAR(191) NOT NULL,
    `servicePackageId` VARCHAR(191) NULL,

    INDEX `InvoiceItem_invoiceId_idx`(`invoiceId`),
    INDEX `InvoiceItem_servicePackageId_idx`(`servicePackageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `InvoiceItem` ADD CONSTRAINT `InvoiceItem_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceItem` ADD CONSTRAINT `InvoiceItem_servicePackageId_fkey` FOREIGN KEY (`servicePackageId`) REFERENCES `ServicePackage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `DocumentEvent`
    MODIFY `type` ENUM('CREATED', 'UPDATED', 'ISSUED', 'SENT', 'VIEWED', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'REVISED', 'SUPERSEDED', 'VALIDITY_EXTENDED', 'CONVERTED', 'DEAL_VALUE_SYNCED', 'PAID', 'VOIDED') NOT NULL;

-- Seed the INVOICE numbering counter row if a concurrent install somehow
-- skipped it — same INSERT IGNORE convention as the QUOTE/INVOICE seed in
-- 20260911090500_billing_data, safe to re-run.
INSERT IGNORE INTO `DocumentSequence` (`key`, `nextNumber`, `updatedAt`) VALUES ('INVOICE', 1, NOW(3));
