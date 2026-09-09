-- Renames the DEVELOPER role to TECHNICAL and adds a new SALES role.
-- Widen first so existing DEVELOPER rows stay valid while they're migrated,
-- then narrow to the final list once no row references the old value.
ALTER TABLE `User` MODIFY `role` ENUM('ADMIN', 'DEVELOPER', 'TECHNICAL', 'SALES', 'PARTNER') NOT NULL DEFAULT 'ADMIN';

UPDATE `User` SET `role` = 'TECHNICAL' WHERE `role` = 'DEVELOPER';

ALTER TABLE `User` MODIFY `role` ENUM('ADMIN', 'TECHNICAL', 'SALES', 'PARTNER') NOT NULL DEFAULT 'ADMIN';
