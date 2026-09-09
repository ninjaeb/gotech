-- operatingHours moves from free text to structured per-day JSON (see
-- OperatingHours in src/lib/directory.ts). Any free text already entered
-- (the field only just shipped) can't be losslessly converted to the new
-- shape, so it's cleared first rather than left to fail MySQL's JSON
-- column validation.
UPDATE `PartnerListing` SET `operatingHours` = NULL;

ALTER TABLE `PartnerListing` MODIFY COLUMN `operatingHours` JSON NULL;
