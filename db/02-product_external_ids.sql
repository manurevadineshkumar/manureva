CREATE TABLE product_external_ids
(
    product_id BIGINT UNSIGNED AUTO_INCREMENT,
    service_name VARCHAR(64) NOT NULL,
    external_id VARCHAR(64) NULL,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP() NOT NULL ON UPDATE CURRENT_TIMESTAMP(),
    CONSTRAINT product_external_ids_product_id_service_name_uk
        UNIQUE (product_id, service_name),
    CONSTRAINT products_external_ids_products_id_fk
        FOREIGN KEY (product_id) REFERENCES products (id)
);
