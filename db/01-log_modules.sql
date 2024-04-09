CREATE TABLE log_modules
(
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    total_count INT UNSIGNED NOT NULL DEFAULT 0,
    fail_count INT UNSIGNED NOT NULL DEFAULT 0,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP() NOT NULL,
    end_time TIMESTAMP NULL,
    session_id BIGINT UNSIGNED NOT NULL,
    FOREIGN KEY (session_id) REFERENCES log_sessions (id)
);
