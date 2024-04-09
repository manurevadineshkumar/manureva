ALTER TABLE `countries`
    ADD COLUMN `vat` DECIMAL(5,4) NULL,
    ADD COLUMN `duty_tax` DECIMAL(5,4) NULL,
    ADD COLUMN `currency_code` CHAR(3) NULL;

UPDATE `countries`
    SET `vat` = 0.1, `duty_tax` = 0.035, `currency_code` = 'JPY'
    WHERE `code` = 'JP';

UPDATE `countries`
    SET `vat` = 0.2, `duty_tax` = 0, `currency_code` = 'EUR'
    WHERE `code` = 'FR';