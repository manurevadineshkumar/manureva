ALTER TABLE `products`
ADD COLUMN `is_exportable` TINYINT(1) NOT NULL DEFAULT 1 AFTER `status`;