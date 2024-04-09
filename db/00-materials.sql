CREATE TABLE materials
(
    id BIGINT UNSIGNED AUTO_INCREMENT
        PRIMARY KEY,
    name VARCHAR(32) NOT NULL,
    CONSTRAINT materials_name_index
        UNIQUE (name)
);
