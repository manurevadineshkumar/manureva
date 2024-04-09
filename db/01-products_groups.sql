CREATE TABLE products_groups
(
    id INT UNSIGNED AUTO_INCREMENT
        PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    products_count INT UNSIGNED DEFAULT 0 NOT NULL,
    is_system TINYINT(1) DEFAULT 0 NOT NULL,
    last_dump TIMESTAMP NULL,
    CONSTRAINT products_groups_users_id_fk
        FOREIGN KEY (user_id) REFERENCES users (id)
);
