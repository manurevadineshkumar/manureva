CREATE TABLE shop_imported_products
(
    shop_id INT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    external_id VARCHAR(64) NOT NULL,
    created_on_shop_at DATETIME DEFAULT NULL,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP() NOT NULL,
    PRIMARY KEY (shop_id, product_id),
    CONSTRAINT shop_imported_products_products_id_fk
        FOREIGN KEY (product_id) REFERENCES products (id)
            ON DELETE CASCADE,
    CONSTRAINT shop_imported_products_shops_id_fk
        FOREIGN KEY (shop_id) REFERENCES shops (id)
            ON DELETE CASCADE
);

CREATE TRIGGER shop_products_decrement_imported_products_count
    AFTER DELETE
    ON shop_imported_products
    FOR EACH ROW
        UPDATE shops
        SET imported_products_count = imported_products_count - 1
        WHERE id = OLD.shop_id;

CREATE TRIGGER shop_products_increment_imported_products_count
    AFTER INSERT
    ON shop_imported_products
    FOR EACH ROW
        UPDATE shops
        SET imported_products_count = imported_products_count + 1
        WHERE id = NEW.shop_id;
