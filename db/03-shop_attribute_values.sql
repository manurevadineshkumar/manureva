CREATE TABLE shop_attribute_values
(
    id INT UNSIGNED AUTO_INCREMENT
        PRIMARY KEY,
    attribute_id INT UNSIGNED NOT NULL,
    value VARCHAR(255) NOT NULL,
    name TEXT NULL,
    CONSTRAINT shop_attribute_values_shop_attributes_id_fk
        FOREIGN KEY (attribute_id) REFERENCES shop_attributes (id)
            ON DELETE CASCADE
);
