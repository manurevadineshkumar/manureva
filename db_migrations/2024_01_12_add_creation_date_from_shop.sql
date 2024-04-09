ALTER TABLE `shop_imported_products`
ADD COLUMN `created_on_shop_at` DATETIME DEFAULT NULL AFTER `external_id`;
