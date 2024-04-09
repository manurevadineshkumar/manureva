CREATE TABLE shipping_zone_prices
(
    weight_grams INT UNSIGNED NOT NULL,
    shipping_zone INT UNSIGNED NOT NULL,
    price_cents INT UNSIGNED NOT NULL,
    PRIMARY KEY (weight_grams, shipping_zone)
);
