CREATE TABLE colors
(
    id BIGINT UNSIGNED AUTO_INCREMENT
        PRIMARY KEY,
    name VARCHAR(32) NOT NULL,
    CONSTRAINT colors_name_index
        UNIQUE (name)
);
