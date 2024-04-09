CREATE TABLE orders
(
    id BIGINT UNSIGNED AUTO_INCREMENT
        PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    price_eur INT UNSIGNED NOT NULL,
    placement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP() NOT NULL,
    korvin_reception_date TIMESTAMP NULL,
    channel_id INT UNSIGNED NULL,
    status ENUM('PENDING', 'RECEIVED', 'DELIVERED', 'REFUNDED', 'WAITING_FOR_PAYMENT', 'COMPLETED') DEFAULT 'PENDING' NOT NULL,
    comment_admin TEXT NULL,
    comment_user TEXT NULL,
    filename_admin VARCHAR(16) NULL,
    filename_user VARCHAR(16) NULL,
    CONSTRAINT orders_products_id_fk
        FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT orders_users_id_fk
        FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT orders_channels_id_fk
        FOREIGN KEY (channel_id) REFERENCES sales_channels (id)
);
