CREATE TABLE shops
(
    id INT UNSIGNED AUTO_INCREMENT
        PRIMARY KEY,
    owner_id INT UNSIGNED NOT NULL,
    imported_products_count INT UNSIGNED DEFAULT 0 NOT NULL,
    exported_products_count INT UNSIGNED DEFAULT 0 NOT NULL,
    name VARCHAR(64) NOT NULL,
    is_exporting TINYINT(1) DEFAULT 0 NOT NULL,
    is_importing TINYINT(1) DEFAULT 0 NOT NULL,
    platform ENUM ('shopify') NOT NULL,
    currency VARCHAR(3) NOT NULL,
    url VARCHAR(1024) NULL,
    original_url VARCHAR(1024) NULL,
    token VARCHAR(64) NULL,
    api_secret VARCHAR(255) NULL,
    last_import TIMESTAMP NULL,
    last_export TIMESTAMP NULL,
    CONSTRAINT shops_users_id_fk
        FOREIGN KEY (owner_id) REFERENCES users (id)
);

CREATE TRIGGER decrement_shops_count
    AFTER DELETE
    ON shops
    FOR EACH ROW
    UPDATE users
    SET shops_count = shops_count - 1
    WHERE id = (
        SELECT user_id
        FROM products_groups
        WHERE id = OLD.owner_id
    );

CREATE TRIGGER increment_shops_count
    AFTER INSERT
    ON shops
    FOR EACH ROW
    UPDATE users
    SET shops_count = shops_count + 1
    WHERE id = (
        SELECT user_id
        FROM products_groups
        WHERE id = NEW.owner_id
    );
