CREATE TABLE price_ranges
(
    target_type ENUM ('shop', 'marketplace') NOT NULL,
    target_id INT UNSIGNED NOT NULL,
    price_to INT UNSIGNED NULL,
    percent TINYINT UNSIGNED NOT NULL
);
