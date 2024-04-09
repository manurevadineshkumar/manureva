CREATE TABLE stripe_customers
(
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL UNIQUE,
    stripe_customer_id TEXT NOT NULL UNIQUE,
    CONSTRAINT stripe_customers_users_id_fk
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);