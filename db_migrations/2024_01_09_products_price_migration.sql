ALTER TABLE products
RENAME COLUMN base_price_cents TO purchase_price_cents,
ADD COLUMN purchase_price_cents_discounted INT UNSIGNED NULL AFTER purchase_price_cents,
ADD COLUMN wholesale_price_cents_discounted INT UNSIGNED NULL AFTER wholesale_price_cents,
ADD COLUMN retail_price_cents_discounted INT UNSIGNED NULL AFTER retail_price_cents;
