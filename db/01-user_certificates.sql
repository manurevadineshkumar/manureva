CREATE TABLE user_certificates
(
    id INT UNSIGNED AUTO_INCREMENT
        PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    filename VARCHAR(255) NOT NULL,
    CONSTRAINT user_certificates_id_fk
        FOREIGN KEY (user_id) REFERENCES users (id)
);