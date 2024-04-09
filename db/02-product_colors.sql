CREATE TABLE product_colors
(
    product_id BIGINT UNSIGNED NOT NULL,
    color_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (product_id, color_id),
    CONSTRAINT product_colors_colors_id_fk
        FOREIGN KEY (color_id) REFERENCES colors (id),
    CONSTRAINT product_colors_products_id_fk
        FOREIGN KEY (product_id) REFERENCES products (id)
            ON DELETE CASCADE
);
