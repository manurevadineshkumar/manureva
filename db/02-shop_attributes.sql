CREATE TABLE shop_attributes
(
    id INT UNSIGNED AUTO_INCREMENT
        PRIMARY KEY,
    shop_id INT UNSIGNED NOT NULL,
    name VARCHAR(128) NULL,
    CONSTRAINT shop_attributes_shops_id_fk
        FOREIGN KEY (shop_id) REFERENCES shops (id)
            ON DELETE CASCADE
);
