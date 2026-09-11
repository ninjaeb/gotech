-- Billing documents, step 1 of 2: DDL only (additive). The data backfill,
-- sequence seeding and the DROP DEFAULT on Quote.currency/taxLabel live in
-- the next migration so a failed data step never leaves half-applied DDL.

-- AlterTable
ALTER TABLE `Settings`
    ADD COLUMN `businessName` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `businessRegistrationNo` VARCHAR(191) NULL,
    ADD COLUMN `businessAddress` TEXT NULL,
    ADD COLUMN `businessPhone` VARCHAR(191) NULL,
    ADD COLUMN `businessEmail` VARCHAR(191) NULL,
    ADD COLUMN `businessWebsite` VARCHAR(191) NULL,
    ADD COLUMN `taxLabel` VARCHAR(191) NOT NULL DEFAULT 'SST',
    ADD COLUMN `taxRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `taxRegistrationNo` VARCHAR(191) NULL,
    ADD COLUMN `quoteNumberPrefix` VARCHAR(191) NOT NULL DEFAULT 'Q-',
    ADD COLUMN `invoiceNumberPrefix` VARCHAR(191) NOT NULL DEFAULT 'INV-',
    ADD COLUMN `numberPadding` INTEGER NOT NULL DEFAULT 4,
    ADD COLUMN `quoteValidityDays` INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN `invoiceDueDays` INTEGER NOT NULL DEFAULT 14,
    ADD COLUMN `defaultQuoteTerms` TEXT NULL,
    ADD COLUMN `defaultInvoiceNotes` TEXT NULL,
    ADD COLUMN `paymentInstructions` TEXT NULL,
    ADD COLUMN `syncDealValueFromAcceptedQuote` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `Company`
    ADD COLUMN `registrationNo` VARCHAR(191) NULL,
    ADD COLUMN `taxRegistrationNo` VARCHAR(191) NULL,
    ADD COLUMN `invoiceDueDays` INTEGER NULL;

-- AlterTable
ALTER TABLE `ServicePackage`
    ADD COLUMN `taxable` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `QuoteTemplateItem`
    MODIFY `description` TEXT NOT NULL,
    ADD COLUMN `unit` VARCHAR(191) NULL,
    ADD COLUMN `taxable` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `QuoteItem`
    MODIFY `description` TEXT NOT NULL,
    ADD COLUMN `unit` VARCHAR(191) NULL,
    ADD COLUMN `taxable` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `lineTotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `unitCost` DECIMAL(12, 2) NULL;

-- AlterTable (currency/taxLabel get a temporary '' default so existing rows
-- pass NOT NULL; the data migration backfills them and drops the defaults)
ALTER TABLE `Quote`
    ADD COLUMN `number` VARCHAR(191) NULL,
    ADD COLUMN `revision` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `shareToken` VARCHAR(191) NULL,
    ADD COLUMN `issuedAt` DATETIME(3) NULL,
    ADD COLUMN `validUntil` DATETIME(3) NULL,
    ADD COLUMN `withdrawnAt` DATETIME(3) NULL,
    ADD COLUMN `convertedAt` DATETIME(3) NULL,
    ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `discountType` ENUM('NONE', 'PERCENT', 'AMOUNT') NOT NULL DEFAULT 'NONE',
    ADD COLUMN `discountValue` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `subtotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `discountAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `taxLabel` VARCHAR(191) NOT NULL DEFAULT '',
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
    ADD COLUMN `acceptedByName` VARCHAR(191) NULL,
    ADD COLUMN `acceptedByEmail` VARCHAR(191) NULL,
    ADD COLUMN `acceptedVia` ENUM('LINK', 'PORTAL', 'EMAIL', 'WHATSAPP', 'PO', 'VERBAL', 'OTHER') NULL,
    ADD COLUMN `acceptedReference` VARCHAR(191) NULL,
    ADD COLUMN `contactId` VARCHAR(191) NULL,
    ADD COLUMN `revisionOfId` VARCHAR(191) NULL,
    ADD COLUMN `supersededById` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Quote_shareToken_key` ON `Quote`(`shareToken`);

-- CreateIndex
CREATE UNIQUE INDEX `Quote_supersededById_key` ON `Quote`(`supersededById`);

-- CreateIndex
CREATE INDEX `Quote_status_idx` ON `Quote`(`status`);

-- CreateIndex
CREATE INDEX `Quote_contactId_idx` ON `Quote`(`contactId`);

-- CreateIndex
CREATE INDEX `Quote_validUntil_idx` ON `Quote`(`validUntil`);

-- CreateIndex
CREATE INDEX `Quote_revisionOfId_idx` ON `Quote`(`revisionOfId`);

-- CreateIndex
CREATE UNIQUE INDEX `Quote_number_revision_key` ON `Quote`(`number`, `revision`);

-- CreateTable
CREATE TABLE `BusinessLogo` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'singleton',
    `mimeType` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `data` LONGTEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentSequence` (
    `key` VARCHAR(191) NOT NULL,
    `nextNumber` INTEGER NOT NULL DEFAULT 1,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentEvent` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('CREATED', 'UPDATED', 'ISSUED', 'SENT', 'VIEWED', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'REVISED', 'SUPERSEDED', 'VALIDITY_EXTENDED', 'CONVERTED', 'DEAL_VALUE_SYNCED') NOT NULL,
    `payload` TEXT NULL,
    `actorLabel` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actorId` VARCHAR(191) NULL,
    `quoteId` VARCHAR(191) NULL,
    `invoiceId` VARCHAR(191) NULL,

    INDEX `DocumentEvent_quoteId_idx`(`quoteId`),
    INDEX `DocumentEvent_invoiceId_idx`(`invoiceId`),
    INDEX `DocumentEvent_actorId_idx`(`actorId`),
    INDEX `DocumentEvent_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_revisionOfId_fkey` FOREIGN KEY (`revisionOfId`) REFERENCES `Quote`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_supersededById_fkey` FOREIGN KEY (`supersededById`) REFERENCES `Quote`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentEvent` ADD CONSTRAINT `DocumentEvent_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentEvent` ADD CONSTRAINT `DocumentEvent_quoteId_fkey` FOREIGN KEY (`quoteId`) REFERENCES `Quote`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentEvent` ADD CONSTRAINT `DocumentEvent_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
