CREATE TABLE users
(
    id INT UNSIGNED AUTO_INCREMENT
        PRIMARY KEY,
    username VARCHAR(16) NOT NULL,
    password_hash VARCHAR(40) NOT NULL,
    tags_count INT UNSIGNED DEFAULT 0 NOT NULL,
    shops_count INT UNSIGNED DEFAULT 0 NOT NULL,
    cart_products_group_id INT UNSIGNED NULL,
    first_name VARCHAR(32) NOT NULL,
    last_name VARCHAR(32) NOT NULL,
    email VARCHAR(320) NOT NULL,
    phone VARCHAR(20) NULL,
    address_street VARCHAR(128) NOT NULL,
    address_city VARCHAR(64) NOT NULL,
    address_zip VARCHAR(16) NOT NULL,
    address_country_id SMALLINT UNSIGNED NOT NULL,
    company_name VARCHAR(160) NOT NULL,
    company_vat VARCHAR(32) NULL,
    url TEXT NULL,
    instagram VARCHAR(64) NULL,
    tiktok VARCHAR(64) NULL,
    facebook VARCHAR(64) NULL,
    linkedin VARCHAR(64) NULL,
    CONSTRAINT users_email_uindex
        UNIQUE (email),
    CONSTRAINT users_username_uindex
        UNIQUE (username),
    CONSTRAINT users_countries_id_fk
        FOREIGN KEY (address_country_id) REFERENCES countries (id)
);
