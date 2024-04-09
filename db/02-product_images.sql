CREATE TABLE product_images
(
    id INT UNSIGNED AUTO_INCREMENT
        PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    source_url TEXT NULL,
    local_url TEXT NULL,
    uuid TEXT NULL,
    has_cropped_version TINYINT(1) DEFAULT 0 NOT NULL,
    CONSTRAINT product_images_source_url_uindex
        UNIQUE (source_url) USING HASH,
    CONSTRAINT product_images_products_id_fk
        FOREIGN KEY (product_id) REFERENCES products (id)
            ON DELETE CASCADE
);
