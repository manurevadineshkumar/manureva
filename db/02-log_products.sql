CREATE TABLE log_products
(
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT UNSIGNED NOT NULL,
    event_type ENUM ('created', 'price_updated', 'deleted') NOT NULL,
    new_price INT UNSIGNED NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    FOREIGN KEY (session_id) REFERENCES log_sessions (id),
    FOREIGN KEY (product_id) REFERENCES products (id)
);
