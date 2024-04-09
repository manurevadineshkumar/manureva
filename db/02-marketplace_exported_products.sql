CREATE TABLE marketplace_exported_products
(
    marketplace_id INT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    external_id VARCHAR(64) NULL,
    exported_name TEXT NULL,
    exported_description TEXT NULL,
    last_update TIMESTAMP NULL,
    PRIMARY KEY (marketplace_id, product_id),
    CONSTRAINT marketplace_exported_products_marketplaces_id_fk
        FOREIGN KEY (marketplace_id) REFERENCES marketplaces (id)
            ON DELETE CASCADE,
    CONSTRAINT marketplace_exported_products_products_id_fk
        FOREIGN KEY (product_id) REFERENCES products (id)
            ON DELETE CASCADE
);

CREATE TRIGGER marketplace_products_decrement_exported_products_count
    AFTER DELETE
    ON marketplace_exported_products
    FOR EACH ROW
    UPDATE marketplaces SET exported_products_count = exported_products_count - 1 WHERE id = OLD.marketplace_id;

CREATE TRIGGER marketplace_products_increment_exported_products_count
    AFTER INSERT
    ON marketplace_exported_products
    FOR EACH ROW
    UPDATE marketplaces SET exported_products_count = exported_products_count + 1 WHERE id = NEW.marketplace_id;
