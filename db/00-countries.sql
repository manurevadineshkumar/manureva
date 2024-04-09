CREATE TABLE countries
(
    id SMALLINT UNSIGNED AUTO_INCREMENT
        PRIMARY KEY,
    name VARCHAR(32) NOT NULL,
    code CHAR(2) NULL,
    shipping_zone INT UNSIGNED NULL,
    phone_prefix DECIMAL(3) NOT NULL,
    vat DECIMAL(5, 4) NULL,
    duty_tax DECIMAL(5, 4) NULL,
    currency_code CHAR(3) NULL
);
