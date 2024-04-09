CREATE TABLE shop_bindings
(
    shop_id INT UNSIGNED NOT NULL,
    category ENUM ('genders', 'types', 'brands', 'colors', 'materials') NOT NULL,
    korvin_id INT UNSIGNED NOT NULL,
    shop_attribute_value_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (shop_id, category, korvin_id, shop_attribute_value_id),
    CONSTRAINT shop_bindings_shop_attribute_values_id_fk
        FOREIGN KEY (shop_attribute_value_id) REFERENCES shop_attribute_values (id)
            ON DELETE CASCADE,
    CONSTRAINT shop_bindings_shops_id_fk
        FOREIGN KEY (shop_id) REFERENCES shops (id)
            ON DELETE CASCADE
);
