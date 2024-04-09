CREATE TABLE carts
(
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    products_group_id INT UNSIGNED,
    CONSTRAINT carts_products_group_id_uindex
        FOREIGN KEY (products_group_id) REFERENCES products_groups (id)
);
