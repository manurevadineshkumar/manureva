CREATE TABLE products
(
    id BIGINT UNSIGNED AUTO_INCREMENT
        PRIMARY KEY,
    owner_id INT UNSIGNED NULL,
    status ENUM ('DISABLED', 'ACTIVE', 'PENDING', 'SOLD', 'LOCKED') DEFAULT 'DISABLED' NOT NULL,
    is_exportable TINYINT(1) DEFAULT 1 NOT NULL,
    original_url VARCHAR(255) NULL,
    gender TINYINT(1) NULL COMMENT '0 = women, 1 = men, null = unisex',
    type_id INT UNSIGNED NOT NULL COMMENT 'Foreign key to types table',
    subtype_id INT UNSIGNED NULL COMMENT 'Foreign key to subtypes table',
    model VARCHAR(64) NULL,
    brand_id INT UNSIGNED NOT NULL COMMENT 'Foreign key to brands table',
    name VARCHAR(255) NULL,
    original_name VARCHAR(255) NULL,
    description TEXT NULL,
    vendor_bought_price INT UNSIGNED NULL,
    bought_price INT UNSIGNED NOT NULL,
    bought_price_discounted INT UNSIGNED NULL,
    bought_currency VARCHAR(4) NOT NULL,
    purchase_price_cents INT UNSIGNED NULL,
    wholesale_price_cents INT UNSIGNED NULL,
    retail_price_cents INT UNSIGNED NULL,
    purchase_price_cents_discounted INT UNSIGNED NULL,
    wholesale_price_cents_discounted INT UNSIGNED NULL,
    retail_price_cents_discounted INT UNSIGNED NULL,
    grade ENUM('S', 'SA', 'A', 'AB', 'B', 'BC', 'C') NOT NULL,
    size TEXT NULL
        CHECK (JSON_VALID(`size`)),
    has_serial TINYINT DEFAULT 0 NOT NULL,
    has_guarantee_card TINYINT DEFAULT 0 NOT NULL,
    has_box TINYINT DEFAULT 0 NOT NULL,
    has_storage_bag TINYINT DEFAULT 0 NOT NULL,
    is_exported_vc TINYINT DEFAULT 0 NULL,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP() NOT NULL,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP() NOT NULL,
    last_scrape TIMESTAMP DEFAULT CURRENT_TIMESTAMP() NOT NULL,
    CONSTRAINT products_original_url_uk
        UNIQUE (original_url),
    CONSTRAINT products_brand_id_fk
        FOREIGN KEY (brand_id) REFERENCES brands (id),
    CONSTRAINT products_subtype_fk
        FOREIGN KEY (subtype_id) REFERENCES subtypes (id),
    CONSTRAINT products_type_fk
        FOREIGN KEY (type_id) REFERENCES types (id),
    CONSTRAINT products_users_id_fk
        FOREIGN KEY (owner_id) REFERENCES users (id)
);

CREATE FULLTEXT INDEX products_name_fti
    ON products (name);

CREATE TRIGGER delete_products_group_products
    BEFORE DELETE
    ON products
    FOR EACH ROW
    DELETE FROM products_group_products WHERE product_id = OLD.id;
