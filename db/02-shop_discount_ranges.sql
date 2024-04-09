CREATE TABLE shop_discount_ranges
(
    shop_id INT UNSIGNED NOT NULL,
    price_to INT UNSIGNED NULL,
    day_to INT UNSIGNED NULL,
    discount TINYINT UNSIGNED NOT NULL,
    CONSTRAINT shop_discount_ranges_shops_id_fk
        FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE
);
