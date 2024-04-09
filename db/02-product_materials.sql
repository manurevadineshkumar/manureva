CREATE TABLE product_materials
(
    product_id BIGINT UNSIGNED NOT NULL,
    material_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (product_id, material_id),
    CONSTRAINT product_materials_materials_id_fk
        FOREIGN KEY (material_id) REFERENCES materials (id),
    CONSTRAINT product_materials_products_id_fk
        FOREIGN KEY (product_id) REFERENCES products (id)
            ON DELETE CASCADE
);
