-- Billing documents, step 2 of 2: seeds and backfill. Every statement is
-- idempotent, and no legacy quote's total moves by a sen: existing quotes
-- were tax-free, so subtotal = total = the sum the client already saw.

-- The singleton may not exist yet on a fresh install; the backfills below
-- read currency/taxLabel from it.
INSERT IGNORE INTO `Settings` (`id`) VALUES ('singleton');

-- Numbering streams. Allocation happens inside the issuing transaction
-- (src/lib/documents/numbering.ts) against these pre-seeded rows.
INSERT IGNORE INTO `DocumentSequence` (`key`, `nextNumber`, `updatedAt`) VALUES ('QUOTE', 1, NOW(3)), ('INVOICE', 1, NOW(3));

-- Catalog: physical products default to non-taxable (service tax applies to
-- services); only matters once Settings.taxRate > 0.
UPDATE `ServicePackage` SET `taxable` = false WHERE `type` = 'PRODUCT';

-- Quote line totals and stored document totals.
UPDATE `QuoteItem` SET `lineTotal` = ROUND(`quantity` * `unitPrice`, 2);
UPDATE `Quote` q
    SET q.`subtotal` = (SELECT COALESCE(SUM(i.`lineTotal`), 0) FROM `QuoteItem` i WHERE i.`quoteId` = q.`id`);
UPDATE `Quote`
    SET `total` = `subtotal`,
        `currency` = COALESCE((SELECT `currency` FROM `Settings` WHERE `id` = 'singleton'), 'USD'),
        `taxLabel` = COALESCE((SELECT `taxLabel` FROM `Settings` WHERE `id` = 'singleton'), 'SST'),
        `issuedAt` = CASE WHEN `status` <> 'DRAFT' THEN COALESCE(`sentAt`, `firstViewedAt`, `createdAt`) ELSE NULL END
    WHERE `currency` = '';
-- Recipient defaults to the deal's contact.
UPDATE `Quote` q JOIN `Deal` d ON d.`id` = q.`dealId` SET q.`contactId` = d.`contactId` WHERE q.`contactId` IS NULL;

-- Legacy issued quotes get chronological numbers in the live Q- stream;
-- drafts get theirs when issued. validUntil stays NULL so nothing suddenly
-- reads as expired, and shareToken stays NULL so existing /q/<id> links
-- keep resolving (see recordQuoteView's token-or-legacy-id lookup).
UPDATE `Quote` q
    JOIN (
        SELECT `id`, ROW_NUMBER() OVER (ORDER BY COALESCE(`sentAt`, `firstViewedAt`, `createdAt`), `id`) AS rn
        FROM `Quote`
        WHERE `status` <> 'DRAFT' AND `number` IS NULL
    ) r ON r.`id` = q.`id`
    SET q.`number` = CONCAT('Q-', LPAD(r.rn, 4, '0'));
UPDATE `DocumentSequence` s
    JOIN (SELECT COUNT(*) AS c FROM `Quote` WHERE `number` IS NOT NULL) n
    SET s.`nextNumber` = GREATEST(s.`nextNumber`, n.c + 1)
    WHERE s.`key` = 'QUOTE';

-- Audit trail seed for the numbered legacy quotes.
INSERT IGNORE INTO `DocumentEvent` (`id`, `type`, `actorLabel`, `quoteId`, `createdAt`)
    SELECT CONCAT('mig_', `id`), 'ISSUED', 'migration', `id`, COALESCE(`issuedAt`, `createdAt`)
    FROM `Quote` WHERE `number` IS NOT NULL;

-- The Prisma schema declares no default for these: every create path must
-- pass what Settings says.
ALTER TABLE `Quote` ALTER COLUMN `currency` DROP DEFAULT;
ALTER TABLE `Quote` ALTER COLUMN `taxLabel` DROP DEFAULT;
