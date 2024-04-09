CREATE TABLE shop_exported_products
(
    shop_id INT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    external_id VARCHAR(64) NULL,
    archived TINYINT(1) DEFAULT 0,
    exported_name TEXT NULL,
    exported_description TEXT NULL,
    exported_price INT UNSIGNED NULL,
    exported_at TIMESTAMP NULL,
    last_update TIMESTAMP NULL,
    PRIMARY KEY (shop_id, product_id),
    CONSTRAINT shop_exported_products_products_id_fk
        FOREIGN KEY (product_id) REFERENCES products (id)
            ON DELETE CASCADE,
    CONSTRAINT shop_exported_products_shops_id_fk
        FOREIGN KEY (shop_id) REFERENCES shops (id)
            ON DELETE CASCADE
);

CREATE TRIGGER shop_products_decrement_exported_products_count
    AFTER DELETE
    ON shop_exported_products
    FOR EACH ROW
        UPDATE shops
        SET exported_products_count = exported_products_count - 1
        WHERE id = OLD.shop_id;

CREATE TRIGGER shop_products_increment_exported_products_count
    AFTER INSERT
    ON shop_exported_products
    FOR EACH ROW
        UPDATE shops
        SET exported_products_count = exported_products_count + 1
        WHERE id = NEW.shop_id;
