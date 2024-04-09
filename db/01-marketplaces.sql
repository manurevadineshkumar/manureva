CREATE TABLE marketplaces
(
    id INT UNSIGNED AUTO_INCREMENT
        PRIMARY KEY,
    owner_id INT UNSIGNED NOT NULL,
    platform ENUM ('vestiaire') NOT NULL,
    name VARCHAR(64) NOT NULL,
    token VARCHAR(64) NULL,
    exported_products_count INT UNSIGNED DEFAULT 0 NOT NULL,
    last_export TIMESTAMP NULL,
    CONSTRAINT marketplaces_users_id_fk
        FOREIGN KEY (owner_id) REFERENCES users (id)
);
