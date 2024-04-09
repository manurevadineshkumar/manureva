CREATE TABLE products_group_products
(
    product_id BIGINT UNSIGNED NOT NULL,
    product_external_id VARCHAR(64) NULL,
    products_group_id INT UNSIGNED NOT NULL,
    last_update TIMESTAMP NULL,
    metadata TEXT NULL,
    CONSTRAINT products_group_products_product_external_id_uindex
        UNIQUE (product_external_id),
    CONSTRAINT products_group_products_product_id_products_group_id_uindex
        UNIQUE (products_group_id, product_id),
    CONSTRAINT products_group_products_products_group_id_fk
        FOREIGN KEY (products_group_id) REFERENCES products_groups (id)
            ON DELETE CASCADE,
    CONSTRAINT products_group_products_products_id_fk
        FOREIGN KEY (product_id) REFERENCES products (id)
            ON DELETE CASCADE
);

CREATE TRIGGER decrement_products_count
    AFTER DELETE
    ON products_group_products
    FOR EACH ROW
    UPDATE products_groups SET products_count = products_count - 1 WHERE id = OLD.products_group_id;

CREATE TRIGGER increment_products_count
    AFTER INSERT
    ON products_group_products
    FOR EACH ROW
    UPDATE products_groups SET products_count = products_count + 1 WHERE id = NEW.products_group_id;
